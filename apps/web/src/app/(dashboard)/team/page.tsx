'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Network, Loader2, Plus, X } from 'lucide-react'
import { cn, initials } from '@/lib/utils'

export default function TeamPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'commercial', phone: '', password: '' })

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/my-team').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/users', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Membre creat correctament')
      qc.invalidateQueries({ queryKey: ['my-team'] })
      setShowForm(false)
      setForm({ name: '', email: '', role: 'commercial', phone: '', password: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error creant membre'),
  })

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700',
    direction: 'bg-purple-50 text-purple-700',
    collaborator: 'bg-blue-50 text-blue-700',
    commercial: 'bg-green-50 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">El meu equip</h1>
          <p className="text-sm text-gray-500 mt-0.5">{team.length} membres</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Afegir membre
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Nou membre</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom complet</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nom i cognoms" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="correu@exemple.com" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="admin">Admin</option>
                <option value="direction">Direcció</option>
                <option value="collaborator">Agent</option>
                <option value="commercial">Comercial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telèfon</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="600 000 000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contrasenya inicial</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Mínim 6 caràcters" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate(form)}
              disabled={!form.name || !form.email || !form.password || createMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear membre
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : team.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <Network className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap membre a l&apos;equip. Clica &quot;Afegir membre&quot; per començar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((m: any) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', roleColors[m.role] ?? 'bg-gray-100 text-gray-600')}>
                  {m.role}
                </span>
                {m.phone && <span className="text-xs text-gray-400">{m.phone}</span>}
              </div>
              {m.commissionPct != null && (
                <p className="text-xs text-gray-400 mt-2">Comissió: {m.commissionPct}% · Objectiu: {m.monthlyTarget ?? '-'}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
