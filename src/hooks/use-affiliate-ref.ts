/**
 * Hook para adicionar parâmetro ref nas URLs
 * Usa cookie quando ref não está na URL
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export function useAffiliateRef() {
  const searchParams = useSearchParams();
  const refParam = searchParams?.get('ref');

  return useMemo(() => {
    return {
      ref: refParam,
      /**
       * Adiciona ref a uma URL se disponível
       * @param url - URL original
       * @returns URL com ref adicionado
       */
      addRefToUrl: (url: string): string => {
        if (!refParam || url.includes('ref=')) {
          return url;
        }

        // Links externos ou âncoras - não adicionar ref
        if (
          url.startsWith('http') ||
          url.startsWith('#') ||
          url.startsWith('mailto:') ||
          url.startsWith('tel:')
        ) {
          return url;
        }

        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}ref=${refParam}`;
      },
    };
  }, [refParam]);
}
