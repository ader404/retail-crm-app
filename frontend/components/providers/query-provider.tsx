'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute - data stays fresh
        gcTime: 5 * 60 * 1000, // 5 minutes - keep unused data in cache
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: 1, // Only retry once on failure
      },
    },
  }))

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
