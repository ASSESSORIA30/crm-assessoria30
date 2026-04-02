'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, clientsApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  FileText, Plus, Loader2, Send, Download, CheckCircle,
  AlertCircle, X, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const facApi = {
  list: () => api.get('/facturas').then(r => r.data),
  create: (d: any) => api.post('/facturas', d).then(r => r.data),
  emit: (id: string) => api.post(`/facturas/${id}/emit`).then(r => r.data),
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ca-ES')
const fmtMoney = (n: number) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(n)

interface Line { descripcio: string; quantitat: number; preuUnitari: number }

export default function FacturasPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [ivaPercentatge, setIvaPercentatge] = useState(21)
  const [linies, setLinies] = useState<Line[]>([{ descripcio: '', quantitat: 1, preuUnitari: 0 }])

  const { data: facturas = [], isLoading } = useQuery({ queryKey: ['facturas'], queryFn: facApi.list })
  const { data: clients = [] } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.list({ limit: 500 }), enabled: showForm })

  const createMut = useMutation({
    mutationFn: (d: any) => facApi.create(d),
    onSuccess: () => { toast.success('Factura creada'); qc.invalidateQueries({ queryKey: ['facturas'] }); resetForm() },
    onError: () => toast.error('Error creant factura'),
  })

  const emitMut = useMutation({
    mutationFn: (id: string) => facApi.emit(id),
    onSuccess: (res) => {
      const msg = res.estat === 'enviada_aeat' ? 'Factura emesa i enviada a AEAT' : 'Error enviant a AEAT'
      res.estat === 'enviada_aeat' ? toast.success(msg) : toast.error(msg)
      qc.invalidateQueries({ queryKey: ['facturas'] })
    },
    onError: () => toast.error('Error emetent'),
  })

  function resetForm() {
    setShowForm(false)
    setClientId('')
    setLinies([{ descripcio: '', quantitat: 1, preuUnitari: 0 }])
  }

  function addLine() { setLinies([...linies, { descripcio: '', quantitat: 1, preuUnitari: 0 }]) }
  function removeLine(i: number) { setLinies(linies.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: keyof Line, value: any) {
    const updated = [...linies]
    updated[i] = { ...updated[i], [field]: value }
    setLinies(updated)
  }

  const base = linies.reduce((s, l) => s + l.quantitat * l.preuUnitari, 0)
  const ivaCalc = base * (ivaPercentatge / 100)
  const totalCalc = base + ivaCalc

  function downloadPdf(id: string) {
    const token = api.defaults.headers.common['Authorization']
    fetch(`${api.defaults.baseURL}/facturas/${id}/pdf`, { headers: { Authorization: token as string } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `factura-${id.slice(0, 8)}.pdf`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  const ESTAT: Record<string, { label: string; style: string; icon: any }> = {
    esborrany:    { label: 'Esborrany',   style: 'bg-gray-100 text-gray-600',  icon: FileText },
    emesa:        { label: 'Emesa',       style: 'bg-blue-50 text-blue-700',   icon: Send },
    enviada_aeat: { label: 'AEAT OK',     style: 'bg-green-50 text-green-700', icon: CheckCircle },
    error_aeat:   { label: 'Error AEAT',  style: 'bg-red-50 text-red-700',     icon: AlertCircle },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Factures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{facturas.length} factures &middot; Verifactu activat</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova factura
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Nova factura</h2>
            <button onClick={resetForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">Selecciona...</option>
                {(Array.isArray(clients) ? clients : clients?.data ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.taxId ?? 'sense NIF'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">IVA %</label>
              <select value={ivaPercentatge} onChange={(e) => setIvaPercentatge(Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value={21}>21%</option>
                <option value={10}>10%</option>
                <option value={4}>4%</option>
                <option value={0}>0% (exempt)</option>
              </select>
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Línies</label>
              <button onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Afegir línia</button>
            </div>
            <div className="space-y-2">
              {linies.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Descripció" value={l.descripcio} onChange={(e) => updateLine(i, 'descripcio', e.target.value)}
                    className="col-span-6 text-sm border border-gray-200 rounded-lg px-3 py-2" />
                  <input type="number" min="1" value={l.quantitat} onChange={(e) => updateLine(i, 'quantitat', Number(e.target.value))}
                    className="col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
                  <input type="number" step="0.01" value={l.preuUnitari} onChange={(e) => updateLine(i, 'preuUnitari', Number(e.target.value))}
                    className="col-span-3 text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
                  <button onClick={() => removeLine(i)} className="col-span-1 p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Base imposable</span><span>{fmtMoney(base)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IVA ({ivaPercentatge}%)</span><span>{fmtMoney(ivaCalc)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{fmtMoney(totalCalc)}</span></div>
          </div>

          <button onClick={() => createMut.mutate({ clientId, linies, ivaPercentatge })}
            disabled={!clientId || linies.length === 0 || createMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Crear factura
          </button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : facturas.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap factura. Clica &quot;Nova factura&quot; per crear-ne una.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Base</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">IVA</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estat</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facturas.map((f: any) => {
                const e = ESTAT[f.estat] ?? ESTAT.esborrany
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">{f.numero}</td>
                    <td className="px-4 py-3 text-gray-700">{f.client?.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(f.dataFactura)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(f.baseImponible)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{fmtMoney(f.ivaImport)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtMoney(f.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1', e.style)}>
                        <e.icon className="w-3 h-3" /> {e.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {f.estat === 'esborrany' && (
                          <button onClick={() => emitMut.mutate(f.id)} disabled={emitMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                            <Send className="w-3 h-3" /> Emetre
                          </button>
                        )}
                        {(f.estat === 'enviada_aeat' || f.estat === 'emesa') && (
                          <button onClick={() => downloadPdf(f.id)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50">
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        )}
                        {f.estat === 'error_aeat' && (
                          <button onClick={() => emitMut.mutate(f.id)} disabled={emitMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700">
                            <Send className="w-3 h-3" /> Reintentar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
