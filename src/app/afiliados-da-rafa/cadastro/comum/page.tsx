'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

const affiliateCommonSchema = z.object({
    name: z.string().min(3, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    pixKey: z.string().min(11, 'Chave PIX é obrigatória'),
    termsAccepted: z.boolean().refine(val => val === true, {
        message: 'Você deve aceitar os termos para continuar',
    }),
});

type FormData = z.infer<typeof affiliateCommonSchema>;

export default function CadastroAfiliadoComumPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        pixKey: '',
        termsAccepted: false,
    });

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Limpar erro do campo ao editar
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const getClientIp = async () => {
        try {
            const response = await fetch('/api/get-ip');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch {
            return 'unknown';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setErrors({});

        // Validação com Zod
        const validation = affiliateCommonSchema.safeParse(formData);
        if (!validation.success) {
            const fieldErrors: Partial<Record<keyof FormData, string>> = {};
            validation.error.issues.forEach(err => {
                const field = err.path[0] as keyof FormData;
                fieldErrors[field] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setLoading(true);

        try {
            // Obter IP do cliente
            const ip = await getClientIp();

            const response = await fetch('/api/affiliates/register/common', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    termsIp: ip,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao realizar cadastro');
            }

            setSuccess(true);
            // Redirecionar após 2 segundos para configurar pagamentos
            setTimeout(() => {
                router.push('/afiliados-da-rafa/configurar-pagamentos');
            }, 2000);
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Erro ao realizar cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Verificar se usuário está logado
    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {t('affiliateRegister.loginRequired')}{' '}
                        <Link href="/login" className="font-medium underline">
                            {t('affiliateRegister.loginHere')}
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (success) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                            <div>
                                <CardTitle className="text-green-900 text-lg sm:text-xl">{t('affiliateRegister.successTitle')}</CardTitle>
                                <CardDescription className="text-green-700 text-xs sm:text-sm">
                                    {t('affiliateRegister.successSubtitle')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-xs sm:text-sm text-green-800">
                            {t('affiliateRegister.successMessage')}
                        </p>
                        <div className="mb-4 p-3 sm:p-4 bg-white rounded-lg border border-green-200">
                            <p className="font-medium text-green-900 mb-2 text-sm sm:text-base">📋 {t('affiliateRegister.nextStep')}</p>
                            <p className="text-xs sm:text-sm text-green-800 mb-3">
                                {t('affiliateRegister.nextStepDesc')}
                            </p>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-green-800">
                                <li>✓ <strong>{t('affiliateRegister.stripeConnect')}</strong> - {t('affiliateRegister.stripeConnectDesc')}</li>
                                <li>✓ <strong>{t('affiliateRegister.mercadoPagoSplit')}</strong> - {t('affiliateRegister.mercadoPagoSplitDesc')}</li>
                            </ul>
                        </div>
                        <p className="text-xs text-green-700 mb-4">
                            ⚠️ {t('affiliateRegister.noPaymentWarning')}
                        </p>
                        <Button className="w-full text-sm sm:text-base" onClick={() => router.push('/afiliados-da-rafa/configurar-pagamentos')}>
                            {t('affiliateRegister.configurePaymentsNow')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-6 sm:py-12">
            <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 text-xs sm:text-sm" asChild>
                <Link href="/afiliados-da-rafa">
                    <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {t('affiliateRegister.back')}
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Badge variant="secondary" className="w-fit text-xs">{t('affiliateRegister.commonBadge')}</Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 w-fit text-xs">
                            {t('affiliateRegister.autoApprovalBadge')}
                        </Badge>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">{t('affiliateRegister.commonTitle')}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {t('affiliateRegister.commonSubtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm">
                                {t('affiliateRegister.fullName')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t('affiliateRegister.fullNamePlaceholder')}
                                value={formData.name}
                                onChange={e => handleInputChange('name', e.target.value)}
                                disabled={loading}
                                className={`text-sm ${errors.name ? 'border-destructive' : ''}`}
                            />
                            {errors.name && <p className="text-xs sm:text-sm text-destructive">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm">
                                {t('affiliateRegister.email')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('affiliateRegister.emailPlaceholder')}
                                value={formData.email}
                                onChange={e => handleInputChange('email', e.target.value)}
                                disabled={loading}
                                className={`text-sm ${errors.email ? 'border-destructive' : ''}`}
                            />
                            {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>}
                        </div>

                        {/* Telefone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm">
                                {t('affiliateRegister.phone')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder={t('affiliateRegister.phonePlaceholder')}
                                value={formData.phone}
                                onChange={e => handleInputChange('phone', e.target.value)}
                                disabled={loading}
                                className={`text-sm ${errors.phone ? 'border-destructive' : ''}`}
                            />
                            {errors.phone && <p className="text-xs sm:text-sm text-destructive">{errors.phone}</p>}
                        </div>

                        {/* Chave PIX */}
                        <div className="space-y-2">
                            <Label htmlFor="pixKey" className="text-sm">
                                {t('affiliateRegister.pixKey')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="pixKey"
                                type="text"
                                placeholder={t('affiliateRegister.pixKeyPlaceholder')}
                                value={formData.pixKey}
                                onChange={e => handleInputChange('pixKey', e.target.value)}
                                disabled={loading}
                                className={`text-sm ${errors.pixKey ? 'border-destructive' : ''}`}
                            />
                            {errors.pixKey && <p className="text-xs sm:text-sm text-destructive">{errors.pixKey}</p>}
                            <p className="text-xs text-muted-foreground">
                                {t('affiliateRegister.pixKeyNote')}
                            </p>
                        </div>

                        {/* Termos */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Checkbox
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onCheckedChange={checked => handleInputChange('termsAccepted', checked as boolean)}
                                    disabled={loading}
                                    className={`mt-0.5 ${errors.termsAccepted ? 'border-destructive' : ''}`}
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor="terms"
                                        className="cursor-pointer text-xs sm:text-sm font-normal leading-relaxed"
                                    >
                                        {t('affiliateRegister.termsAccept')}{' '}
                                        <Link href="/termos-afiliados" className="font-medium underline" target="_blank">
                                            {t('affiliateRegister.termsAndConditions')}
                                        </Link>{' '}
                                        {t('affiliateRegister.termsAffiliateProgram')} <span className="text-destructive">*</span>
                                    </Label>
                                </div>
                            </div>
                            {errors.termsAccepted && (
                                <p className="text-xs sm:text-sm text-destructive">{errors.termsAccepted}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <Button type="submit" className="w-full text-sm sm:text-base" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('affiliateRegister.processing')}
                                </>
                            ) : (
                                t('affiliateRegister.createAccount')
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 sm:mt-6 rounded-lg bg-blue-50 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm font-medium text-blue-900">{t('affiliateRegister.whatHappensNext')}</p>
                        <ul className="mt-2 space-y-1 text-xs text-blue-800">
                            <li>✓ {t('affiliateRegister.nextInfo1')}</li>
                            <li>✓ {t('affiliateRegister.nextInfo2')}</li>
                            <li>✓ {t('affiliateRegister.nextInfo3')}</li>
                            <li>✓ {t('affiliateRegister.nextInfo4')}</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
