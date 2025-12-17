'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { TrendingUp, DollarSign, Users, CheckCircle } from 'lucide-react';

export default function AffiliateApplicationForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        instagram: '',
        facebook: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { showToast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/affiliates/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
                showToast(data.message || 'Candidatura enviada com sucesso!', 'success');
            } else {
                showToast(data.message || 'Erro ao enviar candidatura', 'error');
            }
        } catch (error) {
            console.error('Erro ao enviar candidatura:', error);
            showToast('Erro ao enviar candidatura. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F4F4F4] py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">Candidatura Enviada!</CardTitle>
                            <CardDescription className="text-base">
                                Sua candidatura foi recebida com sucesso. Nossa equipe irá analisá-la e você receberá
                                um e-mail em breve com o resultado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button
                                onClick={() => (window.location.href = '/')}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                Voltar para a Página Inicial
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F4F4] py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900">Seja um Afiliado</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Ganhe comissões promovendo nossos produtos. É simples, rápido e lucrativo!
                    </p>
                </div>

                {/* Benefícios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <div className="w-12 h-12 bg-[#FED466] rounded-lg flex items-center justify-center mb-2">
                                <TrendingUp className="w-6 h-6 text-gray-900" />
                            </div>
                            <CardTitle className="text-lg">Comissões Atrativas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">Ganhe até 20% de comissão em cada venda realizada</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="w-12 h-12 bg-[#FD9555] rounded-lg flex items-center justify-center mb-2">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle className="text-lg">Pagamentos Rápidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">Receba seus ganhos via PIX ou transferência bancária</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="w-12 h-12 bg-[#FED466] rounded-lg flex items-center justify-center mb-2">
                                <Users className="w-6 h-6 text-gray-900" />
                            </div>
                            <CardTitle className="text-lg">Suporte Dedicado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600">Tenha acesso a materiais de divulgação e suporte</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Formulário */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Candidatura</CardTitle>
                        <CardDescription>
                            Preencha o formulário abaixo para se candidatar ao programa de afiliados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Nome Completo <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Seu nome completo"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        E-mail <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="seu@email.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp / Telefone <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website">Website/Blog</Label>
                                    <Input
                                        id="website"
                                        name="website"
                                        type="url"
                                        value={formData.website}
                                        onChange={handleChange}
                                        placeholder="https://seusite.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="instagram">Instagram</Label>
                                    <Input
                                        id="instagram"
                                        name="instagram"
                                        value={formData.instagram}
                                        onChange={handleChange}
                                        placeholder="@seuinstagram"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facebook">Facebook</Label>
                                    <Input
                                        id="facebook"
                                        name="facebook"
                                        value={formData.facebook}
                                        onChange={handleChange}
                                        placeholder="Seu Facebook"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Por que quer ser afiliado? <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    placeholder="Conte-nos sobre sua experiência, público-alvo, e por que você quer se juntar ao nosso programa de afiliados..."
                                    minLength={20}
                                />
                                <p className="text-sm text-gray-500">
                                    Mínimo de 20 caracteres ({formData.description.length}/20)
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Próximos passos:</strong> Após o envio, sua candidatura será analisada por
                                    nossa equipe. Você receberá um e-mail em até 48 horas com o resultado. Se aprovado,
                                    você terá acesso ao seu painel de afiliado com links exclusivos e acompanhamento de
                                    comissões.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#FED466] hover:bg-[#FD9555] text-gray-900 text-lg py-6"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar Candidatura'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
