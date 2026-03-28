// apps/web/src/components/layout/topbar.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'

const LABELS: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/clients':       'Clients',
  '/supplies':      'Subministraments',
  '/opportunities': 'Oportunitats',
  '/comparisons':   'Comparatives',
  '/contracts':     'Contractes',
  '/renewals':      'Renovacions',
  '/tasks':         'Tasques',
  '/team':          'El meu equip',
  '/commissions':   'Comissions',
  '/settings':      'Configuració',
}

export function Topbar() {
  const pathname = usePathname()
  const parts    = pathname.split('/').filter(Boolean)
  const base     = '/' + (parts[0] ?? '')
  const label    = LABELS[base] ?? ''
  const sub      = parts[1] ? decodeURIComponent(parts[1]) : null

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
        <span className="font-semibold text-gray-900">{label}</span>
        {sub && <><span className="text-gray-300">/</span><span className="text-gray-500 truncate">{sub}</span></>}
      </div>
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
