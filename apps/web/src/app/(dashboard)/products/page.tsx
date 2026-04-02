'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Upload, Loader2, Package, Filter, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProductsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [tipusFilter, setTipusFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: productsApi.companies,
  })

  const { data: tarifes = [], isLoading } = useQuery({
    queryKey: ['products', companyFilter, tipusFilter],
    queryFn: () => productsApi.list({
      ...(companyFilter && { companyId: companyFilter }),
      ...(tipusFilter && { tipus: tipusFilter }),
    }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Tarifa actualitzada'); setEditingId(null) },
    onError: () => toast.error('Error actualitzant'),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await productsApi.upload(file)
      toast.success(`${res.tarifes.length} tarifes extretes`)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['companies'] })
    } catch {
      toast.error('Error processant el fitxer')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function startEdit(t: any) {
    setEditingId(t.id)
    setEditValues({ preuKwh: t.preuKwh ?? '', preuKw: t.preuKw ?? '', peatge: t.peatge ?? '' })
  }

  function saveEdit(id: string) {
    updateMut.mutate({
      id,
      data: {
        preuKwh: editValues.preuKwh !== '' ? Number(editValues.preuKwh) : null,
        preuKw: editValues.preuKw !== '' ? Number(editValues.preuKw) : null,
        peatge: editValues.peatge !== '' ? Number(editValues.peatge) : null,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Productes i Tarifes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tarifes.length} tarifes registrades</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Processant...' : 'Pujar fitxer'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Totes les companyies</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.nombre} ({c._count?.tarifes})</option>
          ))}
        </select>
        <select
          value={tipusFilter}
          onChange={(e) => setTipusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Tots els tipus</option>
          <option value="llum">Llum</option>
          <option value="gas">Gas</option>
        </select>
      </div>

      {/* Taula */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : tarifes.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap tarifa trobada. Puja un PDF, imatge o Excel per extreure tarifes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Companyia</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tarifa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipus</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Preu kWh</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Preu kW</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Peatge</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Condicions</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tarifes.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.company?.nombre}</td>
                    <td className="px-4 py-3 text-gray-700">{t.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        t.tipus === 'llum' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                      )}>
                        {t.tipus === 'llum' ? 'Llum' : t.tipus === 'gas' ? 'Gas' : t.tipus ?? '-'}
                      </span>
                    </td>
                    {editingId === t.id ? (
                      <>
                        <td className="px-4 py-3 text-right">
                          <input type="number" step="any" value={editValues.preuKwh} onChange={(e) => setEditValues({ ...editValues, preuKwh: e.target.value })}
                            className="w-24 text-right text-sm border border-blue-300 rounded px-2 py-1 bg-blue-50" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" step="any" value={editValues.preuKw} onChange={(e) => setEditValues({ ...editValues, preuKw: e.target.value })}
                            className="w-24 text-right text-sm border border-blue-300 rounded px-2 py-1 bg-blue-50" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" step="any" value={editValues.peatge} onChange={(e) => setEditValues({ ...editValues, peatge: e.target.value })}
                            className="w-24 text-right text-sm border border-blue-300 rounded px-2 py-1 bg-blue-50" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{t.preuKwh != null ? `${t.preuKwh.toFixed(4)}` : '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{t.preuKw != null ? `${t.preuKw.toFixed(4)}` : '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{t.peatge != null ? `${t.peatge.toFixed(4)}` : '-'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate" title={t.condicions}>{t.condicions ?? '-'}</td>
                    <td className="px-4 py-3">
                      {editingId === t.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(t.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
