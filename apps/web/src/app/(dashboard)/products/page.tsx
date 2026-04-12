'use client'
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Upload, Loader2, Package, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProductsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: companies = [] } = useQuery({
    queryKey: ['tariff-companies'],
    queryFn: productsApi.companies,
  })

  const { data: tariffs = [], isLoading } = useQuery({
    queryKey: ['products', companyFilter, serviceFilter],
    queryFn: () => productsApi.list({
      ...(companyFilter && { company: companyFilter }),
      ...(serviceFilter && { serviceType: serviceFilter }),
    }),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await productsApi.upload(file)
      const parts = []
      if (res.imported > 0) parts.push(`${res.imported} importats`)
      if (res.updated  > 0) parts.push(`${res.updated} actualitzats`)
      if (res.errors   > 0) parts.push(`${res.errors} errors`)
      const msg = parts.length > 0 ? parts.join(' · ') : 'Cap producte processat'
      if (res.errors > 0) {
        toast.warning(msg)
        if (res.errorList?.length) console.warn('Errors:', res.errorList)
      } else {
        toast.success(msg)
      }
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['tariff-companies'] })
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
          <h1 className="text-xl font-semibold text-gray-900">Productes i Tarifes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tariffs.length} tarifes registrades</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
          />
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
            <option key={c.company} value={c.company}>{c.company} ({c.count})</option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Tots els serveis</option>
          <option value="Electricidad">Electricitat</option>
          <option value="Gas">Gas</option>
        </select>
      </div>

      {/* Taula */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : tariffs.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap tarifa trobada. Puja un Excel per importar productes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Companyia</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Producte</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Servei</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tarifa</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Potència P1</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Energia P1</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Residencial</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Pime</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipus preu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tariffs.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.company}</td>
                    <td className="px-4 py-3 text-gray-700">{t.productName}</td>
                    <td className="px-4 py-3">
                      {t.serviceType ? (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          /gas/i.test(t.serviceType) ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
                        )}>
                          {t.serviceType}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.tariffType || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {t.powerPriceP1 != null ? t.powerPriceP1.toFixed(6) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {t.energyPriceP1 != null ? t.energyPriceP1.toFixed(6) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('w-2 h-2 rounded-full inline-block',
                        t.residential === true ? 'bg-green-500' : t.residential === false ? 'bg-gray-200' : 'bg-gray-100')} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('w-2 h-2 rounded-full inline-block',
                        t.pyme === true ? 'bg-green-500' : t.pyme === false ? 'bg-gray-200' : 'bg-gray-100')} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.priceType || '—'}</td>
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
