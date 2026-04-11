'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, FileText, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  active: 'Actiu', in_renewal: 'En renovació', cancelled: 'Cancel·lat', pending: 'Pendent',
}
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_renewal: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
}
const TYPE_LABEL: Record<string, string> = {
  electric: 'Elèctric', gas: 'Gas', telecom: 'Telecom', alarm: 'Alarma', insurance: 'Assegurança',
}

function daysUntil(date?: string | null) {
  if (!date) return null
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  return diff
}

export default function ContractsPage() {
  const [status, setStatus] = useState('')
  const [type,   setType]   = useState('')

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', status, type],
    queryFn: () =>
      api.get('/contracts', { params: { ...(status && { status }), ...(type && { type }) } })
         .then(r => r.data),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contractes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contracts.length} contractes</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="">Tots els estats</option>
          <option value="active">Actiu</option>
          <option value="in_renewal">En renovació</option>
          <option value="pending">Pendent</option>
          <option value="cancelled">Cancel·lat</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="">Tots els tipus</option>
          <option value="electric">Elèctric</option>
          <option value="gas">Gas</option>
          <option value="telecom">Telecom</option>
          <option value="alarm">Alarma</option>
          <option value="insurance">Assegurança</option>
        </select>
      </div>

      {/* Taula */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap contracte trobat.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">CUPS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipus</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proveïdor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Inici</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fi</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estat</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Dies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((c: any) => {
                  const days = daysUntil(c.contractEndDate)
                  const urgent = days != null && days <= 30
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {c.client?.name ?? '—'}
                        {c.client?.taxId && (
                          <span className="ml-1 text-xs text-gray-400">{c.client.taxId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cups ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[c.type] ?? c.type}</td>
                      <td className="px-4 py-3 text-gray-600">{c.currentSupplier ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.contractStartDate ? new Date(c.contractStartDate).toLocaleDateString('ca') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.contractEndDate ? new Date(c.contractEndDate).toLocaleDateString('ca') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-500')}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {days != null ? (
                          <span className={cn('text-xs font-semibold flex items-center justify-end gap-1',
                            urgent ? 'text-red-600' : 'text-gray-500')}>
                            {urgent && <AlertTriangle className="w-3 h-3" />}
                            {days}d
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
