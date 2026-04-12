'use client'
import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, comparisonsApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Search, Loader2, ArrowRight, Download, Mail, MessageCircle,
  CheckCircle, ChevronRight, BarChart2, Trophy, FileUp, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fmtMoney = (n: number) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(n)

const STEPS = ['CUPS', 'Consum', 'Comparativa'] as const
type Step = 0 | 1 | 2

interface FormData {
  cups: string
  clientName: string; clientNif: string; clientAddress: string
  powerP1: string; powerP2: string; powerP3: string
  energyP1: string; energyP2: string; energyP3: string
  energyP4: string; energyP5: string; energyP6: string
  currentPowerPriceP1: string; currentPowerPriceP2: string; currentPowerPriceP3: string
  currentEnergyPriceP1: string; currentEnergyPriceP2: string; currentEnergyPriceP3: string
  currentEnergyPriceP4: string; currentEnergyPriceP5: string; currentEnergyPriceP6: string
}

const empty: FormData = {
  cups: '', clientName: '', clientNif: '', clientAddress: '',
  powerP1: '', powerP2: '', powerP3: '',
  energyP1: '', energyP2: '', energyP3: '', energyP4: '', energyP5: '', energyP6: '',
  currentPowerPriceP1: '', currentPowerPriceP2: '', currentPowerPriceP3: '',
  currentEnergyPriceP1: '', currentEnergyPriceP2: '', currentEnergyPriceP3: '',
  currentEnergyPriceP4: '', currentEnergyPriceP5: '', currentEnergyPriceP6: '',
}

export default function ComparisonsPage() {
  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState<FormData>(empty)
  const [looking, setLooking] = useState(false)
  const [found, setFound] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [compId, setCompId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'savingsEur' | 'estimatedCommission' | 'newCostTotal'>('savingsEur')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)
  const invoiceRef = useRef<HTMLInputElement>(null)

  const f = (k: keyof FormData, v: string) => setForm({ ...form, [k]: v })
  const n = (v: string) => v ? Number(v) : undefined

  async function handleInvoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const data = await comparisonsApi.extractInvoice(file)
      const toStr = (v: any) => v != null ? String(v) : ''
      setForm(prev => ({
        ...prev,
        cups:              data.cups              ?? prev.cups,
        clientName:        data.clientName        ?? prev.clientName,
        clientNif:         data.clientNif         ?? prev.clientNif,
        clientAddress:     data.clientAddress     ?? prev.clientAddress,
        powerP1:           toStr(data.powerP1)    || prev.powerP1,
        powerP2:           toStr(data.powerP2)    || prev.powerP2,
        powerP3:           toStr(data.powerP3)    || prev.powerP3,
        energyP1:          toStr(data.energyP1)   || prev.energyP1,
        energyP2:          toStr(data.energyP2)   || prev.energyP2,
        energyP3:          toStr(data.energyP3)   || prev.energyP3,
        energyP4:          toStr(data.energyP4)   || prev.energyP4,
        energyP5:          toStr(data.energyP5)   || prev.energyP5,
        energyP6:          toStr(data.energyP6)   || prev.energyP6,
        currentPowerPriceP1:  toStr(data.currentPowerPriceP1)  || prev.currentPowerPriceP1,
        currentPowerPriceP2:  toStr(data.currentPowerPriceP2)  || prev.currentPowerPriceP2,
        currentPowerPriceP3:  toStr(data.currentPowerPriceP3)  || prev.currentPowerPriceP3,
        currentEnergyPriceP1: toStr(data.currentEnergyPriceP1) || prev.currentEnergyPriceP1,
        currentEnergyPriceP2: toStr(data.currentEnergyPriceP2) || prev.currentEnergyPriceP2,
        currentEnergyPriceP3: toStr(data.currentEnergyPriceP3) || prev.currentEnergyPriceP3,
        currentEnergyPriceP4: toStr(data.currentEnergyPriceP4) || prev.currentEnergyPriceP4,
        currentEnergyPriceP5: toStr(data.currentEnergyPriceP5) || prev.currentEnergyPriceP5,
        currentEnergyPriceP6: toStr(data.currentEnergyPriceP6) || prev.currentEnergyPriceP6,
      }))
      setExtracted(true)
      setFound(true)
      toast.success('Factura llegida correctament. Revisa les dades i continua.')
      // Auto-advance to step 1 if basic data was found
      if (data.energyP1 || data.powerP1) {
        setTimeout(() => setStep(1), 800)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err.message ?? 'Error llegint la factura')
    } finally {
      setExtracting(false)
      if (invoiceRef.current) invoiceRef.current.value = ''
    }
  }

  async function lookupCups() {
    if (!form.cups) return
    setLooking(true)
    try {
      const res = await api.get(`/comparisons/lookup/${form.cups}`).then(r => r.data)
      if (res) {
        setForm({
          ...form,
          clientName: res.client?.name ?? '',
          clientNif: res.client?.taxId ?? '',
          clientAddress: [res.client?.addressStreet, res.client?.addressCity].filter(Boolean).join(', '),
          powerP1: res.powerP1?.toString() ?? '',
          powerP2: res.powerP2?.toString() ?? '',
          powerP3: res.powerP3?.toString() ?? '',
        })
        setFound(true)
        toast.success('CUPS trobat a la base de dades')
      } else {
        setFound(false)
        toast.info('CUPS no trobat, introdueix les dades manualment')
      }
    } catch {
      setFound(false)
    } finally {
      setLooking(false)
    }
  }

  const generateMut = useMutation({
    mutationFn: () => api.post('/comparisons/generate', {
      cups: form.cups || undefined,
      clientName: form.clientName || undefined,
      clientNif: form.clientNif || undefined,
      clientAddress: form.clientAddress || undefined,
      powerP1: n(form.powerP1), powerP2: n(form.powerP2), powerP3: n(form.powerP3),
      energyP1: n(form.energyP1), energyP2: n(form.energyP2), energyP3: n(form.energyP3),
      energyP4: n(form.energyP4), energyP5: n(form.energyP5), energyP6: n(form.energyP6),
      currentPowerPriceP1: n(form.currentPowerPriceP1), currentPowerPriceP2: n(form.currentPowerPriceP2), currentPowerPriceP3: n(form.currentPowerPriceP3),
      currentEnergyPriceP1: n(form.currentEnergyPriceP1), currentEnergyPriceP2: n(form.currentEnergyPriceP2), currentEnergyPriceP3: n(form.currentEnergyPriceP3),
      currentEnergyPriceP4: n(form.currentEnergyPriceP4), currentEnergyPriceP5: n(form.currentEnergyPriceP5), currentEnergyPriceP6: n(form.currentEnergyPriceP6),
    }).then(r => r.data),
    onSuccess: (res) => {
      setResults(res.results)
      setCompId(res.id)
      setStep(2)
      toast.success(`${res.results.length} tarifes comparades`)
    },
    onError: () => toast.error('Error generant comparativa'),
  })

  function downloadPdf() {
    if (!compId) return
    const token = api.defaults.headers.common['Authorization']
    fetch(`${api.defaults.baseURL}/comparisons/${compId}/pdf`, { headers: { Authorization: token as string } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `comparativa-${compId.slice(0, 8)}.pdf`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  function sendWhatsApp() {
    if (!results?.[0]) return
    const best = results[0]
    const text = [
      `Hola ${form.clientName || 'client'}!`,
      `Hem analitzat la teva tarifa actual i hem trobat una opció millor:`,
      `\u2705 ${best.company} - ${best.tariffType}`,
      `\ud83d\udcb0 Estalvi anual: ${fmtMoney(best.savingsEur)} (${best.savingsPct}%)`,
      `Vols que t'ho expliquem sense compromís?`,
    ].join('\n')
    const phone = '' // empty = no specific number
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  function sendEmail() {
    if (!results?.[0]) return
    const best = results[0]
    const subject = `Comparativa energètica - ${form.clientName || 'Client'}`
    const body = `Hola ${form.clientName || ''},\n\nHem trobat una tarifa que et pot estalviar ${fmtMoney(best.savingsEur)}/any (${best.savingsPct}%).\n\nMillor opció: ${best.company} - ${best.tariffType}\n\nContacta'ns per més detalls.\n\nAssessoria 3.0`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self')
  }

  const sorted = results?.sort((a: any, b: any) => {
    if (sortBy === 'savingsEur') return b.savingsEur - a.savingsEur
    if (sortBy === 'estimatedCommission') return b.estimatedCommission - a.estimatedCommission
    return a.newCostTotal - b.newCostTotal
  }) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Comparatives</h1>
        <p className="text-sm text-gray-500 mt-0.5">Compara tarifes i genera propostes per als teus clients</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => { if (i <= step || (i === 2 && results)) setStep(i as Step) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                step === i ? 'bg-blue-600 text-white' :
                i < step ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-gray-100 text-gray-400'
              )}
            >
              {i < step ? <CheckCircle className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs">{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 0: CUPS + Client */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

          {/* AI Invoice Reader */}
          <div className={cn(
            'rounded-xl border-2 border-dashed p-5 text-center transition-all',
            extracted ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
          )}>
            <input ref={invoiceRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleInvoiceUpload} />
            {extracting ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm font-medium text-blue-700">Llegint factura amb IA...</p>
                <p className="text-xs text-blue-500">Analitzant document i extraient dades</p>
              </div>
            ) : extracted ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-6 h-6" />
                  <p className="text-sm font-semibold">Factura llegida correctament</p>
                </div>
                <p className="text-xs text-green-600">Les dades s'han omplert automàticament. Revisa i continua.</p>
                <button
                  onClick={() => { setExtracted(false); invoiceRef.current?.click() }}
                  className="text-xs text-green-600 underline mt-1 hover:text-green-700"
                >
                  Pujar una altra factura
                </button>
              </div>
            ) : (
              <button
                onClick={() => invoiceRef.current?.click()}
                className="flex flex-col items-center gap-2 w-full py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-blue-600">
                  <Sparkles className="w-5 h-5" />
                  <FileUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-blue-700">Pujar factura (PDF o imatge)</p>
                <p className="text-xs text-blue-500">La IA llegirà la factura i omplirà les dades automàticament</p>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>o introdueix les dades manualment</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Cerca per CUPS</label>
            <div className="flex gap-2">
              <input value={form.cups} onChange={e => f('cups', e.target.value)} placeholder="ES0000000000000000XX"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
              <button onClick={lookupCups} disabled={!form.cups || looking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
            {found && !extracted && <p className="text-xs text-green-600 mt-1">Dades del client carregades automàticament</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom client</label>
              <input value={form.clientName} onChange={e => f('clientName', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">NIF</label>
              <input value={form.clientNif} onChange={e => f('clientNif', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Adreça</label>
              <input value={form.clientAddress} onChange={e => f('clientAddress', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>

          <button onClick={() => setStep(1)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Següent <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Consumption data */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Potència contractada (kW)</p>
            <div className="grid grid-cols-3 gap-4">
              {(['P1', 'P2', 'P3'] as const).map((p, i) => (
                <div key={p}>
                  <label className="text-xs text-gray-500 mb-1 block">Potència {p}</label>
                  <input type="number" step="any" value={form[`powerP${i + 1}` as keyof FormData]} onChange={e => f(`powerP${i + 1}` as keyof FormData, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" placeholder="kW" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Energia consumida (kWh/any)</p>
            <div className="grid grid-cols-6 gap-3">
              {(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const).map((p, i) => (
                <div key={p}>
                  <label className="text-xs text-gray-500 mb-1 block">{p}</label>
                  <input type="number" step="any" value={form[`energyP${i + 1}` as keyof FormData]} onChange={e => f(`energyP${i + 1}` as keyof FormData, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" placeholder="kWh" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Preus actuals energia (€/kWh)</p>
            <div className="grid grid-cols-6 gap-3">
              {(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const).map((p, i) => (
                <div key={p}>
                  <label className="text-xs text-gray-500 mb-1 block">{p}</label>
                  <input type="number" step="any" value={form[`currentEnergyPriceP${i + 1}` as keyof FormData]} onChange={e => f(`currentEnergyPriceP${i + 1}` as keyof FormData, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" placeholder="€/kWh" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Preus actuals potència (€/kW/any)</p>
            <div className="grid grid-cols-3 gap-4">
              {(['P1', 'P2', 'P3'] as const).map((p, i) => (
                <div key={p}>
                  <label className="text-xs text-gray-500 mb-1 block">{p}</label>
                  <input type="number" step="any" value={form[`currentPowerPriceP${i + 1}` as keyof FormData]} onChange={e => f(`currentPowerPriceP${i + 1}` as keyof FormData, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" placeholder="€/kW/any" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Enrere</button>
            <button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
              Generar comparativa
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Results */}
      {step === 2 && results && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm text-gray-600 font-medium">{sorted.length} tarifes comparades</span>
            <div className="flex-1" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="savingsEur">Ordenar per estalvi</option>
              <option value="estimatedCommission">Ordenar per comissió</option>
              <option value="newCostTotal">Ordenar per preu total</option>
            </select>
            <button onClick={downloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={sendEmail} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button onClick={sendWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </div>

          {/* Best option highlight */}
          {sorted[0] && sorted[0].savingsEur > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
              <Trophy className="w-8 h-8 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">{sorted[0].company} — {sorted[0].tariffType}</p>
                <p className="text-sm text-green-700">Millor opció: estalvia {fmtMoney(sorted[0].savingsEur)}/any ({sorted[0].savingsPct}%)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">{fmtMoney(sorted[0].savingsEur)}</p>
                <p className="text-xs text-green-600">estalvi/any</p>
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Companyia</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tarifa</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cost actual</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cost nou</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Estalvi</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">%</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Comissió est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((r: any, i: number) => (
                    <tr key={r.tariffId} className={cn('hover:bg-gray-50/50', i === 0 && r.savingsEur > 0 && 'bg-green-50/50')}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.company}</td>
                      <td className="px-4 py-3 text-gray-600">{r.tariffType}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">{fmtMoney(r.currentCostTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(r.newCostTotal)}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-semibold', r.savingsEur > 0 ? 'text-green-700' : 'text-red-500')}>
                        {r.savingsEur > 0 ? '+' : ''}{fmtMoney(r.savingsEur)}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums text-xs', r.savingsPct > 0 ? 'text-green-600' : 'text-red-400')}>
                        {r.savingsPct > 0 ? '+' : ''}{r.savingsPct}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-600 font-medium">{fmtMoney(r.estimatedCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={() => { setStep(0); setResults(null); setCompId(null); setForm(empty); setFound(false); setExtracted(false) }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Nova comparativa
          </button>
        </div>
      )}
    </div>
  )
}
