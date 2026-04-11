// apps/web/src/app/(auth)/login/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const schema = z.object({
  email:    z.string().email('Email no vàlid'),
  password: z.string().min(1, 'La contrasenya és obligatòria'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login, user } = useAuthStore()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) router.replace('/dashboard') }, [user])

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      router.replace('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (Array.isArray(msg)) {
        toast.error(msg.join(', '))
      } else if (err?.code === 'ERR_NETWORK') {
        toast.error('No es pot connectar amb el servidor. Comprova la connexió.')
      } else {
        toast.error(msg ?? 'Credencials incorrectes')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Assessoria 3.0" width={120} height={120} className="mb-4 drop-shadow-2xl" priority />
          <h1 className="text-2xl font-bold text-white">Assessoria 3.0</h1>
          <p className="text-slate-400 text-sm mt-1 italic">best CRM ever</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Inicia sessió</h2>
          <p className="text-sm text-gray-500 mb-6">Introdueix les teves credencials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="tu@assessoria30.cat"
                className={cn('input', errors.email && 'border-red-400 focus:ring-red-500')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Contrasenya */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contrasenya</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn('input pr-10', errors.password && 'border-red-400 focus:ring-red-500')}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Entrant...' : 'Entrar'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium">Comptes de demo:</p>
            <div className="space-y-1">
              {[
                ['admin@assessoria30.cat',  'Admin1234',  'Admin'],
                ['juan@assessoria30.cat',   'juan1234',   'Col·laborador'],
                ['maria@assessoria30.cat',  'maria1234',  'Comercial'],
              ].map(([email, pwd, role]) => (
                <button key={email} type="button"
                  onClick={() => { onSubmit({ email, password: pwd }) }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">{role}</span>
                  <span className="text-xs text-gray-400 ml-2">{email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
