"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao enviar e-mail de recuperação');
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Card className='w-full max-w-md'>
                    <CardHeader className='text-center'>
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <CardTitle className='text-2xl font-bold text-foreground'>
                            E-mail Enviado!
                        </CardTitle>
                        <CardDescription>
                            Verifique sua caixa de entrada
                        </CardDescription>
                    </CardHeader>

                    <CardContent className='space-y-6'>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800">
                                Enviamos um link de recuperação de senha para <strong>{email}</strong>.
                            </p>
                            <p className="text-sm text-green-700 mt-2">
                                O link é válido por 1 hora. Verifique também sua pasta de spam.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button asChild className="w-full bg-primary hover:bg-secondary text-black">
                                <Link href="/auth/login">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar para Login
                                </Link>
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail('');
                                }}
                            >
                                Enviar para outro e-mail
                            </Button>
                        </div>
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
                        Esqueceu sua senha?
                    </CardTitle>
                    <CardDescription>
                        Digite seu e-mail para receber instruções de recuperação
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
                            <Label htmlFor='email'>E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id='email'
                                    type='email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder='seu@email.com'
                                    required
                                    className='h-11 pl-10'
                                    autoComplete='email'
                                />
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
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Link de Recuperação'
                            )}
                        </Button>
                    </form>

                    <div className='text-center'>
                        <Link
                            href='/auth/login'
                            className='text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2'
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar para login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
