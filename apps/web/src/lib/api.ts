// apps/web/src/lib/api.ts
import axios, { AxiosError } from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

export function setToken(t: string | null) {
  if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`
  else   delete api.defaults.headers.common['Authorization']
}

// Auto-refresh on 401
let refreshing = false
let queue: Array<{ res: (v: any) => void; rej: (e: any) => void }> = []

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const orig = err.config as any
    if (err.response?.status !== 401 || orig._retry) return Promise.reject(err)
    if (refreshing) {
      return new Promise((res, rej) => { queue.push({ res, rej }) })
        .then(token => { orig.headers['Authorization'] = `Bearer ${token}`; return api(orig) })
    }
    orig._retry = true
    refreshing  = true
    try {
      const { useAuthStore } = await import('@/stores/auth.store')
      const ok = await useAuthStore.getState().refresh()
      if (ok) {
        const t = useAuthStore.getState().accessToken
        queue.forEach(q => q.res(t))
        queue = []
        orig.headers['Authorization'] = `Bearer ${t}`
        return api(orig)
      }
      queue.forEach(q => q.rej(err)); queue = []
      useAuthStore.getState().logout()
      return Promise.reject(err)
    } finally { refreshing = false }
  },
)

// ── Typed helpers ────────────────────────────────────────────────────────
export const authApi = {
  login:   (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => r.data),
  refresh: (rt: string)                       => api.post('/auth/refresh', { refreshToken: rt }).then(r => r.data),
  logout:  (rt: string)                       => api.post('/auth/logout',  { refreshToken: rt }),
  me:      ()                                 => api.get('/auth/me').then(r => r.data),
}

export const clientsApi = {
  list:   (p?: any) => api.get('/clients',     { params: p }).then(r => r.data),
  get:    (id: string) => api.get(`/clients/${id}`).then(r => r.data),
  create: (d: any)  => api.post('/clients',    d).then(r => r.data),
  update: (id: string, d: any) => api.patch(`/clients/${id}`, d).then(r => r.data),
  delete: (id: string) => api.delete(`/clients/${id}`).then(r => r.data),
}

export const suppliesApi = {
  list:    (p?: any)   => api.get('/supplies',      { params: p }).then(r => r.data),
  get:     (id: string) => api.get(`/supplies/${id}`).then(r => r.data),
  create:  (d: any)    => api.post('/supplies',     d).then(r => r.data),
  update:  (id: string, d: any) => api.patch(`/supplies/${id}`, d).then(r => r.data),
  preview: (id: string) => api.get(`/supplies/${id}/comparison-preview`).then(r => r.data),
}

export const protocolsApi = {
  list:   ()         => api.get('/protocols').then(r => r.data),
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/protocols/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }).then(r => r.data)
  },
}

export const productsApi = {
  companies: ()              => api.get('/products/companies').then(r => r.data),
  list:      (p?: any)       => api.get('/products', { params: p }).then(r => r.data),
  update:    (id: string, d: any) => api.patch(`/products/${id}`, d).then(r => r.data),
  upload:    (file: File)    => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/products/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }).then(r => r.data)
  },
}

export const oppApi = {
  dashboard: ()          => api.get('/opportunities/dashboard').then(r => r.data),
  list:      (p?: any)   => api.get('/opportunities', { params: p }).then(r => r.data),
  get:       (id: string) => api.get(`/opportunities/${id}`).then(r => r.data),
  create:    (d: any)    => api.post('/opportunities', d).then(r => r.data),
  update:    (id: string, d: any) => api.patch(`/opportunities/${id}`, d).then(r => r.data),
  stage:     (id: string, d: any) => api.patch(`/opportunities/${id}/stage`, d).then(r => r.data),
  activity:  (id: string, d: any) => api.post(`/opportunities/${id}/activities`, d).then(r => r.data),
}
