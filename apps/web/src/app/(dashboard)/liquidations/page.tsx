'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  DollarSign, FileText, Loader2, CheckCircle, Download,
  Plus, Calendar, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const liqApi = {
  agents: () => api.get('/liquidations/agents').then(r => r.data),
  list: (agentId?: string) => api.get('/liquidations', { params: agentId ? { agentId } : {} }).then(r => r.data),
  get: (id: string) => api.get(`/liquidations/${id}`).then(r => r.data),
  generate: (d: any) => api.post('/liquidations/generate', d).then(r => r.data),
  updateLines: (id: string, linies: any[]) => api.patch(`/liquidations/${id}/lines`, { linies }).then(r => r.data),
  approve: (id: string) => api.patch(`/liquidations/${id}/approve`).then(r => r.data),
  markPaid: (id: string) => api.patch(`/liquidations/${id}/paid`).then(r => r.data),
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ca-ES')
const fmtMoney = (n: number) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(n)

export default function LiquidationsPage() {
  const qc = useQueryClient()
  const [agentFilter, setAgentFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formAgent, setFormAgent] = useState('')
  const [formInicio, setFormInicio] = useState('')
  const [formFin, setFormFin] = useState('')

  const { data: agents = [] } = useQuery({ queryKey: ['liq-agents'], queryFn: liqApi.agents })
  const { data: liquidations = [], isLoading } = useQuery({
    queryKey: ['liquidations', agentFilter],
    queryFn: () => liqApi.list(agentFilter || undefined),
  })
  const { data: detail } = useQuery({
    queryKey: ['liquidation', selectedId],
    queryFn: () => liqApi.get(selectedId!),
    enabled: !!selectedId,
  })

  const generateMut = useMutation({
    mutationFn: (d: any) => liqApi.generate(d),
    onSuccess: (res) => {
      toast.success('Liquidaci\u00f3 generada')
      qc.invalidateQueries({ queryKey: ['liquidations'] })
      setSelectedId(res.id)
      setShowForm(false)
    },
    onError: () => toast.error('Error generant'),
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => liqApi.approve(id),
    onSuccess: () => { toast.success('Aprovada'); qc.invalidateQueries({ queryKey: ['liquidations'] }); qc.invalidateQueries({ queryKey: ['liquidation', selectedId] }) },
  })

  const paidMut = useMutation({
    mutationFn: (id: string) => liqApi.markPaid(id),
    onSuccess: () => { toast.success('Marcada com a pagada'); qc.invalidateQueries({ queryKey: ['liquidations'] }); qc.invalidateQueries({ queryKey: ['liquidation', selectedId] }) },
  })

  function downloadPdf(id: string) {
    const token = api.defaults.headers.common['Authorization']
    const url = `${api.defaults.baseURL}/liquidations/${id}/pdf`
    fetch(url, { headers: { Authorization: token as string } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `liquidacio-${id.slice(0, 8)}.pdf`
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  }

  const ESTAT_STYLE: Record<string, string> = {
    esborrany: 'bg-gray-100 text-gray-600',
    aprovada: 'bg-blue-50 text-blue-700',
    pagada: 'bg-green-50 text-green-700',
  }
  const ESTAT_LABEL: Record<string, string> = {
    esborrany: 'Esborrany',
    aprovada: 'Aprovada',
    pagada: 'Pagada',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Liquidacions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{liquidations.length} liquidacions</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <option value="">Tots els agents</option>
            {agents.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Nova liquidaci\u00f3
          </button>
        </div>
      </div>

      {/* Generate form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Generar liquidaci\u00f3</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Agent</label>
              <select value={formAgent} onChange={(e) => setFormAgent(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="">Selecciona...</option>
                {agents.map((a: any) => <option key={a.id} value={a.id}>{a.nombre} ({a.nif})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data inici</label>
              <input type="date" value={formInicio} onChange={(e) => setFormInicio(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data fi</label>
              <input type="date" value={formFin} onChange={(e) => setFormFin(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generateMut.mutate({ agentId: formAgent, inicio: formInicio, fin: formFin })}
              disabled={!formAgent || !formInicio || !formFin || generateMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Generar
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel\u00b7lar
            </button>
          </div>
        </div>
      )}

      {/* Detail view */}
      {detail && selectedId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div>
              <h2 className="font-semibold text-gray-900">{detail.agent?.nombre}</h2>
              <p className="text-xs text-gray-500">{fmtDate(detail.periodeInicio)} - {fmtDate(detail.periodeFin)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', ESTAT_STYLE[detail.estat])}>
                {ESTAT_LABEL[detail.estat]}
              </span>
              {detail.estat === 'esborrany' && (
                <button onClick={() => approveMut.mutate(selectedId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  <CheckCircle className="w-3.5 h-3.5" /> Aprovar i PDF
                </button>
              )}
              {detail.estat === 'aprovada' && (
                <>
                  <button onClick={() => downloadPdf(selectedId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
                    <Download className="w-3.5 h-3.5" /> Descarregar PDF
                  </button>
                  <button onClick={() => paidMut.mutate(selectedId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                    <CreditCard className="w-3.5 h-3.5" /> Marcar pagada
                  </button>
                </>
              )}
              {detail.estat === 'pagada' && (
                <button onClick={() => downloadPdf(selectedId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> Descarregar PDF
                </button>
              )}
              <button onClick={() => setSelectedId(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">Tancar</button>
            </div>
          </div>
          <div className="p-6">
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Companyia</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Producte</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Altes</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Import cobrat</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">% Comissi\u00f3</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {((detail.linies as any[]) ?? []).map((l: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-900">{l.company}</td>
                    <td className="px-3 py-2 text-gray-600">{l.producte}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.altes}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(l.importCobrat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.percentatge}%</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtMoney(l.comissio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total brut</span><span className="font-semibold">{fmtMoney(detail.totalBrut)}</span></div>
              {detail.retencioIrpf > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Retenci\u00f3 IRPF ({detail.agent?.irpfRetencio}%)</span><span className="text-red-600">-{fmtMoney(detail.retencioIrpf)}</span></div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-bold text-gray-900">Total net</span><span className="font-bold text-green-700 text-lg">{fmtMoney(detail.totalNet)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : liquidations.length === 0 ? (
        <div className="text-center py-20">
          <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap liquidaci\u00f3. Clica &quot;Nova liquidaci\u00f3&quot; per generar-ne una.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Per\u00edode</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total brut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">IRPF</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total net</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estat</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {liquidations.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedId(l.id)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.agent?.nombre}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(l.periodeInicio)} - {fmtDate(l.periodeFin)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(l.totalBrut)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-500">{l.retencioIrpf > 0 ? `-${fmtMoney(l.retencioIrpf)}` : '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{fmtMoney(l.totalNet)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', ESTAT_STYLE[l.estat])}>{ESTAT_LABEL[l.estat]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
