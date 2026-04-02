// apps/web/src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Zap, Target, BarChart2,
  FileText, RefreshCw, CheckSquare, Settings, LogOut,
  Network, DollarSign, ChevronRight, Package,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn, initials } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',        label: 'Dashboard',        icon: LayoutDashboard, section: 'PRINCIPAL' },
  { href: '/clients',          label: 'Clients',          icon: Users            },
  { href: '/supplies',         label: 'Subministraments', icon: Zap              },
  { href: '/opportunities',    label: 'Oportunitats',     icon: Target           },
  { href: '/products',         label: 'Productes',        icon: Package,         section: 'COMERCIAL' },
  { href: '/protocols/upload', label: 'Protocols',         icon: FileText         },
  { href: '/oportunitats',     label: 'Detector',         icon: BarChart2        },
  { href: '/comparisons',      label: 'Comparatives',     icon: BarChart2        },
  { href: '/contracts',        label: 'Contractes',       icon: FileText         },
  { href: '/renewals',         label: 'Renovacions',      icon: RefreshCw        },
  { href: '/tasks',            label: 'Tasques',          icon: CheckSquare,     section: 'GESTI\u00d3'    },
  { href: '/team',             label: 'El meu equip',     icon: Network,         roles: ['admin', 'direction', 'collaborator'] },
  { href: '/commissions',      label: 'Comissions',       icon: DollarSign       },
  { href: '/liquidations',     label: 'Liquidacions',     icon: DollarSign,      roles: ['admin', 'direction'] },
  { href: '/facturas',         label: 'Factures',         icon: FileText,        section: 'FACTURACI\u00d3' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  let currentSection = ''

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0f172a] flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Assessoria 3.0</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {NAV.filter(item => !item.roles || item.roles.includes(user?.role ?? '')).map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const showSection = item.section && item.section !== currentSection
          if (showSection) currentSection = item.section!
          return (
            <div key={item.href}>
              {showSection && (
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 pt-4 pb-1.5">{item.section}</p>
              )}
              <Link href={item.href} className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                isActive ? 'bg-white/10 text-white border-l-2 border-blue-400 pl-[10px]' : 'text-white/50 hover:text-white hover:bg-white/5',
              )}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          )
        })}
      </nav>
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-1">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4" /> Configuraci\u00f3
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-all" onClick={logout}>
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{initials(user?.name)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-white/40 text-[10px] capitalize">{user?.role}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-white/30 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </aside>
  )
}
