// apps/web/src/stores/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, setToken } from '@/lib/api'

export interface AuthUser {
  id: string; name: string; email: string; role: string
  treeLevel: number; treePath: string; monthlyTarget?: number
}

interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  refreshToken: string | null
  loading:      boolean
  login:    (email: string, password: string) => Promise<void>
  logout:   () => void
  refresh:  () => Promise<boolean>
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null, loading: true,

      initAuth: async () => {
        const { accessToken, refresh } = get()
        if (!accessToken) { set({ loading: false }); return }
        setToken(accessToken)
        try {
          const user = await authApi.me()
          set({ user, loading: false })
        } catch {
          const ok = await refresh()
          set({ loading: false })
          if (!ok) set({ user: null, accessToken: null, refreshToken: null })
        }
      },

      login: async (email, password) => {
        const { user, accessToken, refreshToken } = await authApi.login(email, password)
        setToken(accessToken)
        set({ user, accessToken, refreshToken })
      },

      logout: () => {
        const { refreshToken } = get()
        if (refreshToken) authApi.logout(refreshToken).catch(() => {})
        setToken(null)
        set({ user: null, accessToken: null, refreshToken: null })
        window.location.href = '/login'
      },

      refresh: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false
        try {
          const { accessToken } = await authApi.refresh(refreshToken)
          setToken(accessToken)
          set({ accessToken })
          const user = await authApi.me()
          set({ user })
          return true
        } catch { return false }
      },
    }),
    {
      name: 'crm-auth',
      partialize: s => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
