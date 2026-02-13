'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DollarSign, FileText, Gift, TrendingUp, Users, Clock, Loader2 } from 'lucide-react';
import CommissionMural from '@/components/affiliates/CommissionMural';
import { useTranslation } from 'react-i18next';

export default function AffiliateLandingClient() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const [checking, setChecking] = useState(true);

    // Se o usuário já é afiliado, redirecionar para o dashboard
    useEffect(() => {
        if (sessionStatus === 'loading') return;

        if (sessionStatus === 'authenticated') {
            fetch('/api/affiliates/me')
                .then(res => {
                    if (res.ok) {
                        // Já é afiliado, redirecionar para dashboard
                        router.replace('/afiliados-da-rafa/dashboard');
                    } else {
                        setChecking(false);
                    }
                })
                .catch(() => setChecking(false));
        } else {
            setChecking(false);
        }
    }, [sessionStatus, router]);

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-12">
            {/* Header */}
            <div className="mb-8 sm:mb-12 text-center">
                <Badge className="mb-3 sm:mb-4 bg-primary text-primary-foreground text-xs sm:text-sm">
                    {t('affiliateLanding.badge')}
                </Badge>
                <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold">
                    {t('affiliateLanding.title')}
                </h1>
                <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground px-4">
                    {t('affiliateLanding.subtitle')}
                </p>
            </div>

            {/* Mural de Comissão */}
            <div className="mb-8 sm:mb-12 max-w-3xl mx-auto">
                <CommissionMural />
            </div>

            {/* Cards de tipos de afiliado */}
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                {/* Afiliado Comum */}
                <Card className="relative flex flex-col border-2 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{t('affiliateLanding.mostPopular')}</Badge>
                            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl">{t('affiliateLanding.commonAffiliate')}</CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                            {t('affiliateLanding.commonAffiliateDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-4 sm:mb-6 space-y-2.5 sm:space-y-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <TrendingUp className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.automaticCommissions')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.automaticCommissionsDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Users className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.salesDashboard')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.salesDashboardDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Gift className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.freeMaterialKit')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.freeMaterialKitDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.automaticApproval')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.automaticApprovalDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 rounded-lg bg-muted p-3 sm:p-4">
                            <p className="mb-2 text-xs sm:text-sm font-medium">{t('affiliateLanding.whatYouGet')}</p>
                            <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                <li>• {t('affiliateLanding.commonBenefit1')}</li>
                                <li>• {t('affiliateLanding.commonBenefit2')}</li>
                                <li>• {t('affiliateLanding.commonBenefit3')}</li>
                                <li>• {t('affiliateLanding.commonBenefit4')}</li>
                                <li>• {t('affiliateLanding.commonBenefit5')}</li>
                            </ul>
                        </div>

                        <Button className="mt-4 sm:mt-6 w-full text-sm sm:text-base" size="lg" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/comum">{t('affiliateLanding.wantToBeCommon')}</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Licença Comercial */}
                <Card className="relative flex flex-col border-2 border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <Badge className="bg-primary text-primary-foreground text-xs">{t('affiliateLanding.commercialLicense')}</Badge>
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl">{t('affiliateLanding.commercialLicense')}</CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                            {t('affiliateLanding.commercialLicenseDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-4 sm:mb-6 space-y-2.5 sm:space-y-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <FileText className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.temporaryFileAccess')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.temporaryFileAccessDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Users className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.advancedDashboard')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.advancedDashboardDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Gift className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.exclusiveMaterialKit')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.exclusiveMaterialKitDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">{t('affiliateLanding.manualApproval')}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        {t('affiliateLanding.manualApprovalDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 rounded-lg bg-muted p-3 sm:p-4">
                            <p className="mb-2 text-xs sm:text-sm font-medium">{t('affiliateLanding.whatYouGet')}</p>
                            <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                <li>• {t('affiliateLanding.commercialBenefit1')}</li>
                                <li>• {t('affiliateLanding.commercialBenefit2')}</li>
                                <li>• {t('affiliateLanding.commercialBenefit3')}</li>
                                <li>• {t('affiliateLanding.commercialBenefit4')}</li>
                                <li>• {t('affiliateLanding.commercialBenefit5')}</li>
                            </ul>
                        </div>

                        <Button className="mt-4 sm:mt-6 w-full text-sm sm:text-base" size="lg" variant="default" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/licenca-comercial">
                                {t('affiliateLanding.wantCommercialLicense')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ */}
            <div className="mt-8 sm:mt-12 rounded-lg bg-muted p-4 sm:p-6 text-center">
                <h2 className="mb-2 text-lg sm:text-xl font-semibold">{t('affiliateLanding.doubtsTitle')}</h2>
                <p className="mx-auto max-w-2xl text-xs sm:text-sm md:text-base text-muted-foreground px-2">
                    <strong>{t('affiliateLanding.doubtsCommon')}</strong> {t('affiliateLanding.doubtsCommonDesc')}
                    <br />
                    <strong>{t('affiliateLanding.doubtsCommercial')}</strong> {t('affiliateLanding.doubtsCommercialDesc')}
                </p>
            </div>
        </div>
    );
}
