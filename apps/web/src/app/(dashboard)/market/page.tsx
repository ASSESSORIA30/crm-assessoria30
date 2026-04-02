'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, TrendingUp, TrendingDown, Minus, Zap, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Commodity = 'electricity' | 'gas'
type ContractType = 'spot' | 'week' | 'month' | 'quarter' | 'year' | 'ppa'

const ZONES = [
  { id: 'FTB-Spain', label: 'Espanya (FTB)' },
  { id: 'FPB-Portugal', label: 'Portugal (FPB)' },
  { id: 'FFB-France', label: 'Fran\u00e7a (FFB)' },
  { id: 'FDB-Germany', label: 'Alemanya (FDB)' },
]

const TYPE_LABELS: Record<ContractType, string> = {
  spot: 'Spot / Diari',
  week: 'Setmanal',
  month: 'Mensual',
  quarter: 'Trimestral',
  year: 'Anual',
  ppa: 'PPA',
}

const TYPE_ORDER: ContractType[] = ['spot', 'week', 'month', 'quarter', 'year', 'ppa']

export default function MarketPage() {
  const [commodity, setCommodity] = useState<Commodity>('electricity')
  const [zone, setZone] = useState('FTB-Spain')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['market-omip', commodity],
    queryFn: () => api.get('/market/omip', { params: { commodity } }).then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  })

  const filtered = useMemo(() => {
    let list = contracts.filter((c: any) => c.commodity === commodity)
    if (commodity === 'electricity') {
      list = list.filter((c: any) => !c.zone || c.zone === zone)
    }
    return list.sort((a: any, b: any) => {
      const ai = TYPE_ORDER.indexOf(a.type)
      const bi = TYPE_ORDER.indexOf(b.type)
      return ai - bi
    })
  }, [contracts, commodity, zone])

  const selected = filtered.find((c: any) => c.code === selectedCode) ?? filtered[0]

  // Mock historical data for chart (in production, store and query real history)
  const chartData = useMemo(() => {
    if (!selected?.price) return []
    const base = selected.price
    const days = selected.type === 'spot' ? 30 : selected.type === 'week' ? 12 : 90
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      const variance = (Math.random() - 0.5) * base * 0.15
      return {
        date: date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' }),
        price: Math.round((base + variance) * 100) / 100,
      }
    })
  }, [selected])

  const nextContracts = useMemo(() => {
    if (!selected) return []
    return filtered
      .filter((c: any) => c.type === selected.type && c.code !== selected.code)
      .slice(0, 3)
  }, [filtered, selected])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mercat Diari</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preus energia OMIP en temps real</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Commodity selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setCommodity('electricity'); setSelectedCode(null) }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
                commodity === 'electricity' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Zap className="w-4 h-4" /> Electricitat
            </button>
            <button
              onClick={() => { setCommodity('gas'); setSelectedCode(null) }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
                commodity === 'gas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Flame className="w-4 h-4" /> Gas Natural
            </button>
          </div>

          {/* Zone selector (only electricity) */}
          {commodity === 'electricity' && (
            <select
              value={zone}
              onChange={(e) => { setZone(e.target.value); setSelectedCode(null) }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Contract list */}
          <div className="col-span-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Contractes</p>
            {filtered.map((c: any) => {
              const isActive = (selected?.code === c.code)
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCode(c.code)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn('text-xs font-mono', isActive ? 'text-blue-700' : 'text-gray-400')}>{c.code}</p>
                      <p className={cn('text-sm font-medium', isActive ? 'text-blue-900' : 'text-gray-700')}>{TYPE_LABELS[c.type as ContractType]}</p>
                    </div>
                    <div className="text-right">
                      {c.price != null ? (
                        <>
                          <p className={cn('text-sm font-bold tabular-nums', isActive ? 'text-blue-900' : 'text-gray-900')}>
                            {c.price.toFixed(2)}
                          </p>
                          {c.change != null && (
                            <div className={cn('flex items-center gap-0.5 text-xs', c.change > 0 ? 'text-red-500' : c.change < 0 ? 'text-green-500' : 'text-gray-400')}>
                              {c.change > 0 ? <TrendingUp className="w-3 h-3" /> : c.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {c.change > 0 ? '+' : ''}{c.change.toFixed(2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-300">N/D</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 px-3 py-4">Cap contracte disponible</p>
            )}
          </div>

          {/* Center: Chart */}
          <div className="col-span-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{selected?.name ?? 'Selecciona un contracte'}</p>
                <p className="text-xs text-gray-400 font-mono">{selected?.code}</p>
              </div>
              {selected?.price != null && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{selected.price.toFixed(2)} <span className="text-sm text-gray-400">\u20ac/MWh</span></p>
                  {selected.change != null && (
                    <p className={cn('text-sm font-medium', selected.change > 0 ? 'text-red-500' : selected.change < 0 ? 'text-green-500' : 'text-gray-400')}>
                      {selected.change > 0 ? '+' : ''}{selected.change.toFixed(2)} \u20ac
                    </p>
                  )}
                </div>
              )}
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    formatter={(value: number) => [`${value.toFixed(2)} \u20ac/MWh`, 'Preu']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={commodity === 'electricity' ? '#f59e0b' : '#3b82f6'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-300">
                <p className="text-sm">Sense dades hist\u00f2riques disponibles</p>
              </div>
            )}
          </div>

          {/* Right: Next contracts */}
          <div className="col-span-3 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Seg\u00fcents contractes</p>
              {nextContracts.length > 0 ? (
                <div className="space-y-2">
                  {nextContracts.map((c: any) => (
                    <div key={c.code} className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedCode(c.code)}>
                      <p className="text-xs font-mono text-gray-400">{c.code}</p>
                      <p className="text-sm font-medium text-gray-700">{c.name}</p>
                      {c.price != null && (
                        <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{c.price.toFixed(2)} <span className="text-xs text-gray-400">\u20ac/MWh</span></p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Cap contracte seg\u00fcent</p>
              )}
            </div>

            {/* Summary box */}
            <div className={cn(
              'rounded-xl p-4 border',
              commodity === 'electricity' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            )}>
              <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', commodity === 'electricity' ? 'text-amber-600' : 'text-blue-600')}>
                Resum {commodity === 'electricity' ? 'Electricitat' : 'Gas'}
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contractes</span>
                  <span className="font-semibold">{filtered.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amb preu</span>
                  <span className="font-semibold">{filtered.filter((c: any) => c.price != null).length}</span>
                </div>
                {commodity === 'electricity' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zona</span>
                    <span className="font-semibold text-xs">{zone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
