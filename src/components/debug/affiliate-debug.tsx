/**
 * Componente de debug para mostrar status do afiliado
 * Remover em produção
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AffiliateDebug() {
    const searchParams = useSearchParams();
    const refParam = searchParams?.get('ref');
    const [cookieValue, setCookieValue] = useState<string | null>(null);

    useEffect(() => {
        // Ler cookie (só funciona se não for httpOnly, mas serve para debug)
        const checkCookie = async () => {
            try {
                const response = await fetch('/api/debug/affiliate-cookie');
                const data = await response.json();
                setCookieValue(data.affiliate_code || null);
            } catch (err) {
                console.error('Erro ao verificar cookie:', err);
            }
        };

        checkCookie();
    }, [refParam]);

    if (!refParam && !cookieValue) return null;

    return (
        <div className="fixed bottom-5 right-5 bg-[#1a1a1a] text-[#00ff00] p-3 px-4 rounded-lg text-xs font-mono z-99999 border-2 border-[#00ff00] max-w-75">
            <div className="font-bold mb-2 text-white">
                🔍 Debug Afiliado
            </div>
            <div>URL param: {refParam || '❌ não encontrado'}</div>
            <div>Cookie: {cookieValue || '⏳ carregando...'}</div>
            <div className="mt-2 text-[10px] text-[#888]">
                {(refParam || cookieValue) ? '✅ Ref ativo - links sendo atualizados' : '❌ Nenhum ref ativo'}
            </div>
            <div className="mt-1 text-[10px] text-[#00ff00]">
                {refParam && '🔗 Ref na URL'}
                {!refParam && cookieValue && '🍪 Ref do Cookie (será adicionado à URL)'}
            </div>
        </div>
    );
}
