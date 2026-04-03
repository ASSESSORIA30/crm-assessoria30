'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { suppliesApi, clientsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Zap } from 'lucide-react'

export default function NewSupplyPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    clientId: '',
    cups: '',
    type: 'electric' as 'electric' | 'gas',
    currentSupplier: '',
    tariff: '',
    distributor: '',
    powerP1: '',
    powerP2: '',
    powerP3: '',
    annualConsumption: '',
    addressStreet: '',
    addressCity: '',
    addressProvince: '',
    addressZip: '',
  })

  const { data: clientsRes } = useQuery({
    queryKey: ['clients-for-supply'],
    queryFn: () => clientsApi.list({ limit: 500 }),
  })
  const clients = clientsRes?.data ?? (Array.isArray(clientsRes) ? clientsRes : [])

  const createMut = useMutation({
    mutationFn: (data: any) => suppliesApi.create(data),
    onSuccess: () => {
      toast.success('Subministrament creat correctament')
      router.push('/supplies')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message
      if (Array.isArray(msg)) {
        toast.error(msg.join(', '))
      } else {
        toast.error(msg ?? 'Error creant subministrament')
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId) { toast.error('Selecciona un client'); return }
    if (!form.cups) { toast.error('El CUPS és obligatori'); return }

    createMut.mutate({
      clientId: form.clientId,
      cups: form.cups.trim(),
      type: form.type,
      status: 'active',
      currentSupplier: form.currentSupplier || undefined,
      tariff: form.tariff || undefined,
      distributor: form.distributor || undefined,
      powerP1: form.powerP1 ? Number(form.powerP1) : undefined,
      powerP2: form.powerP2 ? Number(form.powerP2) : undefined,
      powerP3: form.powerP3 ? Number(form.powerP3) : undefined,
      annualConsumption: form.annualConsumption ? Number(form.annualConsumption) : undefined,
      addressStreet: form.addressStreet || undefined,
      addressCity: form.addressCity || undefined,
      addressProvince: form.addressProvince || undefined,
      addressZip: form.addressZip || undefined,
    })
  }

  const f = (k: string, v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nou subministrament</h1>
          <p className="text-sm text-gray-500 mt-0.5">Afegeix un punt de subministrament (CUPS)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Client + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Client *</label>
            <select value={form.clientId} onChange={e => f('clientId', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Selecciona un client...</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} {c.taxId ? `(${c.taxId})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipus *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => f('type', 'electric')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${form.type === 'electric' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                ⚡ Electricitat
              </button>
              <button type="button" onClick={() => f('type', 'gas')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${form.type === 'gas' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                🔥 Gas
              </button>
            </div>
          </div>
        </div>

        {/* CUPS */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">CUPS *</label>
          <input value={form.cups} onChange={e => f('cups', e.target.value)}
            placeholder="ES0000000000000000XX" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono" />
        </div>

        {/* Supplier + Tariff */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Comercialitzadora</label>
            <input value={form.currentSupplier} onChange={e => f('currentSupplier', e.target.value)}
              placeholder="Iberdrola, Endesa..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tarifa</label>
            <input value={form.tariff} onChange={e => f('tariff', e.target.value)}
              placeholder="2.0TD, 3.0TD, RL1..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Distribuïdora</label>
            <input value={form.distributor} onChange={e => f('distributor', e.target.value)}
              placeholder="e-distribución..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
        </div>

        {/* Power + Consumption */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Potència P1 (kW)</label>
            <input type="number" step="any" value={form.powerP1} onChange={e => f('powerP1', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Potència P2 (kW)</label>
            <input type="number" step="any" value={form.powerP2} onChange={e => f('powerP2', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Potència P3 (kW)</label>
            <input type="number" step="any" value={form.powerP3} onChange={e => f('powerP3', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Consum anual (kWh)</label>
            <input type="number" step="any" value={form.annualConsumption} onChange={e => f('annualConsumption', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-right" />
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Adreça</label>
            <input value={form.addressStreet} onChange={e => f('addressStreet', e.target.value)}
              placeholder="Carrer, número..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ciutat</label>
            <input value={form.addressCity} onChange={e => f('addressCity', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">CP</label>
            <input value={form.addressZip} onChange={e => f('addressZip', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={createMut.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Crear subministrament
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel·lar
          </button>
        </div>
      </form>
    </div>
  )
}
