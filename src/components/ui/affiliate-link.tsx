/**
 * Link Component com propagação automática de parâmetros de afiliado
 * Mantém ?ref= em todas as navegações do site
 */
'use client';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { forwardRef } from 'react';

interface AffiliateLinkProps extends React.ComponentPropsWithoutRef<typeof NextLink> {
    href: string | { pathname: string; query?: Record<string, string> };
    preserveRef?: boolean; // Default: true
}

export const AffiliateLink = forwardRef<HTMLAnchorElement, AffiliateLinkProps>(
    ({ href, preserveRef = true, ...props }, ref) => {
        const searchParams = useSearchParams();
        const refParam = searchParams?.get('ref');

        // Se não tiver ref ou preserveRef for false, retornar link normal
        if (!refParam || !preserveRef) {
            return <NextLink ref={ref} href={href} {...props} />;
        }

        // Adicionar ref ao href
        let finalHref: string;

        if (typeof href === 'string') {
            // String simples: adicionar ?ref= ou &ref=
            const separator = href.includes('?') ? '&' : '?';

            // Não adicionar se já tiver ref na URL
            if (href.includes('ref=')) {
                finalHref = href;
            } else {
                finalHref = `${href}${separator}ref=${refParam}`;
            }
        } else {
            // Objeto: adicionar ao query
            finalHref = {
                ...href,
                query: {
                    ...href.query,
                    ref: refParam,
                },
            } as any;
        }

        return <NextLink ref={ref} href={finalHref} {...props} />;
    }
);

AffiliateLink.displayName = 'AffiliateLink';

export default AffiliateLink;
