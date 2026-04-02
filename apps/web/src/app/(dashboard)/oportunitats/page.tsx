'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { TrendingUp, CheckCircle, AlertTriangle, Loader2, Zap, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const oportunityApi = {
  list: () => api.get('/oportunitats').then(r => r.data),
  updateEstat: (id: string, estat: string) => api.patch(`/oportunitats/${id}/estat`, { estat }).then(r => r.data),
  detectAll: () => api.post('/oportunitats/detect-all').then(r => r.data),
}

export default function OportunitatsPage() {
  const qc = useQueryClient()
  const [detecting, setDetecting] = useState(false)

  const { data: oportunitats = [], isLoading } = useQuery({
    queryKey: ['oportunitats'],
    queryFn: oportunityApi.list,
  })

  const estatMut = useMutation({
    mutationFn: ({ id, estat }: { id: string; estat: string }) => oportunityApi.updateEstat(id, estat),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunitats'] }); toast.success('Estat actualitzat') },
  })

  async function handleDetectAll() {
    setDetecting(true)
    try {
      const res = await oportunityApi.detectAll()
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['oportunitats'] })
    } catch {
      toast.error('Error detectant oportunitats')
    } finally {
      setDetecting(false)
    }
  }

  const pendents = oportunitats.filter((o: any) => o.estat === 'oportunitat')
  const revisar = oportunitats.filter((o: any) => o.estat === 'revisar')
  const gestionats = oportunitats.filter((o: any) => o.estat === 'gestionat')

  const totalSavings = pendents.reduce((acc: number, o: any) => acc + (o.estalviAnual ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Detector d&apos;Oportunitats</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendents.length} oportunitats actives &middot; {revisar.length} per revisar &middot; {gestionats.length} gestionades
          </p>
        </div>
        <button
          onClick={handleDetectAll}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {detecting ? 'Analitzant...' : 'Detectar oportunitats'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Estalvi potencial</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSavings.toFixed(0)} &euro;/any</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Oportunitats</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Per revisar</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{revisar.length}</p>
        </div>
      </div>

      {/* Llista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : oportunitats.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap oportunitat detectada. Puja tarifes i clica &quot;Detectar oportunitats&quot;.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nova Tarifa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Companyia</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Estalvi/any</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Estat</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {oportunitats.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{o.client?.name}</td>
                  <td className="px-4 py-3 text-gray-700">{o.tarifaNova?.nombre ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.tarifaNova?.company?.nombre ?? '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{o.estalviAnual?.toFixed(0)} &euro;</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium',
                      o.estat === 'oportunitat' ? 'bg-green-50 text-green-700' :
                      o.estat === 'revisar' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {o.estat === 'oportunitat' ? 'Oportunitat' : o.estat === 'revisar' ? 'Revisar' : 'Gestionat'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.estat !== 'gestionat' && (
                      <button
                        onClick={() => estatMut.mutate({ id: o.id, estat: 'gestionat' })}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Gestionat
                      </button>
                    )}
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
