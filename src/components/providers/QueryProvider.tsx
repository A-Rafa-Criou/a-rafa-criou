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
                        // 🚀 OTIMIZAÇÃO PARA ALTA CONCORRÊNCIA:
                        // Cache dados por 5 minutos (produtos não mudam tanto)
                        staleTime: 1000 * 60 * 5,
                        // Manter cache por 15 minutos (dados ainda úteis após stale)
                        gcTime: 1000 * 60 * 15,
                        // ❌ NÃO revalidar em background (evita requests desnecessários)
                        refetchOnWindowFocus: false,
                        // ❌ NÃO revalidar ao montar se dados existem
                        refetchOnMount: false,
                        // ❌ NÃO revalidar ao reconectar (esperar staleTime expirar)
                        refetchOnReconnect: false,
                        // Retry apenas 1x em caso de erro (não bombardear servidor)
                        retry: 1,
                        retryDelay: 1000, // 1 segundo entre retries
                    },
                    mutations: {
                        // Mutations (POST/PUT/DELETE) também com retry limitado
                        retry: 1,
                        retryDelay: 1000,
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
