'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AffiliateRedirectPage() {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/afiliados-da-rafa/dashboard');
            return;
        }

        // Redirecionar para o novo dashboard unificado
        router.push('/afiliados-da-rafa/dashboard');
    }, [status, router]);

    return (
        <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FED466] mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando...</p>
            </div>
        </div>
    );
}
