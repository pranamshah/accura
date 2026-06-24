'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } }));
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster position="top-right" theme="dark" toastOptions={{ style: { background: '#0d1117', border: '1px solid #2a2a4a', color: '#e8e8e8', fontFamily: 'Courier New, monospace', fontSize: '12px' } }} />
    </QueryClientProvider>
  );
}
