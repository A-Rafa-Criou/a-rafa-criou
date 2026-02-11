'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';
import SignatureCanvas from 'react-signature-canvas';
import { useTranslation } from 'react-i18next';

const affiliateLicenseSchema = z.object({
    name: z.string().min(3, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ é obrigatório'),
    termsAccepted: z.boolean().refine(val => val === true, {
        message: 'Você deve aceitar os termos para continuar',
    }),
    contractAccepted: z.boolean().refine(val => val === true, {
        message: 'Você deve aceitar o contrato para continuar',
    }),
});

type FormData = z.infer<typeof affiliateLicenseSchema>;

export default function CadastroLicencaComercialPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { t } = useTranslation('common');
    const signatureRef = useRef<SignatureCanvas>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [signatureError, setSignatureError] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        cpfCnpj: '',
        termsAccepted: false,
        contractAccepted: false,
    });

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const clearSignature = () => {
        signatureRef.current?.clear();
        setSignatureError(null);
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
        setSignatureError(null);

        // Validação com Zod
        const validation = affiliateLicenseSchema.safeParse(formData);
        if (!validation.success) {
            const fieldErrors: Partial<Record<keyof FormData, string>> = {};
            validation.error.issues.forEach(err => {
                const field = err.path[0] as keyof FormData;
                fieldErrors[field] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }

        // Verificar se tem assinatura
        if (!signatureRef.current || signatureRef.current.isEmpty()) {
            setSignatureError(t('affiliateRegister.signatureRequired'));
            return;
        }

        setLoading(true);

        try {
            // Obter assinatura como base64
            const signatureData = signatureRef.current.toDataURL();

            // Obter IP do cliente
            const ip = await getClientIp();

            const response = await fetch('/api/affiliates/register/commercial-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    signatureData,
                    termsIp: ip,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('affiliateRegister.registrationError'));
            }

            // Redirecionar para página de sucesso
            router.push('/afiliados-da-rafa/cadastro/aguardando-aprovacao');
        } catch (err) {
            const error = err as Error;
            setError(error.message || t('affiliateRegister.registrationErrorRetry'));
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
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

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
            <Button variant="ghost" size="sm" className="mb-6" asChild>
                <Link href="/afiliados-da-rafa">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('affiliateRegister.back')}
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                        <Badge className="bg-primary text-primary-foreground">{t('affiliateRegister.commercialBadge')}</Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            {t('affiliateRegister.manualApprovalBadge')}
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl">{t('affiliateRegister.commercialTitle')}</CardTitle>
                    <CardDescription>
                        {t('affiliateRegister.commercialSubtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                {t('affiliateRegister.fullName')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t('affiliateRegister.fullNamePlaceholder')}
                                value={formData.name}
                                onChange={e => handleInputChange('name', e.target.value)}
                                disabled={loading}
                                className={errors.name ? 'border-destructive' : ''}
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                {t('affiliateRegister.email')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('affiliateRegister.emailPlaceholder')}
                                value={formData.email}
                                onChange={e => handleInputChange('email', e.target.value)}
                                disabled={loading}
                                className={errors.email ? 'border-destructive' : ''}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        {/* Telefone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                {t('affiliateRegister.phone')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder={t('affiliateRegister.phonePlaceholder')}
                                value={formData.phone}
                                onChange={e => handleInputChange('phone', e.target.value)}
                                disabled={loading}
                                className={errors.phone ? 'border-destructive' : ''}
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>

                        {/* CPF/CNPJ */}
                        <div className="space-y-2">
                            <Label htmlFor="cpfCnpj">
                                {t('affiliateRegister.cpfCnpj')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="cpfCnpj"
                                type="text"
                                placeholder={t('affiliateRegister.cpfCnpjPlaceholder')}
                                value={formData.cpfCnpj}
                                onChange={e => handleInputChange('cpfCnpj', e.target.value)}
                                disabled={loading}
                                className={errors.cpfCnpj ? 'border-destructive' : ''}
                            />
                            {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj}</p>}
                        </div>

                        {/* Contrato */}
                        <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                            <h3 className="font-semibold">{t('affiliateRegister.contractTitle')}</h3>
                            <div className="max-h-64 overflow-y-auto rounded border bg-background p-4 text-sm">
                                <p className="mb-3 font-medium">{t('affiliateRegister.contractTermsTitle')}</p>
                                <p className="mb-2">
                                    {t('affiliateRegister.contractIntro')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractObjectLabel')}</strong> {t('affiliateRegister.contractObject')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractLimitationsLabel')}</strong> {t('affiliateRegister.contractLimitations')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractAccessPeriodLabel')}</strong> {t('affiliateRegister.contractAccessPeriod')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractProhibitionsLabel')}</strong> {t('affiliateRegister.contractProhibitions')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractApprovalLabel')}</strong> {t('affiliateRegister.contractApproval')}
                                </p>
                                <p className="mb-2">
                                    <strong>{t('affiliateRegister.contractRescissionLabel')}</strong> {t('affiliateRegister.contractRescission')}
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="contract"
                                    checked={formData.contractAccepted}
                                    onCheckedChange={checked => handleInputChange('contractAccepted', checked as boolean)}
                                    disabled={loading}
                                    className={errors.contractAccepted ? 'border-destructive' : ''}
                                />
                                <Label htmlFor="contract" className="cursor-pointer text-sm font-normal">
                                    {t('affiliateRegister.contractAcceptLabel')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                            </div>
                            {errors.contractAccepted && (
                                <p className="text-sm text-destructive">{errors.contractAccepted}</p>
                            )}
                        </div>

                        {/* Assinatura Digital */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>
                                    {t('affiliateRegister.digitalSignature')} <span className="text-destructive">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSignature}
                                    disabled={loading}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('affiliateRegister.clearSignature')}
                                </Button>
                            </div>
                            <div
                                className={`overflow-hidden rounded-lg border-2 ${signatureError ? 'border-destructive' : 'border-input'
                                    }`}
                            >
                                <SignatureCanvas
                                    ref={signatureRef}
                                    canvasProps={{
                                        className: 'w-full h-40 bg-white',
                                        style: { touchAction: 'none' },
                                    }}
                                    backgroundColor="white"
                                />
                            </div>
                            {signatureError && <p className="text-sm text-destructive">{signatureError}</p>}
                            <p className="text-xs text-muted-foreground">
                                {t('affiliateRegister.signatureNote')}
                            </p>
                        </div>

                        {/* Termos Gerais */}
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="terms"
                                checked={formData.termsAccepted}
                                onCheckedChange={checked => handleInputChange('termsAccepted', checked as boolean)}
                                disabled={loading}
                                className={errors.termsAccepted ? 'border-destructive' : ''}
                            />
                            <Label htmlFor="terms" className="cursor-pointer text-sm font-normal">
                                {t('affiliateRegister.generalTermsAccept')}{' '}
                                <Link href="/termos-afiliados" className="font-medium underline" target="_blank">
                                    {t('affiliateRegister.generalTerms')}
                                </Link>{' '}
                                {t('affiliateRegister.termsAffiliateProgram')} <span className="text-destructive">*</span>
                            </Label>
                        </div>
                        {errors.termsAccepted && (
                            <p className="text-sm text-destructive">{errors.termsAccepted}</p>
                        )}

                        {/* Submit */}
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('affiliateRegister.sending')}
                                </>
                            ) : (
                                t('affiliateRegister.submitRequest')
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 rounded-lg bg-orange-50 p-4">
                        <p className="text-sm font-medium text-orange-900">{t('affiliateRegister.whatHappensNext')}</p>
                        <ul className="mt-2 space-y-1 text-xs text-orange-800">
                            <li>✓ {t('affiliateRegister.commercialNextInfo1')}</li>
                            <li>✓ {t('affiliateRegister.commercialNextInfo2')}</li>
                            <li>✓ {t('affiliateRegister.commercialNextInfo3')}</li>
                            <li>✓ {t('affiliateRegister.commercialNextInfo4')}</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
