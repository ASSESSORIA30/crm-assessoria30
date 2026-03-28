// apps/web/src/app/(dashboard)/layout.tsx
import { AuthGuard } from '@/components/layout/auth-guard'
import { Sidebar }   from '@/components/layout/sidebar'
import { Topbar }    from '@/components/layout/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
