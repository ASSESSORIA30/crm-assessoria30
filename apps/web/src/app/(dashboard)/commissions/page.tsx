'use client'
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  'Fijo':              'Fix',
  'Consumo':           'Consum',
  'Potencia':          'Potència',
  'Consumo y potencia': 'Consum i potència',
}

export default function CommissionsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [rulesType, setRulesType] = useState('')

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['commission-rules', rulesType],
    queryFn: () => api.get('/commissions/rules', { params: rulesType ? { type: rulesType } : {} }).then(r => r.data),
  })

  const ruleTypes = Array.from(new Set(rules.map((r: any) => r.type))) as string[]

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/commissions/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${res.imported} regles importades (tipus: ${res.type})`)
        qc.invalidateQueries({ queryKey: ['commission-rules'] })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error processant el fitxer')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Comissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Regles de comissió — ZocoComisiones V1.0</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Processant...' : 'Pujar plantilla Excel'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={rulesType}
          onChange={e => setRulesType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Tots els tipus</option>
          {['Fijo', 'Consumo', 'Potencia', 'Consumo y potencia'].map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{rules.length} regles carregades</span>
      </div>

      {/* Rules table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <FileSpreadsheet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap regla carregada. Puja la plantilla ZocoComisiones V1.0.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(ruleTypes.length > 0 ? ruleTypes : [rulesType]).map(t => {
            const typeRules = rules.filter((r: any) => r.type === t)
            if (typeRules.length === 0) return null
            return (
              <div key={t} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">{TYPE_LABELS[t] ?? t}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Consum mín (kWh)</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Consum màx (kWh)</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Potència mín (kW)</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Potència màx (kW)</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Comissió (€)</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">×MWh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {typeRules.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.consumoMin ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.consumoMax ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.potenciaMin ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.potenciaMax ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-green-700">
                            {r.comision?.toFixed(2)} €
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('w-2 h-2 rounded-full inline-block',
                              r.multiplicar ? 'bg-green-500' : 'bg-gray-300')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
