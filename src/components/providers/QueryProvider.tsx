'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Cache dados por 10 minutos
                        staleTime: 1000 * 60 * 10,
                        // Manter cache por 30 minutos
                        gcTime: 1000 * 60 * 30,
                        // Revalidar em background quando a janela volta ao foco
                        refetchOnWindowFocus: true,
                        // Não revalidar automaticamente ao montar
                        refetchOnMount: false,
                        // Retry em caso de erro
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
            )}
        </QueryClientProvider>
    );
}
