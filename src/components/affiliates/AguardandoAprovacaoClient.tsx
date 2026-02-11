'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function AguardandoAprovacaoClient() {
    const { t } = useTranslation('common');

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div>
                            <CardTitle className="text-orange-900">{t('affiliateWaiting.title')}</CardTitle>
                            <CardDescription className="text-orange-700">
                                {t('affiliateWaiting.subtitle')}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border border-orange-200 bg-white p-4">
                        <p className="mb-4 text-sm text-gray-700">
                            {t('affiliateWaiting.description')}
                        </p>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium">{t('affiliateWaiting.formReceived')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('affiliateWaiting.formReceivedDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium">{t('affiliateWaiting.emailSent')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('affiliateWaiting.emailSentDesc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium">{t('affiliateWaiting.analysisInProgress')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('affiliateWaiting.analysisInProgressDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-4">
                        <p className="mb-2 text-sm font-medium text-blue-900">{t('affiliateWaiting.nextStepsTitle')}</p>
                        <ul className="space-y-1.5 text-xs text-blue-800">
                            <li>1. {t('affiliateWaiting.nextStep1')}</li>
                            <li>2. {t('affiliateWaiting.nextStep2')}</li>
                            <li>3. {t('affiliateWaiting.nextStep3')}</li>
                            <li>4. {t('affiliateWaiting.nextStep4')}</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Button className="w-full" asChild>
                            <Link href="/">{t('affiliateWaiting.backToHome')}</Link>
                        </Button>
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/conta">{t('affiliateWaiting.goToAccount')}</Link>
                        </Button>
                    </div>

                    <div className="rounded-lg border bg-white p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            {t('affiliateWaiting.questionsContact')}{' '}
                            <a href="mailto:contato@arafacriou.com.br" className="font-medium underline">
                                contato@arafacriou.com.br
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
