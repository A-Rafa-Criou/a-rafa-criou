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
            router.push('/auth/login?callbackUrl=/afiliado');
            return;
        }

        // Verificar tipo de afiliado e redirecionar
        const checkAffiliateType = async () => {
            try {
                const response = await fetch('/api/user/affiliate-status');
                const data = await response.json();

                if (!data.isAffiliate) {
                    router.push('/seja-afiliado');
                    return;
                }

                // Redirecionar baseado no tipo
                if (data.affiliateType === 'commercial_license') {
                    router.push('/afiliado-comercial');
                } else {
                    router.push('/afiliado-comum');
                }
            } catch (error) {
                console.error('Erro ao verificar tipo de afiliado:', error);
                router.push('/');
            }
        };

        checkAffiliateType();
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
