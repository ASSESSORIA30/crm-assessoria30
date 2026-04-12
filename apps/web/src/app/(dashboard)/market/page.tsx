'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, TrendingUp, TrendingDown, Minus, Zap, Flame, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Commodity = 'electricity' | 'gas'
type ContractType = 'spot' | 'week' | 'month' | 'quarter' | 'year'

const TYPE_LABELS: Record<ContractType, string> = {
  spot:    'Spot / Diari',
  week:    'Setmanal',
  month:   'Mensual',
  quarter: 'Trimestral',
  year:    'Anual',
}

const TYPE_ORDER: ContractType[] = ['spot', 'week', 'month', 'quarter', 'year']

function Arrow({ dir, size = 'sm' }: { dir: 'up' | 'down' | 'flat'; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  if (dir === 'up')   return <TrendingUp   className={cn(cls, 'text-red-500')} />
  if (dir === 'down') return <TrendingDown className={cn(cls, 'text-green-500')} />
  return <Minus className={cn(cls, 'text-gray-400')} />
}

function ChangeLabel({ change, dir }: { change: number | null; dir: 'up' | 'down' | 'flat' }) {
  if (change === null) return null
  const cls = dir === 'up' ? 'text-red-500' : dir === 'down' ? 'text-green-500' : 'text-gray-400'
  return (
    <span className={cn('text-xs font-medium tabular-nums', cls)}>
      {change > 0 ? '+' : ''}{change.toFixed(2)}
    </span>
  )
}

export default function MarketPage() {
  const [commodity, setCommodity] = useState<Commodity>('electricity')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const { data: allContracts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['market-omip'],
    queryFn:  () => api.get('/market/omip').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  })

  // All contracts for the selected commodity
  const contracts = useMemo(
    () => (allContracts as any[]).filter((c: any) => c.commodity === commodity),
    [allContracts, commodity],
  )

  // Non-year contracts shown in the left list
  const mainContracts = useMemo(
    () => contracts
      .filter((c: any) => c.type !== 'year')
      .sort((a: any, b: any) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)),
    [contracts],
  )

  // Year contracts → "Contractes Següents"
  const yearContracts = useMemo(
    () => contracts
      .filter((c: any) => c.type === 'year')
      .sort((a: any, b: any) => a.code.localeCompare(b.code)),
    [contracts],
  )

  const selected = contracts.find((c: any) => c.code === selectedCode) ?? mainContracts[0]

  // Simulated historical data for the chart
  const chartData = useMemo(() => {
    if (!selected?.price) return []
    const base = selected.price
    const days = selected.type === 'spot' ? 30 : selected.type === 'week' ? 16 : 90
    return Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      const variance = (Math.random() - 0.5) * base * 0.12
      return {
        date:  date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' }),
        price: Math.round((base + variance) * 100) / 100,
      }
    })
  }, [selected])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mercat Diari</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            OMIP — Espanya (FTB-Spain) · Preus en temps real
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Commodity toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setCommodity('electricity'); setSelectedCode(null) }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
                commodity === 'electricity' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Zap className="w-4 h-4" /> Electricitat
            </button>
            <button
              onClick={() => { setCommodity('gas'); setSelectedCode(null) }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
                commodity === 'gas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Flame className="w-4 h-4" /> Gas Natural
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Actualitzar"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-12 gap-5">

          {/* ── Left: contract list (spot/week/month/quarter) ── */}
          <div className="col-span-3 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Contractes</p>
            {mainContracts.length === 0 ? (
              <p className="text-sm text-gray-400 px-2 py-4">Cap contracte disponible</p>
            ) : (
              mainContracts.map((c: any) => {
                const active = selected?.code === c.code
                return (
                  <button
                    key={c.code}
                    onClick={() => setSelectedCode(c.code)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl transition-all',
                      active ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn('text-[11px] font-mono truncate', active ? 'text-blue-500' : 'text-gray-400')}>
                          {c.code}
                        </p>
                        <p className={cn('text-sm font-medium', active ? 'text-blue-900' : 'text-gray-700')}>
                          {TYPE_LABELS[c.type as ContractType] ?? c.type}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {c.price != null ? (
                          <>
                            <p className={cn('text-sm font-bold tabular-nums', active ? 'text-blue-900' : 'text-gray-900')}>
                              {c.price.toFixed(2)}
                            </p>
                            <div className="flex items-center justify-end gap-0.5">
                              <Arrow dir={c.changeDir} />
                              <ChangeLabel change={c.change} dir={c.changeDir} />
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-gray-300">N/D</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* ── Center: chart ── */}
          <div className="col-span-6 bg-white rounded-xl border border-gray-200 p-5">
            {selected ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{selected.code} · FTB Spain</p>
                  </div>
                  {selected.price != null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {selected.price.toFixed(2)}
                        <span className="text-sm text-gray-400 font-normal ml-1">€/MWh</span>
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <Arrow dir={selected.changeDir} size="lg" />
                        <ChangeLabel change={selected.change} dir={selected.changeDir} />
                      </div>
                    </div>
                  )}
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(v: any) => [`${Number(v).toFixed(2)} €/MWh`, 'Preu']}
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
                  <div className="flex items-center justify-center h-[280px] text-gray-300">
                    <p className="text-sm">Sense dades de gràfic</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300">
                <p className="text-sm">Selecciona un contracte</p>
              </div>
            )}
          </div>

          {/* ── Right: Contractes Següents (year contracts YR-xx) ── */}
          <div className="col-span-3 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Contractes Següents
            </p>

            {yearContracts.length === 0 ? (
              <p className="text-sm text-gray-400">Cap contracte anual</p>
            ) : (
              yearContracts.map((c: any) => (
                <button
                  key={c.code}
                  onClick={() => setSelectedCode(c.code)}
                  className={cn(
                    'w-full text-left bg-white rounded-xl border p-4 transition-all hover:border-gray-300',
                    selected?.code === c.code ? 'border-blue-300 bg-blue-50' : 'border-gray-200',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-gray-500">{c.code}</span>
                    <div className="flex items-center gap-1">
                      <Arrow dir={c.changeDir} />
                      <ChangeLabel change={c.change} dir={c.changeDir} />
                    </div>
                  </div>
                  {c.price != null ? (
                    <p className="text-xl font-bold text-gray-900 tabular-nums">
                      {c.price.toFixed(2)}
                      <span className="text-xs text-gray-400 font-normal ml-1">€/MWh</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">N/D</p>
                  )}
                </button>
              ))
            )}

            {/* Summary */}
            <div className={cn(
              'rounded-xl p-4 border mt-2',
              commodity === 'electricity' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200',
            )}>
              <p className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-2',
                commodity === 'electricity' ? 'text-amber-600' : 'text-blue-600',
              )}>
                Resum {commodity === 'electricity' ? 'Electricitat' : 'Gas'}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Zona</span>
                  <span className="font-semibold text-xs">{commodity === 'electricity' ? 'FTB Spain' : 'MIBGAS PVB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contractes</span>
                  <span className="font-semibold">{contracts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Anuals</span>
                  <span className="font-semibold">{yearContracts.length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
