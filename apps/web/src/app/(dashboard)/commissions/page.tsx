'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, productsApi } from '@/lib/api'
import { toast } from 'sonner'
import { DollarSign, Plus, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const liqApi = {
  agents: () => api.get('/liquidations/agents').then(r => r.data),
  createAgent: (d: any) => api.post('/liquidations/agents', d).then(r => r.data),
  comissions: (agentId: string) => api.get(`/liquidations/agents/${agentId}/comissions`).then(r => r.data),
  addComission: (agentId: string, d: any) => api.post(`/liquidations/agents/${agentId}/comissions`, d).then(r => r.data),
}

export default function CommissionsPage() {
  const qc = useQueryClient()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [showComForm, setShowComForm] = useState(false)
  const [agentForm, setAgentForm] = useState({ nombre: '', nif: '', email: '', telefon: '', tipus: 'autonom', irpfRetencio: 15 })
  const [comForm, setComForm] = useState({ companyId: '', producte: '', percentatge: 0 })

  const { data: agents = [], isLoading } = useQuery({ queryKey: ['agents'], queryFn: liqApi.agents })
  const { data: comissions = [] } = useQuery({
    queryKey: ['agent-comissions', selectedAgent],
    queryFn: () => liqApi.comissions(selectedAgent!),
    enabled: !!selectedAgent,
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: productsApi.companies })

  const createAgentMut = useMutation({
    mutationFn: (d: any) => liqApi.createAgent(d),
    onSuccess: () => { toast.success('Agent creat'); qc.invalidateQueries({ queryKey: ['agents'] }); setShowAgentForm(false); setAgentForm({ nombre: '', nif: '', email: '', telefon: '', tipus: 'autonom', irpfRetencio: 15 }) },
    onError: () => toast.error('Error creant agent'),
  })

  const addComMut = useMutation({
    mutationFn: (d: any) => liqApi.addComission(selectedAgent!, d),
    onSuccess: () => { toast.success('Comissió afegida'); qc.invalidateQueries({ queryKey: ['agent-comissions', selectedAgent] }); setShowComForm(false); setComForm({ companyId: '', producte: '', percentatge: 0 }) },
    onError: () => toast.error('Error afegint comissió'),
  })

  const agent = agents.find((a: any) => a.id === selectedAgent)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Comissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{agents.length} agents registrats</p>
        </div>
        <button onClick={() => setShowAgentForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nou agent
        </button>
      </div>

      {/* New agent form */}
      {showAgentForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Nou agent</h2>
            <button onClick={() => setShowAgentForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom</label>
              <input value={agentForm.nombre} onChange={e => setAgentForm({ ...agentForm, nombre: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">NIF</label>
              <input value={agentForm.nif} onChange={e => setAgentForm({ ...agentForm, nif: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipus</label>
              <select value={agentForm.tipus} onChange={e => setAgentForm({ ...agentForm, tipus: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="autonom">Autònom</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telèfon</label>
              <input value={agentForm.telefon} onChange={e => setAgentForm({ ...agentForm, telefon: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            {agentForm.tipus === 'autonom' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">IRPF %</label>
                <input type="number" value={agentForm.irpfRetencio} onChange={e => setAgentForm({ ...agentForm, irpfRetencio: Number(e.target.value) })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            )}
            {agentForm.tipus === 'empresa' && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nom administrador</label>
                  <input placeholder="Nom i cognoms" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">NIF administrador</label>
                  <input placeholder="NIF personal" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </>
            )}
          </div>
          <button onClick={() => createAgentMut.mutate(agentForm)}
            disabled={!agentForm.nombre || !agentForm.nif || createAgentMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {createAgentMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear agent
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Agent list */}
        <div className="col-span-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : agents.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Cap agent. Crea&apos;n un primer.</p>
            </div>
          ) : (
            agents.map((a: any) => (
              <button key={a.id} onClick={() => { setSelectedAgent(a.id); setShowComForm(false) }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all',
                  selectedAgent === a.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'
                )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{a.nombre}</p>
                    <p className="text-xs text-gray-400">{a.nif} &middot; {a.tipus === 'autonom' ? 'Autònom' : 'Empresa'}</p>
                  </div>
                  <span className="text-xs text-gray-400">{a._count?.liquidations ?? 0} liq.</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Commission detail */}
        <div className="col-span-8">
          {selectedAgent && agent ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <h2 className="font-semibold text-gray-900">{agent.nombre}</h2>
                  <p className="text-xs text-gray-500">{agent.nif} &middot; IRPF: {agent.irpfRetencio}%</p>
                </div>
                <button onClick={() => setShowComForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  <Plus className="w-3.5 h-3.5" /> Afegir comissió
                </button>
              </div>

              {showComForm && (
                <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <select value={comForm.companyId} onChange={e => setComForm({ ...comForm, companyId: e.target.value })}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                      <option value="">Companyia...</option>
                      {companies.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input placeholder="Producte" value={comForm.producte} onChange={e => setComForm({ ...comForm, producte: e.target.value })}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2" />
                    <div className="flex gap-2">
                      <input type="number" placeholder="%" step="0.1" value={comForm.percentatge} onChange={e => setComForm({ ...comForm, percentatge: Number(e.target.value) })}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" />
                      <button onClick={() => addComMut.mutate(comForm)}
                        disabled={!comForm.companyId || addComMut.isPending}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                        Afegir
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6">
                {comissions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Cap comissió configurada per aquest agent.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Companyia</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Producte</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">%</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Actiu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comissions.map((c: any) => (
                        <tr key={c.id}>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{c.company?.nombre}</td>
                          <td className="px-3 py-2.5 text-gray-600">{c.producte ?? 'General'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-green-700">{c.percentatge}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn('w-2 h-2 rounded-full inline-block', c.actiu ? 'bg-green-500' : 'bg-gray-300')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
              <p className="text-sm text-gray-400">Selecciona un agent per veure les seves comissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
