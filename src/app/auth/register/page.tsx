'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { status } = useSession();

    // Redirecionar usuários já autenticados para a home
    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
        }
    }, [status, router]);

    // Mostrar loading enquanto verifica a sessão
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Não renderizar o formulário se já estiver autenticado
    if (status === 'authenticated') {
        return null;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validações básicas
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            if (response.ok) {
                router.push('/auth/login?message=Conta criada com sucesso!');
            } else {
                const data = await response.json();
                setError(data.error || 'Erro ao criar conta.');
            }
        } catch {
            setError('Erro ao conectar com o servidor. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='container mx-auto flex  items-center justify-center p-6'>
            <Card className='w-full max-w-md'>
                <CardHeader className='text-center'>
                    <CardTitle className='text-2xl font-bold text-foreground'>
                        Criar Conta
                    </CardTitle>
                    <CardDescription>
                        Junte-se à A Rafa Criou e acesse conteúdos exclusivos
                    </CardDescription>
                </CardHeader>

                <CardContent className='space-y-6'>
                    {error && (
                        <div className='rounded-md bg-destructive/10 p-4 text-sm text-destructive'>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='name'>Nome completo</Label>
                            <div className='relative'>
                                <User className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                    id='name'
                                    name='name'
                                    type='text'
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder='Seu nome completo'
                                    required
                                    className='h-11 pl-10'
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='email'>E-mail</Label>
                            <div className='relative'>
                                <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                    id='email'
                                    name='email'
                                    type='email'
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder='seu@email.com'
                                    required
                                    className='h-11 pl-10'
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='password'>Senha</Label>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                    id='password'
                                    name='password'
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder='••••••••'
                                    required
                                    minLength={6}
                                    className='h-11 pl-10 pr-10'
                                    disabled={isLoading}
                                />
                                <button
                                    type='button'
                                    onClick={() => setShowPassword(!showPassword)}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className='h-4 w-4' />
                                    ) : (
                                        <Eye className='h-4 w-4' />
                                    )}
                                </button>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                Mínimo de 6 caracteres
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='confirmPassword'>Confirmar senha</Label>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                                <Input
                                    id='confirmPassword'
                                    name='confirmPassword'
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder='••••••••'
                                    required
                                    className='h-11 pl-10 pr-10'
                                    disabled={isLoading}
                                />
                                <button
                                    type='button'
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className='h-4 w-4' />
                                    ) : (
                                        <Eye className='h-4 w-4' />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type='submit'
                            className='w-full bg-primary hover:bg-secondary'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    Criando conta...
                                </>
                            ) : (
                                'Criar conta'
                            )}
                        </Button>
                    </form>

                    <div className='text-center text-sm text-muted-foreground'>
                        Já tem uma conta?{' '}
                        <Link href='/auth/login' className='text-primary hover:underline font-medium'>
                            Fazer login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}