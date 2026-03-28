// apps/web/src/app/(dashboard)/clients/[id]/page.tsx
'use client'
import { useState } from 'react'
import Link         from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { ArrowLeft, Phone, Mail, MapPin, Plus, Zap, Target, Edit } from 'lucide-react'
import { cn, fmt, initials, expiryLabel, expiryClass, STAGE_LABEL, SERVICE_ICON } from '@/lib/utils'

const STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Actiu',     cls: 'badge-green' },
  potential: { label: 'Potencial', cls: 'badge-amber' },
  inactive:  { label: 'Inactiu',  cls: 'badge-gray'  },
}
const TABS = [
  { id: 'supplies',      label: 'Subministraments', icon: Zap    },
  { id: 'opportunities', label: 'Oportunitats',     icon: Target },
]

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState('supplies')
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', params.id],
    queryFn:  () => clientsApi.get(params.id),
  })

  if (isLoading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      <div className="h-4 w-20 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  )
  if (!client) return <div className="text-gray-500 text-sm">Client no trobat</div>

  const s = STATUS[client.status] ?? STATUS.potential

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Clients
      </Link>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center flex-shrink-0">
              {initials(client.name)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900">{client.name}</h1>
                <span className={cn('badge', s.cls)}>{s.label}</span>
              </div>
              {client.taxId && <p className="text-sm text-gray-400 font-mono">{client.taxId}</p>}
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
                    <Mail className="w-3.5 h-3.5" /> {client.email}
                  </a>
                )}
                {client.addressCity && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <MapPin className="w-3.5 h-3.5" /> {client.addressCity}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/opportunities/new?clientId=${params.id}`} className="btn-primary text-xs px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" /> Oportunitat
            </Link>
          </div>
        </div>
        {client.agent && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center">
              {initials(client.agent.name)}
            </div>
            <span className="text-xs text-gray-500">Agent: <strong className="text-gray-700">{client.agent.name}</strong></span>
            <span className="text-xs text-gray-400 ml-auto">Alta {fmt.date(client.createdAt)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === 'supplies' && client.supplies?.length > 0 && (
                <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">{client.supplies.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Subministraments */}
          {tab === 'supplies' && (
            <div className="space-y-2">
              {!client.supplies?.length ? (
                <EmptyTab icon={Zap} text="Cap suministrament" action={{ label: 'Afegir suministrament', href: `/supplies/new?clientId=${params.id}` }} />
              ) : (
                client.supplies.map((s: any) => (
                  <Link key={s.id} href={`/supplies/${s.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
                    <span className="text-xl">{s.type === 'electric' ? '⚡' : '🔥'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-700 truncate">{s.cups}</p>
                      <p className="text-xs text-gray-400">
                        {s.currentSupplier} · {s.tariff}
                        {s.contractEndDate && (
                          <span className={cn('ml-2 font-medium', expiryClass(s.contractEndDate))}>
                            · {expiryLabel(s.contractEndDate)}
                          </span>
                        )}
                      </p>
                    </div>
                    {s.opportunityScore > 0 && (
                      <ScoreBadge score={s.opportunityScore} />
                    )}
                  </Link>
                ))
              )}
              <Link href={`/supplies/new?clientId=${params.id}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mt-2 px-1">
                <Plus className="w-4 h-4" /> Afegir suministrament
              </Link>
            </div>
          )}

          {/* Oportunitats */}
          {tab === 'opportunities' && (
            <div className="space-y-2">
              {!client.opportunities?.length ? (
                <EmptyTab icon={Target} text="Cap oportunitat" action={{ label: 'Crear oportunitat', href: `/opportunities/new?clientId=${params.id}` }} />
              ) : (
                client.opportunities.map((o: any) => (
                  <Link key={o.id} href={`/opportunities/${o.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
                    <span>{SERVICE_ICON[o.serviceType]}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{o.title}</p>
                      <p className="text-xs text-gray-400">{STAGE_LABEL[o.stage]}</p>
                    </div>
                    {o.estimatedValue && (
                      <span className="text-sm font-semibold text-green-700">{fmt.currency(o.estimatedValue)}</span>
                    )}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-700 leading-relaxed">{client.notes}</p>
        </div>
      )}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-red-50 text-red-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
  return <span className={cn('text-xs px-2 py-1 rounded-full font-semibold', cls)}>{score}</span>
}

function EmptyTab({ icon: Icon, text, action }: { icon: any; text: string; action?: { label: string; href: string } }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{text}</p>
      {action && <Link href={action.href} className="mt-2 inline-block text-sm text-blue-600 hover:underline">{action.label}</Link>}
    </div>
  )
}
