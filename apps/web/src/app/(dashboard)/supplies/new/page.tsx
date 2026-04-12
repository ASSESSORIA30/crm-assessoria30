'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { suppliesApi, clientsApi, productsApi, api } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Zap, Flame, Wifi, Shield, Heart, Plus, Trash2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const TYPES = [
  { id: 'electric', label: 'Llum',              icon: Zap,    color: 'amber'  },
  { id: 'gas',      label: 'Gas',               icon: Flame,  color: 'blue'   },
  { id: 'telecom',  label: 'Telecomunicacions', icon: Wifi,   color: 'purple' },
  { id: 'alarm',    label: 'Alarmes',           icon: Shield, color: 'red'    },
  { id: 'insurance',label: 'Assegurances',      icon: Heart,  color: 'green'  },
] as const

const INSURANCE_TYPES = ['Cotxe', 'Moto', 'Llar', 'Responsabilitat Civil', 'Vida', 'Salut', 'Altres']
const GAS_TARIFFS     = ['RL.1', 'RL.2', 'RL.3', 'RL.4', 'RL.5', 'RL.6', 'RL.7', 'RL.8']

const COLORS: Record<string, string> = {
  amber:  'bg-amber-50 border-amber-300 text-amber-700',
  blue:   'bg-blue-50 border-blue-300 text-blue-700',
  purple: 'bg-purple-50 border-purple-300 text-purple-700',
  red:    'bg-red-50 border-red-300 text-red-700',
  green:  'bg-green-50 border-green-300 text-green-700',
}

/** Number of power periods based on tariff code */
function powerPeriods(tariff: string): number {
  if (!tariff) return 3
  if (/2\.0/i.test(tariff)) return 2
  if (/3\.0|6\./i.test(tariff)) return 6
  return 3
}

interface TelecomLine {
  lineType: 'fiber' | 'mobile'
  speed?: string; phoneNumber?: string; dataGb?: string
  operator: string; product: string
}

export default function NewSupplyPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'direction'

  const [type, setType]           = useState<string>('')
  const [clientId, setClientId]   = useState('')
  const [cups, setCups]           = useState('')
  const [cupsLooking, setCupsLooking] = useState(false)
  const [supplier, setSupplier]   = useState('')   // company name (string)
  const [tariff, setTariff]       = useState('')   // tariff code e.g. 2.0TD
  const [product, setProduct]     = useState('')   // product name
  const [powers, setPowers]       = useState<Record<string, string>>({})
  const [consumption, setConsumption] = useState('')
  const [altaNova, setAltaNova]   = useState(false)
  const [canviPotencia, setCanviPotencia] = useState(false)
  const [canviNom, setCanviNom]   = useState(false)
  const [bateriaVirtual, setBateriaVirtual] = useState(false)
  const [telecomLines, setTelecomLines] = useState<TelecomLine[]>([])
  const [insuranceType, setInsuranceType] = useState('')
  const [comissioMaster, setComissioMaster] = useState('')
  const [comissioAgent, setComissioAgent]   = useState('')

  // Reset energy fields when type changes
  useEffect(() => {
    setSupplier(''); setTariff(''); setProduct('')
    setPowers({}); setCups('')
    setAltaNova(false); setCanviPotencia(false); setCanviNom(false); setBateriaVirtual(false)
  }, [type])

  // Reset tariff/product when supplier changes
  useEffect(() => { setTariff(''); setProduct('') }, [supplier])

  const { data: clientsRes } = useQuery({
    queryKey: ['clients-for-supply'],
    queryFn: () => clientsApi.list({ limit: 500 }),
  })
  const clients = clientsRes?.data ?? (Array.isArray(clientsRes) ? clientsRes : [])

  // Companies from tariffs table (electric or gas)
  const serviceType = type === 'electric' ? 'Electricidad' : type === 'gas' ? 'Gas' : undefined
  const { data: companies = [] } = useQuery({
    queryKey: ['tariff-companies', serviceType],
    queryFn: () => serviceType
      ? productsApi.list({ serviceType }).then((rows: any[]) => {
          const seen = new Set<string>()
          return rows.filter(r => { if (seen.has(r.company)) return false; seen.add(r.company); return true })
        })
      : productsApi.companies(),
    enabled: type === 'electric' || type === 'gas',
  })

  // Products for selected company + serviceType
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-supply', supplier, serviceType],
    queryFn: () => productsApi.list({ company: supplier, ...(serviceType ? { serviceType } : {}) }),
    enabled: !!supplier && (type === 'electric' || type === 'gas'),
  })

  const createMut = useMutation({
    mutationFn: (data: any) => suppliesApi.create(data),
    onSuccess: () => { toast.success('Subministrament creat'); router.push('/supplies') },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error creant subministrament'),
  })

  async function lookupCups() {
    if (!cups) return
    setCupsLooking(true)
    try {
      const res = await api.get(`/comparisons/lookup/${cups}`).then(r => r.data)
      if (res) {
        if (res.powerP1) setPowers(p => ({ ...p, P1: res.powerP1.toString() }))
        if (res.powerP2) setPowers(p => ({ ...p, P2: res.powerP2.toString() }))
        if (res.powerP3) setPowers(p => ({ ...p, P3: res.powerP3.toString() }))
        setConsumption(res.annualConsumption?.toString() ?? '')
        if (res.client?.id) setClientId(res.client.id)
        toast.success('CUPS trobat — dades carregades')
      } else { toast.info('CUPS no trobat, introdueix les dades manualment') }
    } catch { /**/ }
    finally { setCupsLooking(false) }
  }

  function addTelecomLine(lineType: 'fiber' | 'mobile') {
    setTelecomLines([...telecomLines, { lineType, operator: '', product: '', speed: '', phoneNumber: '', dataGb: '' }])
  }
  function updateTelecomLine(i: number, field: string, value: string) {
    const u = [...telecomLines]; u[i] = { ...u[i], [field]: value }; setTelecomLines(u)
  }
  function removeTelecomLine(i: number) { setTelecomLines(telecomLines.filter((_, idx) => idx !== i)) }

  function handleSubmit() {
    if (!clientId) { toast.error('Selecciona un client'); return }
    if (!type) { toast.error('Selecciona un tipus'); return }
    if ((type === 'electric' || type === 'gas') && !cups) { toast.error('El CUPS és obligatori'); return }

    const data: any = {
      clientId, type, status: 'active',
      cups: cups || undefined,
      currentSupplier: supplier || undefined,
      tariff: tariff || undefined,
      product: product || undefined,
      powerP1: powers.P1 ? Number(powers.P1) : undefined,
      powerP2: powers.P2 ? Number(powers.P2) : undefined,
      powerP3: powers.P3 ? Number(powers.P3) : undefined,
      powerP4: powers.P4 ? Number(powers.P4) : undefined,
      powerP5: powers.P5 ? Number(powers.P5) : undefined,
      powerP6: powers.P6 ? Number(powers.P6) : undefined,
      annualConsumption: consumption ? Number(consumption) : undefined,
      altaNova, canviPotencia, canviNom, bateriaVirtual,
      telecomLines: telecomLines.length > 0 ? telecomLines : undefined,
      insuranceType: insuranceType || undefined,
      comissioMaster: comissioMaster ? Number(comissioMaster) : undefined,
      comissioAgent:  comissioAgent  ? Number(comissioAgent)  : undefined,
    }
    createMut.mutate(data)
  }

  const periods = powerPeriods(tariff)
  const isEnergyType = type === 'electric' || type === 'gas'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4 text-gray-500" /></button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nou subministrament</h1>
          <p className="text-sm text-gray-500 mt-0.5">Selecciona el tipus i omple les dades</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-5 gap-3">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
              type === t.id ? COLORS[t.color] : 'border-gray-200 text-gray-500 hover:border-gray-300',
            )}>
            <t.icon className="w-5 h-5" />
            {t.label}
          </button>
        ))}
      </div>

      {type && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Client selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Selecciona un client...</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.taxId ? ` (${c.taxId})` : ''}</option>)}
            </select>
          </div>

          {/* ═══ LLUM ═══ */}
          {type === 'electric' && (
            <>
              {/* CUPS */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">CUPS *</label>
                <div className="flex gap-2">
                  <input value={cups} onChange={e => setCups(e.target.value)} placeholder="ES0000000000000000XX"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
                  <button onClick={lookupCups} disabled={!cups || cupsLooking}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {cupsLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
                  </button>
                </div>
              </div>

              {/* Comercialitzadora + Producte */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Comercialitzadora</label>
                  <select value={supplier} onChange={e => setSupplier(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Selecciona...</option>
                    {companies.map((c: any) => {
                      const name = c.company ?? c.nombre
                      return <option key={name} value={name}>{name}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Producte</label>
                  <select value={product} onChange={e => {
                    const selected = products.find((p: any) => p.productName === e.target.value)
                    setProduct(e.target.value)
                    if (selected?.tariffType) setTariff(selected.tariffType)
                  }} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Selecciona...</option>
                    {(products as any[]).map((p: any) =>
                      <option key={p.id} value={p.productName}>{p.productName} {p.tariffType ? `(${p.tariffType})` : ''}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Tarifa (auto-filled or manual) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tarifa d'accés</label>
                  <select value={tariff} onChange={e => setTariff(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Selecciona...</option>
                    {['2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD'].map(t =>
                      <option key={t} value={t}>{t}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Consum anual (kWh)</label>
                  <input type="number" step="any" value={consumption} onChange={e => setConsumption(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
                </div>
              </div>

              {/* Power periods — conditional on tariff */}
              {tariff && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">
                    Potències contractades (kW) — {tariff}
                    <span className="ml-2 text-gray-400 font-normal">
                      {periods === 2 ? 'Punta P1 + Vall P2' : periods === 6 ? 'P1 a P6' : 'P1 a P3'}
                    </span>
                  </label>
                  <div className={cn('grid gap-3', `grid-cols-${Math.min(periods, 6)}`)}>
                    {Array.from({ length: periods }, (_, i) => `P${i + 1}`).map(p => (
                      <div key={p}>
                        <label className="text-xs text-gray-400 mb-1 block text-center">{p}</label>
                        <input type="number" step="any" value={powers[p] ?? ''}
                          onChange={e => setPowers(prev => ({ ...prev, [p]: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 text-right" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gestió */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Tipus de gestió</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'altaNova',       label: 'Alta nova',          val: altaNova,       set: setAltaNova },
                    { key: 'canviPotencia',  label: 'Canvi de potència',  val: canviPotencia,  set: setCanviPotencia },
                    { key: 'canviNom',       label: 'Canvi de nom',       val: canviNom,       set: setCanviNom },
                    { key: 'bateriaVirtual', label: 'Bateria virtual',    val: bateriaVirtual, set: setBateriaVirtual },
                  ].map(cb => (
                    <label key={cb.key} className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all',
                      cb.val ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}>
                      <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)} className="rounded border-gray-300" />
                      {cb.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ GAS ═══ */}
          {type === 'gas' && (
            <>
              {/* CUPS */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">CUPS Gas *</label>
                <div className="flex gap-2">
                  <input value={cups} onChange={e => setCups(e.target.value)} placeholder="ES0000000000000000XX"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
                  <button onClick={lookupCups} disabled={!cups || cupsLooking}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {cupsLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
                  </button>
                </div>
              </div>

              {/* Comercialitzadora + Tarifa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Comercialitzadora</label>
                  <select value={supplier} onChange={e => setSupplier(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Selecciona...</option>
                    {companies.map((c: any) => {
                      const name = c.company ?? c.nombre
                      return <option key={name} value={name}>{name}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tarifa</label>
                  <select value={tariff} onChange={e => setTariff(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Selecciona...</option>
                    {GAS_TARIFFS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Consum anual */}
              <div className="w-1/2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Consum anual (kWh)</label>
                <input type="number" step="any" value={consumption} onChange={e => setConsumption(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
              </div>

              {/* Gestió — only Alta nova + Canvi de nom */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Tipus de gestió</label>
                <div className="flex gap-3">
                  {[
                    { key: 'altaNova', label: 'Alta nova', val: altaNova, set: setAltaNova },
                    { key: 'canviNom', label: 'Canvi de nom', val: canviNom, set: setCanviNom },
                  ].map(cb => (
                    <label key={cb.key} className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all',
                      cb.val ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}>
                      <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)} className="rounded border-gray-300" />
                      {cb.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ TELECOMUNICACIONS ═══ */}
          {type === 'telecom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">Línies</label>
                <div className="flex gap-2">
                  <button onClick={() => addTelecomLine('fiber')} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
                    <Plus className="w-3 h-3" /> Fibra
                  </button>
                  <button onClick={() => addTelecomLine('mobile')} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
                    <Plus className="w-3 h-3" /> Línia mòbil
                  </button>
                </div>
              </div>
              {telecomLines.map((line, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', line.lineType === 'fiber' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700')}>
                      {line.lineType === 'fiber' ? 'Fibra' : 'Línia mòbil'}
                    </span>
                    <button onClick={() => removeTelecomLine(i)}><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {line.lineType === 'fiber' ? (
                      <div><label className="text-xs text-gray-500 mb-1 block">Velocitat (Mbps)</label>
                        <input value={line.speed} onChange={e => updateTelecomLine(i, 'speed', e.target.value)} placeholder="600" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
                    ) : (
                      <>
                        <div><label className="text-xs text-gray-500 mb-1 block">Número mòbil</label>
                          <input value={line.phoneNumber} onChange={e => updateTelecomLine(i, 'phoneNumber', e.target.value)} placeholder="600 000 000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">GB de dades</label>
                          <input value={line.dataGb} onChange={e => updateTelecomLine(i, 'dataGb', e.target.value)} placeholder="50" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
                      </>
                    )}
                    <div><label className="text-xs text-gray-500 mb-1 block">Teleoperadora</label>
                      <select value={line.operator} onChange={e => updateTelecomLine(i, 'operator', e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                        <option value="">Selecciona...</option>
                        {(companies as any[]).map((c: any) => { const n = c.company ?? c.nombre; return <option key={n} value={n}>{n}</option> })}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {telecomLines.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Afegeix línies de fibra o mòbil</p>}
            </div>
          )}

          {/* ═══ ALARMES ═══ */}
          {type === 'alarm' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Empresa d&apos;alarmes</label>
                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Selecciona...</option>
                  {(companies as any[]).map((c: any) => { const n = c.company ?? c.nombre; return <option key={n} value={n}>{n}</option> })}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Producte</label>
                <input value={product} onChange={e => setProduct(e.target.value)} placeholder="Nom del producte" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
          )}

          {/* ═══ ASSEGURANCES ═══ */}
          {type === 'insurance' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Asseguradora</label>
                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Selecciona...</option>
                  {(companies as any[]).map((c: any) => { const n = c.company ?? c.nombre; return <option key={n} value={n}>{n}</option> })}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-500 mb-1 block">Tipus d&apos;assegurança</label>
                <select value={insuranceType} onChange={e => setInsuranceType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Selecciona...</option>
                  {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ═══ COMISSIONS ═══ */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comissions</p>
            <div className={cn('grid gap-4', isAdmin ? 'grid-cols-2' : 'grid-cols-1')}>
              {isAdmin && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Comissió A3.0 (€)</label>
                  <input type="number" step="0.01" value={comissioMaster} onChange={e => setComissioMaster(e.target.value)}
                    placeholder="Import que paga la companyia" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  {isAdmin ? `Comissió agent (€)` : 'Comissió (€)'}
                </label>
                <input type="number" step="0.01" value={comissioAgent} onChange={e => setComissioAgent(e.target.value)}
                  placeholder={isAdmin ? "Import que rep l'agent" : 'Import comissió'}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={createMut.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear subministrament
            </button>
            <button onClick={() => router.back()}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel·lar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
