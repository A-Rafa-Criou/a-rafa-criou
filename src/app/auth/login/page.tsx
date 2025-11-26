"use client";

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Magic Link temporariamente desabilitado - requer adapter database-session
    // const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loginAttempts, setLoginAttempts] = useState(0);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status } = useSession();

    const { t } = useTranslation('common');

    // Verificar tentativas de login no localStorage
    useEffect(() => {
        const attempts = localStorage.getItem('loginAttempts');
        if (attempts) {
            setLoginAttempts(parseInt(attempts));
        }
    }, []);

    // Redirecionar usuários já autenticados
    useEffect(() => {
        if (status === 'authenticated') {
            const callbackUrl = searchParams.get('callbackUrl') || '/';
            router.push(callbackUrl);
        }
    }, [status, router, searchParams]);

    useEffect(() => {
        const message = searchParams.get('message');
        if (message) {
            setSuccessMessage(message);

            // Se há mensagem de sucesso (senha redefinida), limpar tentativas de login
            if (message.includes('redefinida') || message.includes('sucesso')) {
                localStorage.removeItem('loginAttempts');
                setLoginAttempts(0);
            }
        }
    }, [searchParams]);

    // Mostrar loading enquanto verifica a sessão
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Não renderizar o formulário se já estiver autenticado
    if (status === 'authenticated') {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const callbackUrl = searchParams.get('callbackUrl') || '/';

            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                // Incrementar tentativas
                const newAttempts = loginAttempts + 1;
                setLoginAttempts(newAttempts);
                localStorage.setItem('loginAttempts', newAttempts.toString());

                // Após 5 tentativas, sugerir fortemente a redefinição de senha
                // mas NÃO bloquear o acesso
                if (newAttempts >= 5) {
                    setError('Credenciais inválidas. Se você esqueceu sua senha, recomendamos fortemente redefiní-la agora.');
                } else {
                    const remainingAttempts = 5 - newAttempts;
                    setError(`Credenciais inválidas. Após ${remainingAttempts} tentativa(s), vamos sugerir redefinir sua senha.`);
                }
            } else {
                // Login bem-sucedido - limpar tentativas
                localStorage.removeItem('loginAttempts');
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError('Erro ao fazer login. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Magic Link temporariamente desabilitado - requer adapter database-session
    // const handleMagicLink = async () => {
    //     if (!email) {
    //         setError('Por favor, informe seu e-mail para receber o link mágico.');
    //         return;
    //     }
    //     setIsMagicLinkLoading(true);
    //     setError('');
    //     setSuccessMessage('');
    //     try {
    //         const result = await signIn('email', {
    //             email,
    //             redirect: false,
    //             callbackUrl: searchParams.get('callbackUrl') || '/',
    //         });
    //         if (result?.error) {
    //             setError('Erro ao enviar link mágico. Tente novamente.');
    //         } else {
    //             setSuccessMessage('Link mágico enviado! Verifique seu e-mail.');
    //         }
    //     } catch {
    //         setError('Erro ao enviar link mágico. Tente novamente.');
    //     } finally {
    //         setIsMagicLinkLoading(false);
    //     }
    // };

    return (
        <div className='container mx-auto flex items-center justify-center p-6'>
            <Card className='w-full max-w-md'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-2xl font-bold text-foreground'>
                        {t('auth.loginTitle', 'Entrar')}
                    </CardTitle>
                    <CardDescription>
                        {t('auth.loginSubtitle', 'Acesse sua conta')}
                    </CardDescription>
                </CardHeader>

                <CardContent className='space-y-6'>
                    {successMessage && (
                        <Alert className="bg-green-50 border-green-200">
                            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Botão destacado para recuperar senha após 5+ tentativas */}
                    {loginAttempts >= 5 && (
                        <Alert className="bg-orange-50 border-orange-300">
                            <AlertDescription className="text-orange-900 space-y-3">
                                <p className="font-semibold text-base">⚠️ Muitas tentativas de login!</p>
                                <p className="text-sm">
                                    Parece que você está com dificuldades para acessar sua conta.
                                    Redefinir sua senha é rápido e seguro.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => router.push('/auth/forgot-password')}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    🔑 Redefinir Minha Senha Agora
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Aviso suave após 3+ tentativas (antes de chegar em 5) */}
                    {loginAttempts >= 3 && loginAttempts < 5 && (
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertDescription className="text-yellow-800 space-y-2">
                                <p className="font-medium">� Dica: Problemas para fazer login?</p>
                                <p className="text-sm">Você pode redefinir sua senha se não se lembra dela.</p>
                                <Link href="/auth/forgot-password">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-yellow-300 hover:bg-yellow-100"
                                    >
                                        Recuperar Senha
                                    </Button>
                                </Link>
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='email'>E-mail</Label>
                            <Input
                                id='email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder='seu@email.com'
                                required
                                className='h-11'
                                autoComplete='email'
                            />
                        </div>

                        <div className='space-y-2'>
                            <div className="flex items-center justify-between">
                                <Label htmlFor='password'>{t('auth.password', 'Senha')}</Label>
                                <Link
                                    href='/auth/forgot-password'
                                    className='text-xs text-primary hover:underline'
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id='password'
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder='••••••••'
                                    required
                                    className='h-11 pr-10'
                                    autoComplete='current-password'
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
                        </div>

                        <Button
                            type='submit'
                            className='w-full bg-primary hover:bg-secondary text-black h-11'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                t('auth.login', 'Entrar')
                            )}
                        </Button>
                    </form>

                    {/* Magic Link temporariamente desabilitado - requer adapter database-session */}
                    {/* <div className='relative'>
                        <div className='absolute inset-0 flex items-center'>
                            <div className='w-full border-t border-muted' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                            <span className='bg-card px-2 text-muted-foreground'>ou</span>
                        </div>
                    </div>

                    <Button
                        type='button'
                        variant='outline'
                        className='w-full h-11'
                        onClick={handleMagicLink}
                        disabled={isMagicLinkLoading || !email}
                    >
                        {isMagicLinkLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4 mr-2" />
                                Receber Link Mágico
                            </>
                        )}
                    </Button> */}

                    <div className='text-center text-sm text-muted-foreground'>
                        {t('auth.noAccount', 'Não tem uma conta?')}{' '}
                        <Link href='/auth/register' className='text-primary hover:underline font-medium'>
                            {t('auth.register', 'Cadastre-se')}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className='container mx-auto flex min-h-screen items-center justify-center p-6'>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}