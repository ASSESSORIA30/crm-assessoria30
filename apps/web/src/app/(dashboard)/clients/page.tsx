// apps/web/src/app/(dashboard)/clients/page.tsx
'use client'
import { useState }  from 'react'
import Link          from 'next/link'
import { useQuery, useMutation, useQueryClient }  from '@tanstack/react-query'
import { clientsApi }from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import {
  Search, Plus, Users, Pencil, Trash2, Zap,
} from 'lucide-react'
import { cn, fmt, initials } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Actiu',     cls: 'badge-green'  },
  potential: { label: 'Potencial', cls: 'badge-amber'  },
  inactive:  { label: 'Inactiu',  cls: 'badge-gray'   },
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page,   setPage]   = useState(1)
  const q  = useDebounce(search, 300)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { q, status, page }],
    queryFn:  () => clientsApi.list({ search: q, status, page, limit: 25 }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client eliminat')
    },
    onError: () => toast.error('Error eliminant el client'),
  })

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Eliminar el client "${name}"? Aquesta acció no es pot desfer.`)) return
    deleteMut.mutate(id)
  }

  const clients = data?.data ?? []
  const total   = data?.total ?? 0
  const pages   = Math.ceil(total / 25)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          {total > 0 && <p className="text-sm text-gray-500">{total} clients</p>}
        </div>
        <Link href="/clients/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Nou client
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cercar per nom, NIF, email..."
            className="input pl-9"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="input w-auto min-w-36"
        >
          <option value="">Tots els estats</option>
          <option value="active">Actius</option>
          <option value="potential">Potencials</option>
          <option value="inactive">Inactius</option>
        </select>
      </div>

      {/* Taula */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {search || status ? 'Cap client coincideix amb els filtres' : 'Encara no hi ha clients'}
            </p>
            {!search && !status && (
              <Link href="/clients/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                Crea el primer client
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Capçalera */}
            <div className="grid grid-cols-[2fr_1fr_64px_80px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              {['Client', 'Estat', 'Sum.', 'Agent', ''].map((h, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {/* Files */}
            {clients.map((c: any) => {
              const s = STATUS[c.status] ?? STATUS.potential
              return (
                <div key={c.id}
                  className="grid grid-cols-[2fr_1fr_64px_80px_80px] gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center group"
                >
                  {/* Nom */}
                  <Link href={`/clients/${c.id}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{c.name}</p>
                      {c.taxId && <p className="text-[10px] text-gray-400 font-mono">{c.taxId}</p>}
                    </div>
                  </Link>

                  {/* Estat */}
                  <span className={cn('badge w-fit', s.cls)}>{s.label}</span>

                  {/* Suministraments */}
                  <div className="flex items-center gap-1">
                    {(c._count?.supplies ?? 0) > 0 ? (
                      <><Zap className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-600">{c._count.supplies}</span></>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  {/* Agent */}
                  {c.agent ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {initials(c.agent.name)}
                      </div>
                      <span className="text-xs text-gray-500 truncate">{c.agent.name.split(' ')[0]}</span>
                    </div>
                  ) : <span className="text-xs text-gray-300">—</span>}

                  {/* Accions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <Link
                      href={`/clients/${c.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={e => handleDelete(e, c.id, c.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Paginació */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              ← Anterior
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              Següent →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
