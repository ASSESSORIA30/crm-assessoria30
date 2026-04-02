'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, BarChart2, Users, Zap, DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Treemap,
} from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#64748b']

const SERVICE_LABELS: Record<string, string> = {
  electric: 'Llum', gas: 'Gas', fiber: 'Fibra',
  mobile: 'Mòbil', insurance: 'Assegurança', alarm: 'Alarma',
}

export default function StatsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', from, to],
    queryFn: () => api.get('/stats', { params: { ...(from && { from }), ...(to && { to }) } }).then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
  if (!stats) return null

  const serviceData = (stats.byServiceType ?? []).map((d: any) => ({ name: SERVICE_LABELS[d.type] ?? d.type, value: d.count }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Estadístiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visió global de l&apos;activitat comercial</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={BarChart2} label="Total contractes" value={stats.kpis.totalContracts} color="blue" />
        <KPI icon={Users} label="Agents actius" value={stats.kpis.totalAgents} color="purple" />
        <KPI icon={Zap} label="Consum total kWh" value={`${(stats.kpis.totalConsumption / 1000).toFixed(0)}k`} color="amber" />
        <KPI icon={Zap} label="Consum mitjà kWh" value={stats.kpis.avgConsumption.toLocaleString('ca-ES')} color="green" />
      </div>

      {/* Row 1: Monthly + Accumulated */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Contractes per mes">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Contractes" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Contractes acumulats">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="accumulated" fill="#10b981" radius={[4, 4, 0, 0]} name="Acumulat" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: By Agent (treemap) + By Company (treemap) */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Contractes per comercial">
          {stats.byAgent.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <Treemap
                data={stats.byAgent.map((a: any, i: number) => ({ name: a.agent, size: a.count, fill: COLORS[i % COLORS.length] }))}
                dataKey="size"
                nameKey="name"
                stroke="#fff"
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
        <ChartCard title="Contractes per comercialitzadora">
          {stats.byCompany.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <Treemap
                data={stats.byCompany.map((c: any, i: number) => ({ name: c.company, size: c.count, fill: COLORS[i % COLORS.length] }))}
                dataKey="size"
                nameKey="name"
                stroke="#fff"
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Row 3: Donuts */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Per estat">
          <DonutChart data={stats.byStage.map((d: any) => ({ name: d.stage, value: d.count }))} />
        </ChartCard>
        <ChartCard title="Per subministrament">
          <DonutChart data={stats.bySupplyType.map((d: any) => ({ name: d.type, value: d.count }))} />
        </ChartCard>
        <ChartCard title="Per tarifa">
          <DonutChart data={serviceData} />
        </ChartCard>
      </div>
    </div>
  )
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-500', purple: 'bg-purple-50 text-purple-500',
    amber: 'bg-amber-50 text-amber-500', green: 'bg-green-50 text-green-500',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon className="w-4 h-4" /></div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

function DonutChart({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return <EmptyChart />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: any) => [`${v}`, 'Contractes']} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-[200px] text-gray-300 text-sm">Sense dades</div>
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, fill } = props
  if (width < 30 || height < 20) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} stroke="#fff" strokeWidth={2} />
      {width > 50 && height > 25 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={width > 80 ? 11 : 9} fontWeight={600}>
          {name?.length > 12 ? name.slice(0, 12) + '…' : name}
        </text>
      )}
    </g>
  )
}
