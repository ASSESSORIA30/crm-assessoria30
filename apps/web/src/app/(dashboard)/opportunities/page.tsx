// apps/web/src/app/(dashboard)/opportunities/page.tsx
'use client'
import { useState }  from 'react'
import Link          from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { oppApi }    from '@/lib/api'
import { ActionModal } from '@/components/dashboard/action-modal'
import { Plus, Target, Phone, MessageCircle, ChevronRight } from 'lucide-react'
import { cn, fmt, expiryLabel, expiryClass, SERVICE_ICON, STAGE_LABEL, STAGE_COLOR } from '@/lib/utils'
import { toast }     from 'sonner'

type ModalState = { oppId: string; type: 'call' | 'whatsapp' | 'email' } | null

const STAGES = ['new_lead', 'contacted', 'comparison', 'presented', 'negotiation'] as const

export default function OpportunitiesPage() {
  const [modal, setModal] = useState<ModalState>(null)
  const [view,  setView]  = useState<'list' | 'kanban'>('list')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn:  () => oppApi.list({ limit: 100 }),
  })

  const opps = data?.data ?? []
  const allOpps = opps
  const modalOpp = modal ? opps.find((o: any) => o.id === modal.oppId) : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Oportunitats</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} oportunitats obertes</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['list', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}>
                {v === 'list' ? '≡ Llista' : '⋮ Kanban'}
              </button>
            ))}
          </div>
          <Link href="/opportunities/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Nova
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}</div>
      ) : opps.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cap oportunitat oberta</p>
          <Link href="/opportunities/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Crea la primera oportunitat</Link>
        </div>
      ) : view === 'list' ? (
        /* ── VISTA LLISTA ── */
        <div className="card overflow-hidden">
          {opps.filter((o: any) => !['won','lost'].includes(o.stage)).map((opp: any) => (
            <div key={opp.id} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <span className="text-lg flex-shrink-0">{SERVICE_ICON[opp.serviceType]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/clients/${opp.client?.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate">{opp.client?.name}</Link>
                  <span className={cn('badge', STAGE_COLOR[opp.stage])}>{STAGE_LABEL[opp.stage]}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {opp.title}
                  {opp.supply?.contractEndDate && (
                    <span className={cn('ml-2 font-medium', expiryClass(opp.supply.contractEndDate))}>
                      · {expiryLabel(opp.supply.contractEndDate)}
                    </span>
                  )}
                </p>
              </div>
              {opp.estimatedValue && <span className="text-sm font-semibold text-green-700 flex-shrink-0">{fmt.currency(opp.estimatedValue)}/any</span>}
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setModal({ oppId: opp.id, type: 'call' })}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-all">
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setModal({ oppId: opp.id, type: 'whatsapp' })}
                  className="p-1.5 rounded-lg border border-green-200 hover:bg-green-50 text-green-600 transition-all">
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <Link href={`/opportunities/${opp.id}`} className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        /* ── VISTA KANBAN ── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
          {STAGES.map(stage => {
            const stageOpps = opps.filter((o: any) => o.stage === stage)
            const total = stageOpps.reduce((s: number, o: any) => s + (o.estimatedValue ?? 0), 0)
            return (
              <div key={stage} className="bg-gray-50 rounded-xl p-3 min-w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('badge text-xs', STAGE_COLOR[stage])}>{STAGE_LABEL[stage]}</span>
                  <span className="text-xs text-gray-400">{stageOpps.length}</span>
                </div>
                {total > 0 && <p className="text-xs text-gray-400 mb-2">{fmt.currency(total)}/any</p>}
                <div className="space-y-2">
                  {stageOpps.map((opp: any) => (
                    <Link key={opp.id} href={`/opportunities/${opp.id}`}
                      className="block bg-white rounded-xl p-2.5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                      <p className="text-xs font-semibold text-gray-900 truncate">{opp.client?.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{SERVICE_ICON[opp.serviceType]} {opp.title}</p>
                      {opp.estimatedValue && <p className="text-xs font-semibold text-green-700 mt-1">{fmt.currency(opp.estimatedValue)}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && modalOpp && (
        <ActionModal opp={modalOpp} type={modal.type} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
