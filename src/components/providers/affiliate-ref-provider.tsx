/**
 * Provider para propagar ref de afiliado automaticamente
 * Usa URL param OU cookie para manter o ref ativo
 * PROTEGE áreas administrativas e sensíveis
 */
'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    const [cookieRef, setCookieRef] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Verificar se está em rota protegida
    const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path));

    // Buscar ref do cookie
    useEffect(() => {
        const fetchCookieRef = async () => {
            try {
                const response = await fetch('/api/debug/affiliate-cookie');
                const data = await response.json();
                setCookieRef(data.affiliate_code || null);
            } catch (err) {
                console.error('[AffiliateRef] Erro ao buscar cookie:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCookieRef();
    }, []);

    // Usar ref da URL ou cookie
    const refParam = urlRef || cookieRef;

    useEffect(() => {
        // NÃO processar em rotas protegidas
        if (isProtectedRoute) {
            console.log('[AffiliateRef] Rota protegida - ref desabilitado:', pathname);
            return;
        }

        if (isLoading) return;

        if (!refParam) {
            console.log('[AffiliateRef] Nenhum ref encontrado (URL ou Cookie)');
            return;
        }

        console.log('[AffiliateRef] Ref ativo:', refParam, '(fonte:', urlRef ? 'URL' : 'Cookie', ')');

        // Função para processar um link
        const processLink = (link: HTMLAnchorElement) => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Pular se já tem ref, é externo, protegido ou especial
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

            // Adicionar ref
            const separator = href.includes('?') ? '&' : '?';
            const newHref = `${href}${separator}ref=${refParam}`;
            link.setAttribute('href', newHref);
            link.setAttribute('data-ref-processed', 'true');
        };

        // Processar todos os links existentes
        const processAllLinks = () => {
            const links = document.querySelectorAll('a:not([data-ref-processed])');
            console.log('[AffiliateRef] Processando', links.length, 'links');
            links.forEach((link) => processLink(link as HTMLAnchorElement));
        };

        // Processar links iniciais
        processAllLinks();

        // Observer para novos links (quando o React renderiza novos componentes)
        const observer = new MutationObserver(() => {
            processAllLinks();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Interceptar cliques para garantir
        const handleClick = (e: MouseEvent) => {
            const link = (e.target as HTMLElement).closest('a');
            if (link) {
                processLink(link);
            }
        };

        document.addEventListener('click', handleClick, true);

        // Se temos ref do cookie mas não da URL, adicionar à URL atual
        if (!urlRef && cookieRef) {
            const currentUrl = window.location.pathname + window.location.search;
            const separator = window.location.search ? '&' : '?';
            const newUrl = `${currentUrl}${separator}ref=${cookieRef}`;
            console.log('[AffiliateRef] Adicionando ref à URL:', newUrl);
            window.history.replaceState({}, '', newUrl);
        }

        return () => {
            observer.disconnect();
            document.removeEventListener('click', handleClick, true);
        };
    }, [refParam, urlRef, cookieRef, isLoading, pathname, isProtectedRoute]);

    return <>{children}</>;
}
