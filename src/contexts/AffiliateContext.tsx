'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AffiliateStatus {
    isAffiliate: boolean;
    status: string | null;
    isActive: boolean;
    code?: string;
}

interface AffiliateContextType extends AffiliateStatus {
    isLoading: boolean;
    refetch: () => Promise<void>;
}

const AffiliateContext = createContext<AffiliateContextType | undefined>(undefined);

export function AffiliateProvider({ children }: { children: ReactNode }) {
    const { data: session, status: sessionStatus } = useSession();
    const [affiliateStatus, setAffiliateStatus] = useState<AffiliateStatus>({
        isAffiliate: false,
        status: null,
        isActive: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [lastFetch, setLastFetch] = useState<number>(0);

    const fetchAffiliateStatus = async () => {
        // Cache por 5 minutos
        const now = Date.now();
        if (now - lastFetch < 5 * 60 * 1000 && !isLoading) {
            return;
        }

        if (sessionStatus === 'authenticated' && session?.user) {
            try {
                const response = await fetch('/api/user/affiliate-status');
                const data = await response.json();
                setAffiliateStatus(data);
                setLastFetch(now);
            } catch (error) {
                console.error('Erro ao verificar status de afiliado:', error);
            } finally {
                setIsLoading(false);
            }
        } else if (sessionStatus === 'unauthenticated') {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAffiliateStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, sessionStatus]);

    return (
        <AffiliateContext.Provider
            value={{
                ...affiliateStatus,
                isLoading,
                refetch: fetchAffiliateStatus,
            }}
        >
            {children}
        </AffiliateContext.Provider>
    );
}

export function useAffiliateStatus() {
    const context = useContext(AffiliateContext);
    if (context === undefined) {
        throw new Error('useAffiliateStatus must be used within AffiliateProvider');
    }
    return context;
}
