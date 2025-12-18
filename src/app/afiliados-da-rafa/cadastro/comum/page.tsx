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
            // Redirecionar após 3 segundos
            setTimeout(() => {
                router.push('/afiliados-da-rafa/dashboard');
            }, 3000);
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

    if (success) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div>
                                <CardTitle className="text-green-900">Cadastro Realizado com Sucesso!</CardTitle>
                                <CardDescription className="text-green-700">
                                    Você já pode começar a divulgar seus links
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-green-800">
                            Seu cadastro foi aprovado automaticamente! Em instantes você será redirecionado para
                            seu dashboard onde encontrará:
                        </p>
                        <ul className="mb-4 space-y-2 text-sm text-green-800">
                            <li>• Seus links exclusivos de afiliado</li>
                            <li>• Materiais de divulgação para download</li>
                            <li>• Dashboard para acompanhar suas vendas</li>
                            <li>• Dados de contato dos seus clientes</li>
                        </ul>
                        <Button className="w-full" onClick={() => router.push('/afiliados-da-rafa/dashboard')}>
                            Ir para Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <Button variant="ghost" size="sm" className="mb-6" asChild>
                <Link href="/afiliados-da-rafa">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                        <Badge variant="secondary">Afiliado Comum</Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                            Aprovação Automática
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl">Cadastro de Afiliado Comum</CardTitle>
                    <CardDescription>
                        Preencha o formulário abaixo para se tornar um afiliado e começar a ganhar comissões
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

                        {/* Chave PIX */}
                        <div className="space-y-2">
                            <Label htmlFor="pixKey">
                                Chave PIX <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="pixKey"
                                type="text"
                                placeholder="CPF, email, celular ou chave aleatória"
                                value={formData.pixKey}
                                onChange={e => handleInputChange('pixKey', e.target.value)}
                                disabled={loading}
                                className={errors.pixKey ? 'border-destructive' : ''}
                            />
                            {errors.pixKey && <p className="text-sm text-destructive">{errors.pixKey}</p>}
                            <p className="text-xs text-muted-foreground">
                                Suas comissões serão pagas nesta chave PIX
                            </p>
                        </div>

                        {/* Termos */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onCheckedChange={checked => handleInputChange('termsAccepted', checked as boolean)}
                                    disabled={loading}
                                    className={errors.termsAccepted ? 'border-destructive' : ''}
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor="terms"
                                        className="cursor-pointer text-sm font-normal leading-relaxed"
                                    >
                                        Eu li e aceito os{' '}
                                        <Link href="/termos-afiliados" className="font-medium underline" target="_blank">
                                            Termos e Condições
                                        </Link>{' '}
                                        do programa de afiliados <span className="text-destructive">*</span>
                                    </Label>
                                </div>
                            </div>
                            {errors.termsAccepted && (
                                <p className="text-sm text-destructive">{errors.termsAccepted}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Criar Conta de Afiliado'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 rounded-lg bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-900">O que acontece depois?</p>
                        <ul className="mt-2 space-y-1 text-xs text-blue-800">
                            <li>✓ Sua conta será aprovada automaticamente</li>
                            <li>✓ Você receberá materiais de divulgação por email</li>
                            <li>✓ Poderá acessar seu dashboard imediatamente</li>
                            <li>✓ Começará a ganhar comissões em cada venda</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
