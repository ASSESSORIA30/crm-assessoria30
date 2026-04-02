'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Network, Loader2 } from 'lucide-react'
import { cn, initials } from '@/lib/utils'

export default function TeamPage() {
  const { data: team = [], isLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/my-team').then(r => r.data),
  })

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700',
    direction: 'bg-purple-50 text-purple-700',
    collaborator: 'bg-blue-50 text-blue-700',
    commercial: 'bg-green-50 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">El meu equip</h1>
        <p className="text-sm text-gray-500 mt-0.5">{team.length} membres</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : team.length === 0 ? (
        <div className="text-center py-20">
          <Network className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cap membre a l&apos;equip.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((m: any) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', roleColors[m.role] ?? 'bg-gray-100 text-gray-600')}>
                  {m.role}
                </span>
                {m.phone && <span className="text-xs text-gray-400">{m.phone}</span>}
              </div>
              {m.commissionPct != null && (
                <p className="text-xs text-gray-400 mt-2">Comissió: {m.commissionPct}% · Objectiu: {m.monthlyTarget ?? '-'}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
