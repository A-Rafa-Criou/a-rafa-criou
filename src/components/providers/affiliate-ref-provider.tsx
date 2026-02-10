/**
 * Provider para propagar ref de afiliado automaticamente
 * 
 * Persistência dupla:
 * - SERVIDOR: middleware salva cookie httpOnly `affiliate_code` (30 dias) → checkout lê no server
 * - CLIENTE: este provider salva em localStorage → propaga ?ref= nos links do browser
 * 
 * PROTEGE áreas administrativas e sensíveis
 */
'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'affiliate_ref';

// Rotas onde o ref NÃO deve ser propagado
const PROTECTED_PATHS = [
    '/admin',
    '/api',
    '/auth',
    '/_next',
    '/dashboard-afiliado',
    '/seja-afiliado',
];

export function AffiliateRefProvider({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const urlRef = searchParams?.get('ref');
    const [storedRef, setStoredRef] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));

    // 1. Na montagem: ler de localStorage; se URL tem ?ref=, salvar/atualizar localStorage
    useEffect(() => {
        try {
            if (urlRef) {
                // URL tem ?ref= → salvar/atualizar no localStorage
                localStorage.setItem(STORAGE_KEY, urlRef);
                setStoredRef(urlRef);
            } else {
                // Sem ?ref= na URL → tentar ler do localStorage
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) setStoredRef(saved);
            }
        } catch {
            // localStorage indisponível (ex: iframe, modo privado)
        }
        setIsReady(true);
    }, [urlRef]);

    // O ref efetivo: URL tem prioridade, senão localStorage
    const refParam = urlRef || storedRef;

    // 2. Restaurar ?ref= na URL silenciosamente após navegação programática (router.push)
    useEffect(() => {
        if (!isReady || isProtectedRoute || !storedRef || urlRef) return;

        try {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('ref')) {
                url.searchParams.set('ref', storedRef);
                window.history.replaceState(window.history.state, '', url.toString());
            }
        } catch {
            // Ignorar erros
        }
    }, [storedRef, isReady, pathname, isProtectedRoute, urlRef]);

    // 3. Propagar ?ref= nos links da página
    useEffect(() => {
        if (!isReady || isProtectedRoute || !refParam) return;

        const processLink = (link: HTMLAnchorElement) => {
            const href = link.getAttribute('href');
            if (!href) return;

            if (
                href.includes('ref=') ||
                href.startsWith('http://') ||
                href.startsWith('https://') ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                href.startsWith('javascript:') ||
                link.hasAttribute('data-no-ref') ||
                PROTECTED_PATHS.some(path => href.startsWith(path))
            ) {
                return;
            }

            const separator = href.includes('?') ? '&' : '?';
            link.setAttribute('href', `${href}${separator}ref=${refParam}`);
            link.setAttribute('data-ref-processed', 'true');
        };

        const processAllLinks = () => {
            document.querySelectorAll<HTMLAnchorElement>('a:not([data-ref-processed])')
                .forEach(processLink);
        };

        processAllLinks();

        const observer = new MutationObserver(processAllLinks);
        observer.observe(document.body, { childList: true, subtree: true });

        const handleClick = (e: MouseEvent) => {
            const link = (e.target as HTMLElement).closest('a');
            if (link) processLink(link);
        };
        document.addEventListener('click', handleClick, true);

        return () => {
            observer.disconnect();
            document.removeEventListener('click', handleClick, true);
        };
    }, [refParam, isReady, pathname, isProtectedRoute]);

    return <>{children}</>;
}
