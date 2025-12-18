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
            setSignatureError('Por favor, assine o contrato no campo acima');
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
                throw new Error(data.message || 'Erro ao realizar cadastro');
            }

            // Redirecionar para página de sucesso
            router.push('/afiliados-da-rafa/cadastro/aguardando-aprovacao');
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Erro ao realizar cadastro. Tente novamente.');
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
                        Você precisa estar logado para se tornar um afiliado.{' '}
                        <Link href="/login" className="font-medium underline">
                            Faça login aqui
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
                    Voltar
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                        <Badge className="bg-primary text-primary-foreground">Licença Comercial</Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            Aprovação Manual
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl">Cadastro de Licença Comercial</CardTitle>
                    <CardDescription>
                        Preencha o formulário e assine o contrato digitalmente. Sua solicitação será analisada
                        por nossa equipe
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
                                Nome Completo <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Seu nome completo"
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
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
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
                                Telefone/WhatsApp <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="(00) 00000-0000"
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
                                CPF ou CNPJ <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="cpfCnpj"
                                type="text"
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                value={formData.cpfCnpj}
                                onChange={e => handleInputChange('cpfCnpj', e.target.value)}
                                disabled={loading}
                                className={errors.cpfCnpj ? 'border-destructive' : ''}
                            />
                            {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj}</p>}
                        </div>

                        {/* Contrato */}
                        <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                            <h3 className="font-semibold">Contrato de Licença Comercial</h3>
                            <div className="max-h-64 overflow-y-auto rounded border bg-background p-4 text-sm">
                                <p className="mb-3 font-medium">TERMOS DE USO - LICENÇA COMERCIAL</p>
                                <p className="mb-2">
                                    Este contrato estabelece os termos entre você (AFILIADO) e A Rafa Criou
                                    (LICENCIANTE) para uso comercial temporário dos arquivos digitais.
                                </p>
                                <p className="mb-2">
                                    <strong>1. OBJETO:</strong> Concessão de acesso temporário aos arquivos digitais
                                    por período de 5 (cinco) dias após cada venda realizada através de seus canais.
                                </p>
                                <p className="mb-2">
                                    <strong>2. LIMITAÇÕES:</strong> É expressamente proibido o download dos arquivos.
                                    É permitida apenas a visualização e impressão para execução de trabalhos para
                                    clientes específicos.
                                </p>
                                <p className="mb-2">
                                    <strong>3. PRAZO DE ACESSO:</strong> O acesso aos arquivos será concedido por 5
                                    dias corridos após a confirmação do pagamento de cada pedido.
                                </p>
                                <p className="mb-2">
                                    <strong>4. PROIBIÇÕES:</strong> É proibida a distribuição, revenda, reprodução ou
                                    compartilhamento dos arquivos originais sem autorização expressa.
                                </p>
                                <p className="mb-2">
                                    <strong>5. APROVAÇÃO:</strong> Este contrato está sujeito a aprovação manual pela
                                    equipe da A Rafa Criou.
                                </p>
                                <p className="mb-2">
                                    <strong>6. RESCISÃO:</strong> O descumprimento de qualquer cláusula resultará na
                                    rescisão imediata e perda de acesso aos arquivos.
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
                                    Li e aceito todos os termos do contrato de licença comercial{' '}
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
                                    Assinatura Digital <span className="text-destructive">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSignature}
                                    disabled={loading}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Limpar
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
                                Desenhe sua assinatura no campo acima usando o mouse ou touch
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
                                Aceito também os{' '}
                                <Link href="/termos-afiliados" className="font-medium underline" target="_blank">
                                    Termos Gerais
                                </Link>{' '}
                                do programa de afiliados <span className="text-destructive">*</span>
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
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Solicitação'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 rounded-lg bg-orange-50 p-4">
                        <p className="text-sm font-medium text-orange-900">O que acontece depois?</p>
                        <ul className="mt-2 space-y-1 text-xs text-orange-800">
                            <li>✓ Sua solicitação será analisada pela nossa equipe</li>
                            <li>✓ Você receberá um email com o resultado da análise</li>
                            <li>✓ Após aprovação, terá acesso ao dashboard exclusivo</li>
                            <li>✓ Poderá visualizar arquivos por 5 dias após cada venda</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
