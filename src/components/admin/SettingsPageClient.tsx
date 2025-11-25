'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Globe, Shield, Search, Layout, Mail, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SettingsData {
    siteName: string
    siteDescription: string
    siteUrl: string
    supportEmail: string
    pixEnabled: boolean
    stripeEnabled: boolean
    maxDownloadsPerProduct: number
    downloadLinkExpiration: number
    enableWatermark: boolean
    metaTitle: string
    metaDescription: string
    metaKeywords: string
    googleAnalyticsId: string
    facebookPixelId: string
    // Afiliados
    affiliateEnabled: boolean
    affiliateDefaultCommission: string
    affiliateMinPayout: string
    affiliateCookieDays: number
}

interface EnvStatus {
    stripe: boolean
    mercadoPago: boolean
    paypal: boolean
    resend: boolean
    cloudflareR2: boolean
    cloudinary: boolean
}

export default function SettingsPageClient() {
    const { showToast } = useToast()
    const [settings, setSettings] = useState<SettingsData>({
        siteName: '',
        siteDescription: '',
        siteUrl: '',
        supportEmail: '',
        pixEnabled: true,
        stripeEnabled: true,
        maxDownloadsPerProduct: 3,
        downloadLinkExpiration: 24,
        enableWatermark: false,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        googleAnalyticsId: '',
        facebookPixelId: '',
        affiliateEnabled: false,
        affiliateDefaultCommission: '10.00',
        affiliateMinPayout: '50.00',
        affiliateCookieDays: 30,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [envStatus, setEnvStatus] = useState<EnvStatus>({
        stripe: false,
        mercadoPago: false,
        paypal: false,
        resend: false,
        cloudflareR2: false,
        cloudinary: false,
    })

    useEffect(() => {
        loadSettings()
        checkEnvVariables()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const checkEnvVariables = async () => {
        try {
            const response = await fetch('/api/admin/env-status')
            if (response.ok) {
                const data = await response.json()
                setEnvStatus(data)
            }
        } catch (error) {
            console.error('Erro ao verificar variáveis de ambiente:', error)
        }
    }

    const loadSettings = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/settings')
            if (response.ok) {
                const data = await response.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error)
            showToast('Erro ao carregar configurações', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })

            if (response.ok) {
                showToast('Configurações salvas com sucesso!', 'success')
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao salvar configurações')
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar configurações'
            showToast(errorMessage, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8">Carregando configurações...</div>
    }

    return (
        <div className="p-8">
            <div className="mb-8 bg-gradient-to-r from-[#FED466] to-[#FD9555] rounded-lg p-6 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Configurações</h1>
                        <p className="text-white/90">Gerencie as configurações do sistema</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
                    <TabsTrigger value="general">
                        <Globe className="w-4 h-4 mr-2" />
                        Geral
                    </TabsTrigger>
                    <TabsTrigger value="email">
                        <Mail className="w-4 h-4 mr-2" />
                        E-mail
                    </TabsTrigger>
                    <TabsTrigger value="downloads">
                        <Shield className="w-4 h-4 mr-2" />
                        Downloads
                    </TabsTrigger>
                    <TabsTrigger value="affiliates">
                        <Users className="w-4 h-4 mr-2" />
                        Afiliados
                    </TabsTrigger>
                    <TabsTrigger value="seo">
                        <Search className="w-4 h-4 mr-2" />
                        SEO
                    </TabsTrigger>
                    <TabsTrigger value="integrations">
                        <Layout className="w-4 h-4 mr-2" />
                        Integrações
                    </TabsTrigger>
                </TabsList>

                {/* Geral */}
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações do Site</CardTitle>
                            <CardDescription>Configurações básicas do e-commerce</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="siteName">Nome do Site</Label>
                                <Input
                                    id="siteName"
                                    value={settings.siteName}
                                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                    placeholder="A Rafa Criou"
                                />
                            </div>
                            <div>
                                <Label htmlFor="siteDescription">Descrição</Label>
                                <Textarea
                                    id="siteDescription"
                                    value={settings.siteDescription}
                                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                                    placeholder="E-commerce de PDFs educacionais"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="siteUrl">URL do Site</Label>
                                <Input
                                    id="siteUrl"
                                    type="url"
                                    value={settings.siteUrl}
                                    onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                                    placeholder="https://arafacriou.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="supportEmail">Email de Suporte</Label>
                                <Input
                                    id="supportEmail"
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                    placeholder="arafacriou@gmail.com"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    E-mail para contato e suporte aos clientes
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* E-mail */}
                <TabsContent value="email" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de E-mail</CardTitle>
                            <CardDescription>Configure o envio de e-mails transacionais</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Resend Status */}
                            <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                                        <Mail className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-base font-semibold">Resend (Provedor Ativo)</Label>
                                            <Badge variant={envStatus.resend ? 'default' : 'destructive'} className="text-xs">
                                                {envStatus.resend ? 'Configurado' : 'Não configurado'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">Serviço de envio de e-mails transacionais</p>
                                    </div>
                                </div>
                                {envStatus.resend && (
                                    <div className="bg-white p-3 rounded border text-sm">
                                        <p className="font-medium mb-2">✅ E-mails configurados:</p>
                                        <ul className="list-disc ml-5 space-y-1 text-gray-700">
                                            <li>Confirmação de pedido</li>
                                            <li>Entrega de PDFs</li>
                                            <li>Redefinição de senha</li>
                                            <li>Boas-vindas (novo usuário)</li>
                                        </ul>
                                    </div>
                                )}
                                {!envStatus.resend && (
                                    <Alert className="bg-red-50 border-red-200">
                                        <AlertDescription className="text-sm text-red-800">
                                            <strong>⚠️ Resend não configurado!</strong> Adicione RESEND_API_KEY no arquivo .env.local
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Email de Remetente */}
                            <div>
                                <Label htmlFor="supportEmail">E-mail de Suporte (Remetente)</Label>
                                <Input
                                    id="supportEmail"
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                    placeholder="arafacriou@gmail.com"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    E-mail que aparecerá como remetente nas notificações
                                </p>
                            </div>

                            {/* Notificações Opcionais */}
                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-semibold mb-3">Notificações Adicionais (Opcionais)</h4>

                                {/* WhatsApp */}
                                <div className="p-3 border rounded-lg mb-3 opacity-60">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>WhatsApp (Meta Business API)</Label>
                                            <p className="text-xs text-gray-600">Notificações por WhatsApp</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">Não implementado</Badge>
                                    </div>
                                </div>

                                {/* SMS */}
                                <div className="p-3 border rounded-lg mb-3 opacity-60">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>SMS (Twilio)</Label>
                                            <p className="text-xs text-gray-600">Notificações por SMS</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">Não implementado</Badge>
                                    </div>
                                </div>

                                {/* Web Push */}
                                <div className="p-3 border rounded-lg opacity-60">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Web Push (OneSignal)</Label>
                                            <p className="text-xs text-gray-600">Notificações no navegador</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">Não implementado</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Downloads */}
                <TabsContent value="downloads" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Download</CardTitle>
                            <CardDescription>Controle segurança e limites de download de PDFs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Storage Status */}
                            <div className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-amber-50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-base font-semibold">Cloudflare R2 (Storage Privado)</Label>
                                            <Badge variant={envStatus.cloudflareR2 ? 'default' : 'destructive'} className="text-xs">
                                                {envStatus.cloudflareR2 ? 'Configurado' : 'Não configurado'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">Armazenamento seguro de PDFs com URLs assinadas</p>
                                    </div>
                                </div>
                                {envStatus.cloudflareR2 && (
                                    <Alert className="bg-white border-green-200 mt-2">
                                        <AlertDescription className="text-sm text-green-800">
                                            ✅ PDFs protegidos com acesso temporário via URLs assinadas
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Cloudinary Status (Imagens) */}
                            <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                                        <Layout className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-base font-semibold">Cloudinary (Imagens)</Label>
                                            <Badge variant={envStatus.cloudinary ? 'default' : 'destructive'} className="text-xs">
                                                {envStatus.cloudinary ? 'Configurado' : 'Não configurado'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">Armazenamento de imagens de produtos</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-4">Limites e Segurança</h4>

                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="maxDownloads">Máximo de Downloads por Produto</Label>
                                        <Input
                                            id="maxDownloads"
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={settings.maxDownloadsPerProduct}
                                            onChange={(e) => setSettings({ ...settings, maxDownloadsPerProduct: parseInt(e.target.value) || 3 })}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Número de vezes que cada cliente pode baixar o PDF após a compra
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="linkExpiration">Expiração do Link de Download (horas)</Label>
                                        <Input
                                            id="linkExpiration"
                                            type="number"
                                            min="1"
                                            max="168"
                                            value={settings.downloadLinkExpiration}
                                            onChange={(e) => setSettings({ ...settings, downloadLinkExpiration: parseInt(e.target.value) || 24 })}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Tempo de validade das URLs assinadas do R2 (recomendado: 1-24h)
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <Label htmlFor="enableWatermark">Marca d&apos;água nos PDFs</Label>
                                            <p className="text-sm text-gray-600">
                                                Adicionar watermark personalizado com e-mail do comprador
                                            </p>
                                        </div>
                                        <Switch
                                            id="enableWatermark"
                                            checked={settings.enableWatermark}
                                            onCheckedChange={(checked) => setSettings({ ...settings, enableWatermark: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertDescription className="text-sm">
                                    <strong>🔒 Segurança:</strong> Os PDFs são armazenados em bucket privado e acessados apenas
                                    via URLs assinadas temporárias. Cada download é registrado e auditado.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Afiliados */}
                <TabsContent value="affiliates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Programa de Afiliados</CardTitle>
                            <CardDescription>Configure comissões e regras para afiliados</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Ativar/Desativar Programa */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                                <div>
                                    <Label htmlFor="affiliateEnabled" className="text-base font-semibold">
                                        Programa de Afiliados
                                    </Label>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Permite que vendedores promovam seus produtos e ganhem comissões
                                    </p>
                                </div>
                                <Switch
                                    id="affiliateEnabled"
                                    checked={settings.affiliateEnabled}
                                    onCheckedChange={(checked) => setSettings({ ...settings, affiliateEnabled: checked })}
                                />
                            </div>

                            {/* Configurações de Comissão */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-4">Comissões</h4>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="affiliateDefaultCommission">
                                            Comissão Padrão (%)
                                        </Label>
                                        <Input
                                            id="affiliateDefaultCommission"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={settings.affiliateDefaultCommission}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                affiliateDefaultCommission: e.target.value
                                            })}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Percentual padrão de comissão para novos afiliados
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="affiliateMinPayout">
                                            Valor Mínimo para Saque (R$)
                                        </Label>
                                        <Input
                                            id="affiliateMinPayout"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={settings.affiliateMinPayout}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                affiliateMinPayout: e.target.value
                                            })}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Valor mínimo acumulado para solicitar pagamento
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="affiliateCookieDays">
                                            Duração do Cookie (dias)
                                        </Label>
                                        <Input
                                            id="affiliateCookieDays"
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={settings.affiliateCookieDays}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                affiliateCookieDays: parseInt(e.target.value) || 30
                                            })}
                                        />
                                        <p className="text-sm text-gray-600 mt-1">
                                            Tempo que o link de afiliado permanece válido após o clique
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Alert className="bg-purple-50 border-purple-200">
                                <AlertDescription className="text-sm">
                                    <strong>💡 Dica:</strong> O sistema detecta automaticamente fraudes como auto-referral,
                                    múltiplos pedidos do mesmo IP e taxas de conversão suspeitas. Comissões suspeitas
                                    ficam pendentes para revisão manual.
                                </AlertDescription>
                            </Alert>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/admin/afiliados'}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Gerenciar Afiliados
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/admin/afiliados/comissoes'}
                                >
                                    Gerenciar Comissões
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO */}
                <TabsContent value="seo" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO & Meta Tags</CardTitle>
                            <CardDescription>Otimização para mecanismos de busca</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="metaTitle">Título Padrão (Meta Title)</Label>
                                <Input
                                    id="metaTitle"
                                    value={settings.metaTitle}
                                    onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })}
                                    placeholder="A Rafa Criou - PDFs Educacionais"
                                />
                            </div>
                            <div>
                                <Label htmlFor="metaDescription">Descrição Padrão (Meta Description)</Label>
                                <Textarea
                                    id="metaDescription"
                                    value={settings.metaDescription}
                                    onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
                                    placeholder="Encontre os melhores PDFs educacionais para seu aprendizado"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="metaKeywords">Palavras-chave (Keywords)</Label>
                                <Input
                                    id="metaKeywords"
                                    value={settings.metaKeywords}
                                    onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })}
                                    placeholder="pdf, educação, aprendizado, ebooks"
                                />
                                <p className="text-sm text-gray-600 mt-1">Separadas por vírgula</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integrações */}
                <TabsContent value="integrations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics & Tracking</CardTitle>
                            <CardDescription>Integrações com ferramentas de análise e conversão</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="googleAnalytics">Google Analytics 4 ID</Label>
                                <Input
                                    id="googleAnalytics"
                                    value={settings.googleAnalyticsId}
                                    onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                                    placeholder="G-XXXXXXXXXX"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Tracking ID do Google Analytics 4 (GA4)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="facebookPixel">Meta Pixel ID (Facebook Pixel)</Label>
                                <Input
                                    id="facebookPixel"
                                    value={settings.facebookPixelId}
                                    onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value })}
                                    placeholder="123456789012345"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ID do Pixel do Facebook/Meta para rastreamento de conversões
                                </p>
                            </div>

                            <Alert className="bg-amber-50 border-amber-200 mt-4">
                                <AlertDescription className="text-sm">
                                    <strong>📊 Eventos rastreados:</strong>
                                    <ul className="list-disc ml-5 mt-2 space-y-1">
                                        <li>PageView (visualizações de página)</li>
                                        <li>ViewContent (visualização de produtos)</li>
                                        <li>AddToCart (adicionar ao carrinho)</li>
                                        <li>InitiateCheckout (iniciar checkout)</li>
                                        <li>Purchase (compra concluída)</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Outras Integrações</CardTitle>
                            <CardDescription>Recursos adicionais do sistema</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">Sistema de Afiliados</Label>
                                        <p className="text-xs text-gray-600">Programa de afiliados para vendedores</p>
                                    </div>
                                    <Badge variant="secondary">Planejado</Badge>
                                </div>
                            </div>

                            {/* <div className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">PWA (Progressive Web App)</Label>
                                        <p className="text-xs text-gray-600">Instalação como aplicativo mobile</p>
                                    </div>
                                    <Badge variant="secondary">Planejado</Badge>
                                </div>
                            </div> */}

                            <div className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base">Multi-idioma (i18n)</Label>
                                        <p className="text-xs text-gray-600">Interface em PT, EN e ES</p>
                                    </div>
                                    <Badge variant="secondary">Planejado</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-[#FED466] to-[#FD9555] hover:opacity-90"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    )
}
