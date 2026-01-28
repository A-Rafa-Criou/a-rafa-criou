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
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: '#1a1a1a',
                color: '#00ff00',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                zIndex: 99999,
                border: '2px solid #00ff00',
                maxWidth: '300px',
            }}
        >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                🔍 Debug Afiliado
            </div>
            <div>URL param: {refParam || '❌ não encontrado'}</div>
            <div>Cookie: {cookieValue || '⏳ carregando...'}</div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
                {(refParam || cookieValue) ? '✅ Ref ativo - links sendo atualizados' : '❌ Nenhum ref ativo'}
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#00ff00' }}>
                {refParam && '🔗 Ref na URL'}
                {!refParam && cookieValue && '🍪 Ref do Cookie (será adicionado à URL)'}
            </div>
        </div>
    );
}
