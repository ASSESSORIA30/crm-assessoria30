'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckSquare, Loader2 } from 'lucide-react'

export default function TasksPage() {
  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/opportunities', { params: { stage: 'contacted,comparison,presented,negotiation' } }).then(r => r.data?.data ?? r.data ?? []),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tasques</h1>
        <p className="text-sm text-gray-500 mt-0.5">Oportunitats pendents de gestió</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (Array.isArray(opps) ? opps : []).length === 0 ? (
        <div className="text-center py-20">
          <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap tasca pendent.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Títol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estat</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Següent acció</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(Array.isArray(opps) ? opps : []).map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{o.title}</td>
                  <td className="px-4 py-3 text-gray-600">{o.client?.name ?? '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{o.stage}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.nextActionAt ? new Date(o.nextActionAt).toLocaleDateString('ca-ES') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
