// apps/web/src/app/(dashboard)/dashboard/page.tsx
'use client'
import { useState }    from 'react'
import { useQuery }    from '@tanstack/react-query'
import Link            from 'next/link'
import { oppApi, api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { ActionModal } from '@/components/dashboard/action-modal'
import {
  Target, TrendingUp, CheckCircle, Activity,
  Phone, MessageCircle, Mail, Eye, ChevronRight,
  AlertTriangle, Clock,
} from 'lucide-react'
import {
  cn, fmt, expiryLabel, expiryClass,
  SERVICE_ICON, CONTACT_LABEL, STAGE_LABEL,
} from '@/lib/utils'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type ModalState = { oppId: string; type: 'call' | 'whatsapp' | 'email' } | null

export default function DashboardPage() {
  const { user }   = useAuthStore()
  const [modal, setModal] = useState<ModalState>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  oppApi.dashboard,
    refetchInterval: 60_000,
  })

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bon dia' : hour < 20 ? 'Bona tarda' : 'Bona nit'
  const firstName = user?.name?.split(' ')[0] ?? ''

  const urgent    = data?.urgent    ?? []
  const following = data?.following ?? []
  const allOpps   = [...urgent, ...following]
  const modalOpp  = modal ? allOpps.find((o: any) => o.id === modal.oppId) : null

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      {/* Salutació */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {urgent.length > 0
            ? `Tens ${urgent.length} oportunitat${urgent.length > 1 ? 's' : ''} urgent${urgent.length > 1 ? 's' : ''} avui.`
            : 'Cap urgència avui.'}
          {data?.potentialTotal > 0 && ` Potencial obert: ${fmt.currency(data.potentialTotal)}/any.`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={AlertTriangle} label="Urgents avui"     value={urgent.length}            color={urgent.length > 0 ? 'red'   : 'gray'} />
        <KpiCard icon={TrendingUp}    label="Potencial total"  value={fmt.currency(data?.potentialTotal)} color="blue"  />
        <KpiCard icon={Clock}         label="En seguiment"     value={following.length}          color="amber" />
        <KpiCard icon={CheckCircle}   label="Guanyades mes"    value={data?.wonThisMonth ?? 0}   color="green" />
      </div>

      {/* ACTUA ARA */}
      {urgent.length > 0 && (
        <section>
          <SectionLabel>
            Actua ara
            <span className="text-gray-400 font-normal ml-1.5">— {urgent.length} urgent{urgent.length > 1 ? 's' : ''}</span>
          </SectionLabel>
          <div className="space-y-3">
            {urgent.map((opp: any) => (
              <OppCard key={opp.id} opp={opp} variant="urgent" onAction={(type) => setModal({ oppId: opp.id, type })} />
            ))}
          </div>
        </section>
      )}

      {/* SEGUIMENT */}
      {following.length > 0 && (
        <section>
          <SectionLabel>
            Seguiment
            <span className="text-gray-400 font-normal ml-1.5">— {following.length} en curs</span>
          </SectionLabel>
          <div className="space-y-2">
            {following.map((opp: any) => (
              <OppCard key={opp.id} opp={opp} variant="follow" onAction={(type) => setModal({ oppId: opp.id, type })} />
            ))}
          </div>
        </section>
      )}

      {urgent.length === 0 && following.length === 0 && (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No tens oportunitats urgents.</p>
          <Link href="/opportunities" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Veure totes les oportunitats →
          </Link>
        </div>
      )}

      {/* Estad\u00edstiques */}
      <StatsPanel />

      {/* Modal */}
      {modal && modalOpp && (
        <ActionModal opp={modalOpp} type={modal.type} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  electric: '#f59e0b', gas: '#3b82f6', fiber: '#8b5cf6',
  mobile: '#10b981', insurance: '#ef4444', alarm: '#6366f1',
}
const SERVICE_LABELS: Record<string, string> = {
  electric: 'Llum', gas: 'Gas', fiber: 'Fibra',
  mobile: 'M\u00f2bil', insurance: 'Asseguran\u00e7a', alarm: 'Alarma',
}
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#64748b']

function StatsPanel() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 120_000,
  })

  if (!stats) return null

  const serviceData = (stats.byServiceType ?? []).map((d: any) => ({
    name: SERVICE_LABELS[d.type] ?? d.type,
    value: d.count,
    fill: SERVICE_COLORS[d.type] ?? '#94a3b8',
  }))

  const companyData = (stats.byCompany ?? []).slice(0, 8)
  const agentData = (stats.byAgent ?? []).slice(0, 10)

  const hasData = serviceData.length > 0 || companyData.length > 0 || agentData.length > 0
  if (!hasData) return null

  return (
    <section>
      <SectionLabel>
        Estad\u00edstiques
        <span className="text-gray-400 font-normal ml-1.5">\u2014 contractes actius</span>
      </SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Per tarifa */}
        {serviceData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Per tarifa</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {serviceData.map((d: any, i: number) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}`, 'Contractes']} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per companyia */}
        {companyData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Per companyia</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companyData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="company" tick={{ fontSize: 10 }} stroke="#94a3b8" width={90} />
                <Tooltip formatter={(v: any) => [`${v}`, 'Contractes']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {companyData.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per agent */}
        {agentData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Per agent</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="agent" tick={{ fontSize: 9, angle: -30, textAnchor: 'end' }} stroke="#94a3b8" height={50} />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => [`${v}`, 'Contractes']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── OppCard ──────────────────────────────────────────────────────────────────────────────
function OppCard({ opp, variant, onAction }: {
  opp: any
  variant: 'urgent' | 'follow'
  onAction: (type: 'call' | 'whatsapp' | 'email') => void
}) {
  const score = opp.supply?.opportunityScore ?? 0
  const borderColor = score >= 80 ? 'border-l-red-500' : score >= 50 ? 'border-l-amber-500' : 'border-l-gray-300'

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 border-l-4 p-4 hover:shadow-sm transition-shadow',
      variant === 'urgent' ? borderColor : 'border-l-blue-300',
    )}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{opp.client?.name}</span>
            {opp.supply?.cups && (
              <span className="text-[10px] text-gray-400 font-mono truncate">{opp.supply.cups.slice(-8)}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {SERVICE_ICON[opp.serviceType]} {opp.supply?.currentSupplier}
            {opp.supply?.tariff && <> · {opp.supply.tariff}</>}
            {opp.supply?.contractEndDate && (
              <span className={cn('ml-2 font-medium', expiryClass(opp.supply.contractEndDate))}>
                · {expiryLabel(opp.supply.contractEndDate)}
              </span>
            )}
          </p>
        </div>
        {opp.estimatedValue != null && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-green-700">{fmt.currency(opp.estimatedValue)}</p>
            <p className="text-[10px] text-gray-400">/any</p>
          </div>
        )}
      </div>

      {/* Estat */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',
          opp.contactStatus === 'not_contacted'   ? 'bg-gray-400' :
          opp.contactStatus === 'contacted'        ? 'bg-amber-500' :
          opp.contactStatus === 'in_conversation'  ? 'bg-blue-500' : 'bg-gray-300'
        )} />
        <span className="text-xs text-gray-500">
          {CONTACT_LABEL[opp.contactStatus]}
          {opp.activities?.[0]?.note && (
            <span className="text-gray-400"> · {opp.activities[0].note.slice(0, 55)}</span>
          )}
        </span>
      </div>

      {/* Accions */}
      <div className="flex items-center gap-2">
        <ActionBtn icon={Phone}          label="Trucar"    onClick={() => onAction('call')}      />
        <ActionBtn icon={MessageCircle}  label="WhatsApp"  onClick={() => onAction('whatsapp')}  green />
        <ActionBtn icon={Mail}           label="Email"     onClick={() => onAction('email')}     />
        <Link href={`/opportunities/${opp.id}`}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
          Veure <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, green = false }: { icon: any; label: string; onClick: () => void; green?: boolean }) {
  return (
    <button onClick={onClick} className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all',
      green
        ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
        : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300',
    )}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center mb-3">
      <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">{children}</h2>
      <div className="flex-1 ml-3 h-px bg-gray-100" />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    red:   'bg-red-50 text-red-500',
    blue:  'bg-blue-50 text-blue-500',
    amber: 'bg-amber-50 text-amber-500',
    green: 'bg-green-50 text-green-500',
    gray:  'bg-gray-100 text-gray-400',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
      <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}</div>
    </div>
  )
}
