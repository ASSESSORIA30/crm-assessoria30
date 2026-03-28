// apps/web/src/components/layout/auth-guard.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { Zap } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, initAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => { initAuth() }, [])
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading])

  if (loading || !user) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-400">Carregant...</p>
      </div>
    </div>
  )
  return <>{children}</>
}
