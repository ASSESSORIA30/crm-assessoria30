// apps/web/src/app/(dashboard)/supplies/page.tsx
'use client'
import { useState }  from 'react'
import Link          from 'next/link'
import { useQuery }  from '@tanstack/react-query'
import { suppliesApi }from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, Plus, Zap, ChevronRight } from 'lucide-react'
import { cn, fmt, expiryLabel, expiryClass } from '@/lib/utils'

export default function SuppliesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['supplies', { q, category, page }],
    queryFn:  () => suppliesApi.list({ search: q, category, page, limit: 25 }),
  })

  const supplies = data?.data ?? []
  const total    = data?.total ?? 0
  const pages    = Math.ceil(total / 25)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Subministraments</h1>
          {total > 0 && <p className="text-sm text-gray-500">{total} subministraments · per prioritat</p>}
        </div>
        <Link href="/supplies/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Nou
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Cercar per CUPS, client, comercialitzadora..."
            className="input pl-9" />
        </div>
        {['', 'urgent', 'medium', 'low'].map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1) }}
            className={cn('px-3 py-2 text-sm rounded-xl border transition-all',
              category === cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            )}>
            {cat === '' ? 'Tots' : cat === 'urgent' ? '🔴 Urgents' : cat === 'medium' ? '🟡 Mitjans' : '🟢 Baixos'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
        ) : supplies.length === 0 ? (
          <div className="py-14 text-center">
            <Zap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Cap subministrament trobat</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1.5fr_120px_90px_32px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              {['CUPS · Client', 'Comercialitzadora', 'Venciment', 'Prioritat', ''].map((h, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {supplies.map((s: any) => {
              const score = s.opportunityScore ?? 0
              const scoreColor = score >= 80 ? 'bg-red-50 text-red-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
              return (
                <Link key={s.id} href={`/supplies/${s.id}`}
                  className="grid grid-cols-[2fr_1.5fr_120px_90px_32px] gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center group">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                      {s.type === 'electric' ? '⚡' : '🔥'} {s.cups}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{s.currentSupplier ?? '—'}</p>
                    <p className="text-xs text-gray-400">{s.tariff}</p>
                  </div>
                  <div>
                    {s.contractEndDate ? (
                      <span className={cn('text-sm font-medium', expiryClass(s.contractEndDate))}>{expiryLabel(s.contractEndDate)}</span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </div>
                  <div>
                    {score > 0
                      ? <span className={cn('text-xs px-2 py-1 rounded-full font-semibold', scoreColor)}>{score}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              )
            })}
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">{((page-1)*25)+1}–{Math.min(page*25,total)} de {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Anterior</button>
            <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page>=pages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Següent →</button>
          </div>
        </div>
      )}
    </div>
  )
}
