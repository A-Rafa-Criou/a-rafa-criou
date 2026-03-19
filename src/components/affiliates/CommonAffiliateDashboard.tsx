'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    TrendingUp,
    Users,
    DollarSign,
    Link as LinkIcon,
    Download,
    Copy,
    Check,
    Eye,
    Mail,
    Phone,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Pencil,
    Globe,
    Video,
    Image,
    FileText,
    Archive,
    File,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CommissionMural from '@/components/affiliates/CommissionMural';
import AffiliateBulletinBoard from '@/components/affiliates/AffiliateBulletinBoard';
import { useToast } from '@/hooks/use-toast';

interface AffiliateData {
    id: string;
    code: string;
    name: string;
    email: string;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: string;
    totalCommission: string;
    pendingCommission: string;
    paidCommission: string;
    commissionValue: string;
    contractDocumentUrl?: string | null;
    preferredPaymentMethod?: string | null;
    paymentAutomationEnabled?: boolean | null;
    pixKey?: string | null;
    customSlug?: string | null;
    stripeOnboardingStatus?: string | null;
    stripePayoutsEnabled?: boolean | null;
    mercadopagoAccountId?: string | null;
    mercadopagoSplitStatus?: string | null;
    mercadopagoPayoutsEnabled?: boolean | null;
}

interface Sale {
    id: string;
    orderNumber: string | null;
    customerName: string | null;
    customerEmail: string;
    customerPhone: string | null;
    orderTotal: string;
    currency: string; // BRL, USD, EUR
    commissionAmount: string | null; // Pode ser null para produtos FREE
    status: string;
    createdAt: string;
    commissionStatus?: string | null; // Status da comissão
    paymentStatus?: string; // Status do pagamento do pedido
}

interface Material {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
}

function getMaterialIcon(fileType: string | null) {
    switch (fileType) {
        case 'image': return <Image className="mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-blue-500" />;
        case 'video': return <Video className="mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-500" />;
        case 'pdf': return <FileText className="mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-red-500" />;
        case 'zip': return <Archive className="mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-500" />;
        default: return <File className="mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-gray-500" />;
    }
}

function getMaterialActionLabel(fileType: string | null) {
    switch (fileType) {
        case 'video': return 'Baixar Vídeo';
        case 'image': return 'Baixar Imagem';
        case 'pdf': return 'Baixar PDF';
        case 'zip': return 'Baixar ZIP';
        default: return 'Baixar Arquivo';
    }
}

function formatMaterialSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CommonAffiliateDashboard({ affiliate }: { affiliate: AffiliateData }) {
    const { toast } = useToast();
    const [sales, setSales] = useState<Sale[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [connectingMP, setConnectingMP] = useState(false);
    const [showEditSlugDialog, setShowEditSlugDialog] = useState(false);
    const [customSlug, setCustomSlug] = useState(affiliate.customSlug || '');
    const [updatingSlug, setUpdatingSlug] = useState(false);

    const currentSlug = affiliate.customSlug || affiliate.code;
    const affiliateLink = `${window.location.origin}?ref=${currentSlug}`;

    useEffect(() => {
        fetchSales();
        fetchMaterials();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await fetch('/api/affiliates/sales');
            const data = await response.json();

            if (response.ok && data.success) {
                setSales(data.sales || []);
            } else if (response.status === 429) {
                toast({
                    title: 'Atualização temporariamente limitada',
                    description: 'Aguarde alguns segundos para atualizar suas vendas novamente.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('[Dashboard] Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await fetch('/api/affiliates/materials');
            const data = await response.json();
            if (response.ok) {
                setMaterials(data.materials || []);
            } else if (response.status === 429) {
                toast({
                    title: 'Atualização temporariamente limitada',
                    description: 'Aguarde alguns segundos para atualizar os materiais novamente.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(affiliateLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConnectMercadoPago = async () => {
        setConnectingMP(true);
        try {
            const response = await fetch('/api/affiliates/onboarding/mercadopago/start', {
                method: 'POST',
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 429) {
                    toast({
                        title: 'Muitas tentativas',
                        description: 'Aguarde alguns segundos antes de tentar conectar novamente.',
                        variant: 'destructive',
                    });
                } else {
                    toast({
                        title: 'Erro ao conectar Mercado Pago',
                        description: data.error || data.details || 'Erro ao iniciar conexão com Mercado Pago',
                        variant: 'destructive',
                    });
                }
                return;
            }
            window.location.href = data.url;
        } catch {
            toast({
                title: 'Erro de rede',
                description: 'Erro de rede ao conectar Mercado Pago. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setConnectingMP(false);
        }
    };

    const handleUpdateSlug = async () => {
        setUpdatingSlug(true);
        try {
            const response = await fetch('/api/affiliates/slug', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customSlug }),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: 'Slug atualizado com sucesso',
                    description: 'A página será recarregada para aplicar o novo link.',
                });
                window.location.reload();
            } else {
                toast({
                    title: 'Erro ao atualizar slug',
                    description: result.error || result.details || 'Erro ao atualizar slug',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar slug:', error);
            toast({
                title: 'Erro ao atualizar slug',
                description: 'Não foi possível atualizar o slug. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setUpdatingSlug(false);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-4 sm:py-8">
            {/* Mural de Notícias */}
            <AffiliateBulletinBoard />

            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard de Afiliado</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Bem-vindo, {affiliate.name}!</p>
                    </div>
                    <Badge className="bg-green-600 w-fit">Afiliado Comum</Badge>
                </div>
            </div>

            {/* Alerta: Nenhum método de pagamento configurado */}
            {!affiliate.stripePayoutsEnabled && !affiliate.mercadopagoPayoutsEnabled && !affiliate.mercadopagoAccountId && (
                <Alert variant="destructive" className="mb-6 sm:mb-8">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <div className="ml-2 flex-1">
                        <div className="font-bold text-base sm:text-lg">
                            {affiliate.stripeOnboardingStatus === 'pending'
                                ? '⏳ Configuração em Análise'
                                : '⚠️ Configure um Método de Pagamento para Receber Automaticamente!'}
                        </div>
                        <AlertDescription className="mt-2">
                            {affiliate.stripeOnboardingStatus === 'pending' ? (
                                <p className="mb-2 text-xs sm:text-sm">
                                    Sua conta está sendo verificada. Assim que aprovada, suas comissões serão pagas <strong>automaticamente</strong> após cada venda.
                                </p>
                            ) : (
                                <>
                                    <p className="mb-2 text-xs sm:text-sm">
                                        Para receber suas comissões <strong>automaticamente</strong> após cada venda, conecte Stripe ou Mercado Pago.
                                        Sem isso, os pagamentos precisam ser feitos manualmente.
                                    </p>
                                    <p className="text-xs sm:text-sm mb-3">
                                        Sua comissão: <strong>{affiliate.commissionValue}%</strong> sobre cada venda.
                                    </p>
                                </>
                            )}
                            <Link href="/afiliados-da-rafa/configurar-pagamentos">
                                <Button size="sm" variant="default" className="bg-white text-red-600 hover:bg-gray-100 text-xs sm:text-sm w-full sm:w-auto">
                                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    Configurar Pagamentos
                                </Button>
                            </Link>
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            {/* Badge: Pagamento automático ativo */}
            {(affiliate.stripePayoutsEnabled || affiliate.mercadopagoPayoutsEnabled) && (
                <Alert className="mb-6 sm:mb-8 border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <div className="ml-2">
                        <div className="font-bold text-green-800 text-sm sm:text-base">✅ Pagamento Automático Ativo</div>
                        <AlertDescription className="text-green-700 text-xs sm:text-sm">
                            Suas comissões são transferidas automaticamente via {affiliate.stripePayoutsEnabled && affiliate.mercadopagoPayoutsEnabled ? 'Stripe Connect e Mercado Pago' : affiliate.stripePayoutsEnabled ? 'Stripe Connect' : 'Mercado Pago'} após cada venda confirmada.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            {/* Mural de Comissão */}
            <div className="mb-6 sm:mb-8">
                <CommissionMural currentRate={affiliate.commissionValue} />
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.totalClicks}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Pendente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(parseFloat(affiliate.pendingCommission))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Paga</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(parseFloat(affiliate.paidCommission))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Código Personalizado */}
            <Card className="mb-6 sm:mb-8 border-primary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        Seu Código de Afiliado
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Este código aparece em todos os seus links (?ref=seu-codigo)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted rounded-lg">
                        <div className="flex-1">
                            <div className="text-sm text-muted-foreground mb-1">Código atual:</div>
                            <code className="text-lg font-mono font-semibold">{currentSlug}</code>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setCustomSlug(affiliate.customSlug || '');
                                    setShowEditSlugDialog(true);
                                }}
                                className="flex-1 sm:flex-none"
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Personalizar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(currentSlug);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex-1 sm:flex-none"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Link de Afiliado */}
            <Card className="mb-6 sm:mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        Seu Link de Afiliado
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Compartilhe este link para ganhar comissões. Qualquer compra feita por
                        quem acessar será rastreada para você.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={affiliateLink}
                            readOnly
                            aria-label="Link de afiliado"
                            placeholder="Seu link de afiliado"
                            className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs sm:text-sm font-mono"
                        />
                        <Button onClick={copyLink} variant="outline" className="w-full sm:w-auto">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span className="ml-2">{copied ? 'Copiado!' : 'Copiar'}</span>
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Seu código: <code className="font-mono font-semibold bg-muted px-1 rounded">{currentSlug}</code>
                        {' '} — este código é adicionado automaticamente em todos os links acima.
                    </p>
                </CardContent>
            </Card>

            {/* Pagamentos Automáticos - Status dos 3 métodos */}
            <Card className="mb-6 sm:mb-8 border-2 border-primary/20">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            <CardTitle className="text-lg sm:text-xl">Receber Comissões</CardTitle>
                        </div>
                        {affiliate.preferredPaymentMethod && (
                            <Badge variant="secondary" className="w-fit text-xs">
                                Método ativo: {affiliate.preferredPaymentMethod === 'stripe_connect' ? 'Stripe Connect' : affiliate.preferredPaymentMethod === 'mercadopago_split' ? 'Mercado Pago' : 'PIX Manual'}
                            </Badge>
                        )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm">
                        Configure como você deseja receber suas comissões. Conecte pelo menos um método abaixo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Stripe Connect */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${affiliate.stripePayoutsEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm sm:text-base">Stripe Connect</p>
                                    {affiliate.stripePayoutsEnabled ? (
                                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Conectado</Badge>
                                    ) : affiliate.stripeOnboardingStatus === 'pending' ? (
                                        <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">Em análise</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Não conectado</Badge>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Receba automaticamente após cada venda (Internacional + Brasil)
                                </p>
                            </div>
                        </div>
                        <Link href="/afiliados-da-rafa/configurar-pagamentos" className="w-full sm:w-auto">
                            <Button
                                variant={affiliate.stripePayoutsEnabled ? 'outline' : 'default'}
                                size="sm"
                                className={`w-full sm:w-auto text-sm ${!affiliate.stripePayoutsEnabled ? 'bg-primary hover:bg-primary/90' : ''}`}
                            >
                                {affiliate.stripePayoutsEnabled ? 'Ver Status' : 'Conectar Stripe'}
                            </Button>
                        </Link>
                    </div>

                    {/* Mercado Pago Split */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${(affiliate.mercadopagoPayoutsEnabled || affiliate.mercadopagoSplitStatus === 'completed') ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <CreditCard className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm sm:text-base">Mercado Pago</p>
                                    {(affiliate.mercadopagoPayoutsEnabled || affiliate.mercadopagoSplitStatus === 'completed') ? (
                                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Conectado</Badge>
                                    ) : affiliate.mercadopagoAccountId ? (
                                        <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">Em análise</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Não conectado</Badge>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {affiliate.mercadopagoAccountId
                                        ? `Conta: ${affiliate.mercadopagoAccountId}`
                                        : 'Receba via PIX automático pelo Mercado Pago (Brasil)'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {affiliate.mercadopagoAccountId ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto text-sm text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={async () => {
                                        if (!confirm('Tem certeza que deseja desvincular sua conta Mercado Pago?')) return;
                                        try {
                                            const res = await fetch('/api/affiliates/onboarding/mercadopago/disconnect', { method: 'POST' });
                                            if (res.ok) {
                                                window.location.reload();
                                            } else {
                                                toast({
                                                    title: 'Erro ao desvincular conta',
                                                    description: res.status === 429
                                                        ? 'Muitas tentativas. Aguarde alguns segundos e tente novamente.'
                                                        : 'Erro ao desvincular. Tente novamente.',
                                                    variant: 'destructive',
                                                });
                                            }
                                        } catch {
                                            toast({
                                                title: 'Erro ao desvincular conta',
                                                description: 'Erro de rede ao desvincular. Tente novamente.',
                                                variant: 'destructive',
                                            });
                                        }
                                    }}
                                >
                                    Desvincular
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    className="w-full sm:w-auto text-sm bg-primary hover:bg-primary/90"
                                    onClick={handleConnectMercadoPago}
                                    disabled={connectingMP}
                                >
                                    {connectingMP ? 'Conectando...' : 'Conectar Mercado Pago'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* PIX Manual */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${affiliate.pixKey ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm sm:text-base">PIX Manual</p>
                                    {affiliate.pixKey ? (
                                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Chave cadastrada</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Sem chave</Badge>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {affiliate.pixKey
                                        ? `Chave: ${affiliate.pixKey.substring(0, 10)}...`
                                        : 'Pagamento manual pelo admin via PIX'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="sales" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sales" className="text-xs sm:text-sm">Minhas Vendas</TabsTrigger>
                    <TabsTrigger value="materials" className="text-xs sm:text-sm">Materiais</TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl">Histórico de Vendas</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Clientes que compraram através do seu link</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="py-8 text-center">
                                    <p className="text-muted-foreground">Carregando vendas...</p>
                                </div>
                            ) : sales.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-muted-foreground">
                                        Nenhuma venda ainda. Comece a divulgar seu link!
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        💡 Copie seu link acima e compartilhe nas redes sociais
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sales.map(sale => (
                                        <div
                                            key={sale.id}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 gap-3 sm:gap-0"
                                        >
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-sm sm:text-base">
                                                        {sale.customerName || sale.customerEmail}
                                                    </h3>
                                                    {sale.orderNumber && (
                                                        <Badge variant="outline" className="text-xs">
                                                            #{sale.orderNumber}
                                                        </Badge>
                                                    )}
                                                    {parseFloat(sale.orderTotal || '0') === 0 && (
                                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                                            FREE
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex flex-col sm:flex-row sm:gap-4 gap-1 text-xs sm:text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        <span className="truncate">{sale.customerEmail}</span>
                                                    </span>
                                                    {sale.customerPhone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {sale.customerPhone}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <p className="text-xs sm:text-sm text-muted-foreground">Valor da Venda</p>
                                                <p className="font-semibold text-sm sm:text-base">
                                                    {parseFloat(sale.orderTotal || '0') === 0 ? (
                                                        <span className="text-blue-600">GRATUITO 🎁</span>
                                                    ) : (
                                                        formatCurrency(parseFloat(sale.orderTotal), sale.currency || 'BRL')
                                                    )}
                                                </p>
                                                <p className="text-xs sm:text-sm">
                                                    {sale.commissionAmount && parseFloat(sale.commissionAmount) > 0 ? (
                                                        <span className="text-green-600">
                                                            +{formatCurrency(parseFloat(sale.commissionAmount), sale.currency || 'BRL')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sem comissão</span>
                                                    )}
                                                </p>
                                                {/* Status da comissão */}
                                                {sale.commissionStatus && (
                                                    <div className="mt-1">
                                                        {sale.commissionStatus === 'paid' ? (
                                                            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Pago
                                                            </Badge>
                                                        ) : sale.commissionStatus === 'approved' ? (
                                                            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Comissão Aprovada
                                                            </Badge>
                                                        ) : sale.commissionStatus === 'pending' ? (
                                                            <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                                Em Análise
                                                            </Badge>
                                                        ) : sale.commissionStatus === 'cancelled' ? (
                                                            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                                                                Cancelada
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl">Materiais de Divulgação</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Baixe materiais para divulgar seus links nas redes sociais
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {materials.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground text-sm">
                                    Nenhum material disponível no momento
                                </p>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {materials.map(material => (
                                        <div key={material.id} className="flex items-start gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
                                            {getMaterialIcon(material.fileType)}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm sm:text-base">{material.title}</h3>
                                                {material.description && (
                                                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{material.description}</p>
                                                )}
                                                {material.fileSize && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatMaterialSize(material.fileSize)}
                                                    </p>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="mt-3 w-full sm:w-auto text-xs"
                                                    asChild
                                                >
                                                    <a
                                                        href={material.fileUrl}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => {
                                                            fetch(`/api/affiliates/materials/${material.id}/download`, { method: 'POST' }).catch(() => { });
                                                        }}
                                                    >
                                                        <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                                        {getMaterialActionLabel(material.fileType)}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog: Personalizar Slug */}
            <Dialog open={showEditSlugDialog} onOpenChange={setShowEditSlugDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Personalizar Código de Afiliado</DialogTitle>
                        <DialogDescription>
                            Crie um código único e profissional para seus links
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="customSlug">Código Personalizado</Label>
                            <Input
                                id="customSlug"
                                value={customSlug}
                                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="Ex: seu-nome, sua-marca"
                                maxLength={50}
                                className="mt-2"
                            />
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <p>• Apenas letras minúsculas, números e hífen</p>
                                <p>• Mínimo 3 caracteres</p>
                                <p>• Exemplo: ?ref={customSlug || 'seu-codigo'}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <strong>Dica:</strong> Use um código profissional e fácil de lembrar, como seu nome ou marca.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditSlugDialog(false);
                                    setCustomSlug(affiliate.customSlug || '');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleUpdateSlug}
                                disabled={!customSlug || customSlug.length < 3 || updatingSlug}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                {updatingSlug ? 'Salvando...' : 'Salvar Código'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
