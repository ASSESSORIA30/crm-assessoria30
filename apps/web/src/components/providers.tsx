// apps/web/src/components/providers.tsx
'use client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (n, err: any) => err?.response?.status >= 500 && n < 2,
      },
    },
  }))
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
