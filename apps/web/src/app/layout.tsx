// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { Toaster }   from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'CRM Assessoria 3.0', template: '%s | CRM' },
  description: 'CRM energètic per a Assessoria 3.0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors expand />
        </Providers>
      </body>
    </html>
  )
}
