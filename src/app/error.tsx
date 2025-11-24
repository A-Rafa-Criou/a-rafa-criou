'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export const metadata = {
    title: 'Erro | A Rafa Criou',
    description: 'Desculpe! Ocorreu um erro ao carregar esta página. Volte para a página inicial ou tente novamente mais tarde.'
};

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('App error captured:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4] text-gray-900">
            <main role="main" className="max-w-xl text-center p-8">
                <h1 className="text-3xl font-bold mb-4">Ops! Algo deu errado</h1>
                <p className="mb-6">Desculpe, não conseguimos carregar esta página. Você pode voltar para a página inicial e tentar novamente.</p>
                <div className="flex gap-3 justify-center">
                    <Link href="/" className="px-4 py-2 bg-primary text-white rounded">Início</Link>
                    <button className="px-4 py-2 bg-white border rounded" onClick={() => reset()}>Tentar novamente</button>
                </div>
            </main>
        </div>
    );
}
