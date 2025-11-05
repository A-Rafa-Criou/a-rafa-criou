"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    // Validar token ao carregar
    useEffect(() => {
        if (!token) {
            setTokenValid(false);
            return;
        }

        const validateToken = async () => {
            try {
                const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
                setTokenValid(response.ok);
            } catch {
                setTokenValid(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao redefinir senha');
            }

            setSuccess(true);
            
            // Limpar tentativas de login do localStorage
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('loginBlockUntil');
            
            setTimeout(() => {
                router.push('/auth/login?message=Senha redefinida com sucesso!');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
        } finally {
            setIsLoading(false);
        }
    };

    if (tokenValid === null) {
        return (
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (tokenValid === false) {
        return (
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Card className='w-full max-w-md'>
                    <CardHeader className='text-center'>
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <CardTitle className='text-2xl font-bold text-foreground'>
                            Link Inválido
                        </CardTitle>
                        <CardDescription>
                            Este link de recuperação não é válido ou expirou
                        </CardDescription>
                    </CardHeader>

                    <CardContent className='space-y-6'>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                O link de recuperação de senha pode ter expirado (válido por 1 hora) ou já foi utilizado.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button asChild className="w-full bg-primary hover:bg-secondary text-black">
                                <Link href="/auth/forgot-password">
                                    Solicitar Novo Link
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full">
                                <Link href="/auth/login">
                                    Voltar para Login
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Card className='w-full max-w-md'>
                    <CardHeader className='text-center'>
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <CardTitle className='text-2xl font-bold text-foreground'>
                            Senha Redefinida!
                        </CardTitle>
                        <CardDescription>
                            Sua senha foi alterada com sucesso
                        </CardDescription>
                    </CardHeader>

                    <CardContent className='text-center'>
                        <p className="text-sm text-muted-foreground mb-4">
                            Redirecionando para o login...
                        </p>
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
            <Card className='w-full max-w-md'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-2xl font-bold text-foreground'>
                        Nova Senha
                    </CardTitle>
                    <CardDescription>
                        Digite sua nova senha
                    </CardDescription>
                </CardHeader>

                <CardContent className='space-y-6'>
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='password'>Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id='password'
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder='••••••••'
                                    required
                                    minLength={6}
                                    className='h-11 pr-10'
                                    autoComplete='new-password'
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Mínimo de 6 caracteres
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='confirmPassword'>Confirmar Senha</Label>
                            <div className="relative">
                                <Input
                                    id='confirmPassword'
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder='••••••••'
                                    required
                                    minLength={6}
                                    className='h-11 pr-10'
                                    autoComplete='new-password'
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type='submit'
                            className='w-full bg-primary hover:bg-secondary text-black h-11'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Redefinindo...
                                </>
                            ) : (
                                'Redefinir Senha'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
