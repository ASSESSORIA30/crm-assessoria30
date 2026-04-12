'use client'
import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Upload, Loader2, Package, ChevronDown, ChevronRight,
  Pencil, Trash2, ImagePlus, Search, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ tariff, onClose, onSave, saving }: {
  tariff: any; onClose: () => void; onSave: (data: any) => void; saving: boolean
}) {
  const isGas = /gas/i.test(tariff.serviceType ?? '')
  const [form, setForm] = useState({
    productName:    tariff.productName    ?? '',
    tariffType:     tariff.tariffType     ?? '',
    priceType:      tariff.priceType      ?? '',
    excedentes:     tariff.excedentes     ?? '',
    residential:    tariff.residential    ?? false,
    pyme:           tariff.pyme           ?? false,
    powerPriceP1:   tariff.powerPriceP1   ?? '',
    powerPriceP2:   tariff.powerPriceP2   ?? '',
    powerPriceP3:   tariff.powerPriceP3   ?? '',
    powerPriceP4:   tariff.powerPriceP4   ?? '',
    powerPriceP5:   tariff.powerPriceP5   ?? '',
    powerPriceP6:   tariff.powerPriceP6   ?? '',
    energyPriceP1:  tariff.energyPriceP1  ?? '',
    energyPriceP2:  tariff.energyPriceP2  ?? '',
    energyPriceP3:  tariff.energyPriceP3  ?? '',
    energyPriceP4:  tariff.energyPriceP4  ?? '',
    energyPriceP5:  tariff.energyPriceP5  ?? '',
    energyPriceP6:  tariff.energyPriceP6  ?? '',
  })

  function set(key: string, value: any) { setForm(f => ({ ...f, [key]: value })) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editar tarifa</h2>
            <p className="text-sm text-gray-400 mt-0.5">{tariff.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom del producte</label>
              <input value={form.productName} onChange={e => set('productName', e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tarifa (p. ex. 2.0TD)</label>
              <input value={form.tariffType} onChange={e => set('tariffType', e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipus preu</label>
              <input value={form.priceType} onChange={e => set('priceType', e.target.value)} className="input" placeholder="Fix / Indexat" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Excedents</label>
              <input value={form.excedentes} onChange={e => set('excedentes', e.target.value)} className="input" placeholder="Sí / No / Compensació" />
            </div>
          </div>

          {/* Power prices (electricity only) */}
          {!isGas && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preus potència (€/kW·any)</p>
              <div className="grid grid-cols-6 gap-2">
                {['P1','P2','P3','P4','P5','P6'].map(p => (
                  <div key={p}>
                    <label className="text-[10px] text-gray-400 mb-0.5 block text-center">{p}</label>
                    <input
                      type="number" step="0.000001"
                      value={(form as any)[`powerPrice${p}`]}
                      onChange={e => set(`powerPrice${p}`, e.target.value)}
                      className="input text-xs py-1.5 px-2 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Energy prices */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preus energia (€/kWh)</p>
            <div className="grid grid-cols-6 gap-2">
              {['P1','P2','P3','P4','P5','P6'].map(p => (
                <div key={p}>
                  <label className="text-[10px] text-gray-400 mb-0.5 block text-center">{p}</label>
                  <input
                    type="number" step="0.000001"
                    value={(form as any)[`energyPrice${p}`]}
                    onChange={e => set(`energyPrice${p}`, e.target.value)}
                    className="input text-xs py-1.5 px-2 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Booleans */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.residential}
                onChange={e => set('residential', e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Residencial</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.pyme}
                onChange={e => set('pyme', e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Pime</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel·lar</button>
          <button onClick={() => onSave(form)} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Desar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const logoRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [serviceFilter, setServiceFilter] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [editingTariff, setEditingTariff] = useState<any | null>(null)

  const { data: logos = [] } = useQuery({
    queryKey: ['company-logos'],
    queryFn:  productsApi.companyLogos,
  })

  const { data: tariffs = [], isLoading } = useQuery({
    queryKey: ['products', serviceFilter],
    queryFn:  () => productsApi.list(serviceFilter ? { serviceType: serviceFilter } : undefined),
  })

  const logoMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const l of logos as any[]) if (l.logoData) m[l.company] = l.logoData
    return m
  }, [logos])

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const t of tariffs as any[]) {
      const co = t.company ?? '(sense empresa)'
      if (!map[co]) map[co] = []
      map[co].push(t)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [tariffs])

  const filteredGrouped = useMemo(() => {
    if (!productSearch) return grouped
    const q = productSearch.toLowerCase()
    return grouped
      .map(([co, ts]) => [co, ts.filter((t: any) =>
        (t.productName ?? '').toLowerCase().includes(q) ||
        (t.tariffType ?? '').toLowerCase().includes(q),
      )] as [string, any[]])
      .filter(([, ts]) => ts.length > 0)
  }, [grouped, productSearch])

  function toggleCompany(co: string) {
    setOpenCompanies(prev => {
      const next = new Set(prev)
      if (next.has(co)) next.delete(co); else next.add(co)
      return next
    })
  }

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
      toast[res.errors > 0 ? 'warning' : 'success'](parts.join(' · ') || 'Cap producte processat')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['tariff-companies'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error processant el fitxer')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleLogoUpload(company: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await productsApi.uploadLogo(company, file)
      toast.success('Logo actualitzat')
      qc.invalidateQueries({ queryKey: ['company-logos'] })
    } catch {
      toast.error('Error pujant el logo')
    } finally {
      const ref = logoRefs.current[company]
      if (ref) ref.value = ''
    }
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Tarifa eliminada') },
    onError:   () => toast.error('Error eliminant la tarifa'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Tarifa actualitzada')
      setEditingTariff(null)
    },
    onError: () => toast.error('Error actualitzant la tarifa'),
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminar la tarifa "${name}"?`)) return
    deleteMut.mutate(id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Productes i Tarifes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(tariffs as any[]).length} tarifes · {grouped.length} companyies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Processant...' : 'Pujar Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Cercar producte o tarifa..."
            className="input pl-9"
          />
        </div>
        {(['', 'Electricidad', 'Gas'] as const).map(s => (
          <button
            key={s}
            onClick={() => setServiceFilter(s)}
            className={cn(
              'px-3 py-2 text-sm rounded-xl border transition-all',
              serviceFilter === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            )}
          >
            {s === '' ? 'Tots' : s === 'Electricidad' ? '⚡ Electricitat' : '🔥 Gas'}
          </button>
        ))}
      </div>

      {/* Accordion */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : filteredGrouped.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap tarifa trobada. Puja un Excel per importar productes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGrouped.map(([company, companyTariffs]) => {
            const isOpen = openCompanies.has(company)
            const logo   = logoMap[company]
            return (
              <div key={company} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Company header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => toggleCompany(company)}
                >
                  {/* Logo with upload button */}
                  <div className="relative group/logo flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={company}
                        className="w-9 h-9 rounded-lg object-contain border border-gray-100 bg-gray-50"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">
                        {company.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => logoRefs.current[company]?.click()}
                      className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 opacity-0 group-hover/logo:opacity-100 transition-opacity shadow-sm hover:border-blue-300"
                      title="Canviar logo"
                    >
                      <ImagePlus className="w-2.5 h-2.5 text-gray-500" />
                    </button>
                    <input
                      ref={el => { logoRefs.current[company] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleLogoUpload(company, e)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{company}</p>
                  </div>

                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full flex-shrink-0">
                    {companyTariffs.length} tarifes
                  </span>
                  {isOpen
                    ? <ChevronDown  className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </div>

                {/* Tariff table (expanded) */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Producte</th>
                            <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Servei</th>
                            <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tarifa</th>
                            <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pot. P1</th>
                            <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">En. P1</th>
                            <th className="text-center px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Res.</th>
                            <th className="text-center px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pime</th>
                            <th className="px-3 py-2.5 w-16" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {companyTariffs.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50/60 group/row">
                              <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{t.productName ?? '—'}</td>
                              <td className="px-3 py-2.5">
                                {t.serviceType ? (
                                  <span className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                    /gas/i.test(t.serviceType)
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-amber-50 text-amber-700',
                                  )}>
                                    {/gas/i.test(t.serviceType) ? '🔥 Gas' : '⚡ Llum'}
                                  </span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-gray-500 text-xs">{t.tariffType ?? '—'}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-xs text-gray-600">
                                {t.powerPriceP1 != null ? t.powerPriceP1.toFixed(6) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-xs text-gray-600">
                                {t.energyPriceP1 != null ? t.energyPriceP1.toFixed(6) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn('w-2 h-2 rounded-full inline-block',
                                  t.residential === true ? 'bg-green-500' : 'bg-gray-200')} />
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn('w-2 h-2 rounded-full inline-block',
                                  t.pyme === true ? 'bg-green-500' : 'bg-gray-200')} />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity justify-end">
                                  <button
                                    onClick={() => setEditingTariff(t)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(t.id, t.productName ?? t.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTariff && (
        <EditModal
          tariff={editingTariff}
          saving={updateMut.isPending}
          onClose={() => setEditingTariff(null)}
          onSave={data => updateMut.mutate({ id: editingTariff.id, data })}
        />
      )}
    </div>
  )
}
