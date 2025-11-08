"use client"

import { useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, Mail, Loader2, CheckCircle } from 'lucide-react'

export default function ContatoPage() {
    const { t } = useTranslation('common')
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');
        setSubmitSuccess(false);

        // Validar campos antes de enviar
        const trimmedData = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            message: formData.message.trim()
        };

        if (!trimmedData.name || !trimmedData.email || !trimmedData.message) {
            setSubmitError(t('contactPage.errors.fillAllFields', 'Por favor, preencha todos os campos.'));
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trimmedData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('contactPage.errors.sendError', 'Erro ao enviar mensagem'));
            }

            setSubmitSuccess(true);
            setFormData({ name: '', email: '', message: '' });

            // Resetar sucesso após 5 segundos
            setTimeout(() => setSubmitSuccess(false), 5000);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : t('contactPage.errors.tryAgain', 'Erro ao enviar mensagem. Tente novamente.'));
            console.error('Erro ao enviar contato:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F4F4]">
            {/* Banner com imagem */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
                <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FFE5A0] to-[#F8D882]">
                    <Image
                        src="/banner_contato.webp"
                        alt={t('contactPage.bannerAlt', 'Banner Contato')}
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* Área de texto - posicionada sobre a parte branca/nuvem da imagem */}
                    <div className="absolute inset-0 flex items-center justify-end xl:pr-70">
                        <div className="max-w-[250px] md:max-w-md ">
                            <h1 className="font-scripter text-2xl lg:text-6xl font-bold pl-4 md:pl-12 mb-2 md:mb-3 leading-tight text-[rgb(131,71,26)]">
                                {t('contactPage.title', 'CONTATO')}
                            </h1>
                            <p className=" text-xs md:text-sm lg:text-md pl-4 md:pl-12 min-md:w-1/2 text-[#8B4513] font-medium leading-snug">
                                {t('contactPage.subtitle', 'Entre em contato a qualquer momento, retornarei o mais rápido possível!')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-10 md:py-14 ">

                {/* Formulário de contato */}
                <div className="bg-white rounded-xl shadow-md p-8 md:p-10 mb-10">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
                            <Mail className="w-8 h-8 text-[#FED466]" />
                            {t('contactPage.form.title', 'Envie sua Mensagem')}
                        </h2>
                        <p className="text-gray-600">
                            {t('contactPage.form.subtitle', 'Para dúvidas, solicitações, serviços, reclamações ou agradecimento:')}
                        </p>
                    </div>

                    {submitSuccess && (
                        <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                            <p className="text-green-800 font-medium">
                                {t('contactPage.success', 'Mensagem enviada com sucesso! Retornarei em breve.')}
                            </p>
                        </div>
                    )}

                    {submitError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                            <p className="text-red-800 font-medium">{submitError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                        <div>
                            <Label htmlFor="name" className="text-gray-800 font-semibold mb-2 block text-base">
                                {t('contactPage.form.name', 'Nome')} *
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('contactPage.form.namePlaceholder', 'Seu nome completo')}
                                className="w-full text-base py-6"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-gray-800 font-semibold mb-2 block text-base">
                                {t('contactPage.form.email', 'E-mail')} *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t('contactPage.form.emailPlaceholder', 'seu@email.com')}
                                className="w-full text-base py-6"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <Label htmlFor="message" className="text-gray-800 font-semibold mb-2 block text-base">
                                {t('contactPage.form.message', 'Mensagem')} *
                            </Label>
                            <Textarea
                                id="message"
                                required
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder={t('contactPage.form.messagePlaceholder', 'Escreva sua mensagem aqui...')}
                                className="w-full min-h-[180px] text-base resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#FED466] hover:bg-[#FD9555] text-black font-bold py-7 text-lg rounded-lg transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                    {t('contactPage.form.sending', 'Enviando...')}
                                </>
                            ) : (
                                t('contactPage.form.send', 'Enviar Mensagem')
                            )}
                        </Button>
                    </form>
                </div>

                {/* Card de WhatsApp */}
                <div className="mx-auto">
                    <div className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-all">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <MessageSquare className="w-14 h-14 text-[#FED466]" />
                            <h3 className="text-2xl font-bold text-gray-900">{t('contactPage.whatsapp.title', 'WhatsApp')}</h3>
                            <p className="text-gray-600">
                                {t('contactPage.whatsapp.subtitle', 'Entre em contato pelo WhatsApp')}
                            </p>
                            <Button
                                asChild
                                className="w-full bg-[#FED466] hover:bg-[#FD9555] text-black font-semibold text-lg py-6"
                            >
                                <a
                                    href="https://wa.me/5511998274504?text=Olá!%20Gostaria%20de%20mais%20informações."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t('contactPage.whatsapp.number', '(11) 99827-4504')}
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}