'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Network, Loader2, Plus, X, ChevronRight, ChevronDown, UserPlus } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

export default function TeamPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const isAdmin = me?.role === 'admin' || me?.role === 'direction'
  const [showForm, setShowForm] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'commercial', phone: '', password: '', subagentPct: '70' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/my-team').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/users', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Membre creat correctament')
      qc.invalidateQueries({ queryKey: ['my-team'] })
      resetForm()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error creant membre'),
  })

  const updatePctMut = useMutation({
    mutationFn: ({ id, subagentPct }: { id: string; subagentPct: number }) =>
      api.patch(`/users/${id}`, { subagentPct }).then(r => r.data),
    onSuccess: () => { toast.success('Percentatge actualitzat'); qc.invalidateQueries({ queryKey: ['my-team'] }) },
    onError: () => toast.error('Error actualitzant'),
  })

  function resetForm() {
    setShowForm(false)
    setParentId(null)
    setForm({ name: '', email: '', role: 'commercial', phone: '', password: '', subagentPct: '70' })
  }

  function openAddSubagent(userId: string) {
    setParentId(userId)
    setShowForm(true)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Build tree from flat list
  function buildTree(members: any[]): any[] {
    const map = new Map(members.map(m => [m.id, { ...m, children: [] as any[] }]))
    const roots: any[] = []
    for (const m of map.values()) {
      const parent = m.parentUserId ? map.get(m.parentUserId) : null
      if (parent) {
        parent.children.push(m)
      } else {
        roots.push(m)
      }
    }
    return roots
  }

  const tree = buildTree(team)

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700',
    direction: 'bg-purple-50 text-purple-700',
    collaborator: 'bg-blue-50 text-blue-700',
    commercial: 'bg-green-50 text-green-700',
  }

  function renderNode(node: any, depth: number) {
    const hasChildren = node.children?.length > 0
    const isExpanded = expanded.has(node.id)

    return (
      <div key={node.id}>
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
        )} style={{ paddingLeft: `${16 + depth * 32}px` }}>
          {/* Expand/collapse */}
          <button onClick={() => toggleExpand(node.id)} className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials(node.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium capitalize', roleColors[node.role] ?? 'bg-gray-100 text-gray-600')}>
                {node.role}
              </span>
              <span className="text-[10px] text-gray-400">Nv.{node.treeLevel}</span>
            </div>
            <p className="text-xs text-gray-400 truncate">{node.email} {node.phone ? `· ${node.phone}` : ''}</p>
          </div>

          {/* Subagent % */}
          {isAdmin && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-gray-400">Paga subagents:</span>
              <input
                type="number"
                className="w-14 text-xs text-right border border-gray-200 rounded px-1.5 py-0.5"
                defaultValue={node.subagentPct ?? 70}
                min={0} max={100}
                onBlur={e => {
                  const val = Number(e.target.value)
                  if (val !== (node.subagentPct ?? 70)) {
                    updatePctMut.mutate({ id: node.id, subagentPct: val })
                  }
                }}
              />
              <span className="text-[10px] text-gray-400">%</span>
            </div>
          )}

          {/* Add subagent button */}
          {isAdmin && node.treeLevel < 5 && (
            <button onClick={() => openAddSubagent(node.id)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors flex-shrink-0">
              <UserPlus className="w-3 h-3" /> Subagent
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">El meu equip</h1>
          <p className="text-sm text-gray-500 mt-0.5">{team.length} membres · fins a 5 nivells</p>
        </div>
        <button onClick={() => { setParentId(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Afegir membre
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {parentId ? `Nou subagent de ${team.find((t: any) => t.id === parentId)?.name ?? ''}` : 'Nou membre'}
            </h2>
            <button onClick={resetForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom complet</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
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
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contrasenya inicial</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">% que paga als subagents</label>
              <input type="number" value={form.subagentPct} onChange={e => setForm({ ...form, subagentPct: e.target.value })}
                min={0} max={100} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate({
                ...form,
                subagentPct: Number(form.subagentPct),
                parentUserId: parentId ?? undefined,
              })}
              disabled={!form.name || !form.email || !form.password || createMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {parentId ? 'Crear subagent' : 'Crear membre'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      {/* Tree view */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : team.length === 0 ? (
        <div className="text-center py-20">
          <Network className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap membre a l&apos;equip.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <span className="flex-1">Membre</span>
              {isAdmin && <span className="w-28 text-right">% Subagents</span>}
              {isAdmin && <span className="w-20"></span>}
            </div>
          </div>
          {tree.map(node => renderNode(node, 0))}
        </div>
      )}
    </div>
  )
}
