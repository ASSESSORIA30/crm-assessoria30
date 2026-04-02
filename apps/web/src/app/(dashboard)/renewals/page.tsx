'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  RefreshCw, MessageCircle, Mail, Loader2, CheckSquare,
  Calendar, ExternalLink, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const renewalsApi = {
  upcoming: (days = 7) => api.get('/renewals', { params: { days } }).then(r => r.data),
  whatsappLinks: (days = 7) => api.get('/renewals/whatsapp-links', { params: { days } }).then(r => r.data),
  sendEmails: (clientIds: string[]) => api.post('/renewals/send-emails', { clientIds }).then(r => r.data),
}

export default function RenewalsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [days, setDays] = useState(7)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['renewals', days],
    queryFn: () => renewalsApi.upcoming(days),
  })

  const emailMut = useMutation({
    mutationFn: (ids: string[]) => renewalsApi.sendEmails(ids),
    onSuccess: (res) => toast.success(`${res.sent} emails enviats correctament`),
    onError: () => toast.error('Error enviant emails'),
  })

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map((c: any) => c.id)))
    }
  }

  async function handleWhatsApp() {
    const links = await renewalsApi.whatsappLinks(days)
    const filtered = selected.size > 0
      ? links.filter((l: any) => selected.has(l.clientId))
      : links

    if (filtered.length === 0) {
      toast.error('Cap client amb telèfon seleccionat')
      return
    }

    if (filtered.length <= 5) {
      filtered.forEach((l: any) => window.open(l.url, '_blank'))
      toast.success(`${filtered.length} links oberts`)
    } else {
      const csv = ['Nom,Telèfon,URL,Missatge']
      filtered.forEach((l: any) => {
        csv.push(`"${l.name}","${l.phone}","${l.url}","${l.message.replace(/"/g, '""')}"`)
      })
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `whatsapp-renovacions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`CSV generat amb ${filtered.length} contactes`)
    }
  }

  function handleEmail() {
    const ids = selected.size > 0
      ? Array.from(selected)
      : clients.filter((c: any) => c.email).map((c: any) => c.id)

    if (ids.length === 0) {
      toast.error('Cap client amb email seleccionat')
      return
    }
    emailMut.mutate(ids)
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ca-ES') : '-'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Renovacions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clients.length} clients amb renovació en els propers {days} dies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value={1}>Avui</option>
            <option value={7}>7 dies</option>
            <option value={14}>14 dies</option>
            <option value={30}>30 dies</option>
          </select>
        </div>
      </div>

      {/* Accions massives */}
      {clients.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm text-gray-600">
            {selected.size > 0 ? `${selected.size} seleccionats` : 'Tots els clients'}
          </span>
          <div className="flex-1" />
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {selected.size > 5 || (selected.size === 0 && clients.length > 5)
              ? 'Exportar CSV WhatsApp'
              : 'Enviar WhatsApp'}
          </button>
          <button
            onClick={handleEmail}
            disabled={emailMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {emailMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enviar Email
          </button>
        </div>
      )}

      {/* Taula */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap client amb renovació en els propers {days} dies.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === clients.length && clients.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Telèfon</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data renovació</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tarifa actual</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proveïdor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c: any) => {
                const supply = c.supplies?.[0]
                const daysUntil = c.dataRenovacio
                  ? Math.ceil((new Date(c.dataRenovacio).getTime() - Date.now()) / 86400000)
                  : null

                return (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.email ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium',
                          daysUntil != null && daysUntil <= 0 ? 'text-red-600' :
                          daysUntil != null && daysUntil <= 3 ? 'text-amber-600' : 'text-gray-700'
                        )}>
                          {fmt(c.dataRenovacio)}
                        </span>
                        {daysUntil != null && daysUntil <= 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">AVUI</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{supply?.tariff ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{supply?.currentSupplier ?? '-'}</td>
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
