'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import CommonAffiliateDashboard from '@/components/affiliates/CommonAffiliateDashboard';
import CommercialLicenseDashboard from '@/components/affiliates/CommercialLicenseDashboard';

interface AffiliateData {
    id: string;
    code: string;
    customSlug?: string | null;
    name: string;
    email: string;
    affiliateType: 'common' | 'commercial_license';
    status: string;
    commissionValue: string;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: string;
    totalCommission: string;
    pendingCommission: string;
    paidCommission: string;
    contractDocumentUrl: string | null;
    preferredPaymentMethod?: string | null;
    paymentAutomationEnabled?: boolean | null;
    pixKey?: string | null;
    stripeOnboardingStatus?: string | null;
    stripePayoutsEnabled?: boolean | null;
}

export default function DashboardAfiliadosPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchAffiliateData();
        }
    }, [status, router]);

    const fetchAffiliateData = async () => {
        try {
            const response = await fetch('/api/affiliates/me');
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    setError('not_affiliate');
                } else {
                    throw new Error(data.message || t('affiliateDashboardPage.errorLoading'));
                }
                return;
            }

            setAffiliate(data.affiliate);
        } catch (err) {
            const error = err as Error;
            setError(error.message || t('affiliateDashboardPage.errorLoadingAffiliate'));
        } finally {
            setLoading(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error === 'not_affiliate') {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {t('affiliateDashboardPage.notAffiliate')}{' '}
                        <Link href="/afiliados-da-rafa" className="font-medium underline">
                            {t('affiliateDashboardPage.registerHere')}
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!affiliate) {
        return null;
    }

    // Verificar se está aguardando aprovação
    if (affiliate.status === 'inactive' && affiliate.affiliateType === 'commercial_license') {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                        {t('affiliateDashboardPage.pendingApproval')}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Renderizar dashboard apropriado baseado no tipo
    if (affiliate.affiliateType === 'common') {
        return <CommonAffiliateDashboard affiliate={affiliate} />;
    }

    if (affiliate.affiliateType === 'commercial_license') {
        return <CommercialLicenseDashboard />;
    }

    return null;
}
