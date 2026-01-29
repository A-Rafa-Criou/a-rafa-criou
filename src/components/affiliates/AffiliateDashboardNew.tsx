'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LinkCreator from './LinkCreator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, type Currency } from '@/lib/currency-helpers';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import {
    TrendingUp,
    DollarSign,
    Users,
    Link2,
    Copy,
    AlertCircle,
    CheckCircle,
    Clock,
    Plus,
    Edit,
    Trash2,
    ExternalLink,
    Calendar,
    MousePointerClick,
    ShoppingCart,
    Wallet,
} from 'lucide-react';

interface DashboardData {
    status: string;
    message?: string;
    affiliate?: {
        id: string;
        code: string;
        name: string;
        email: string;
        commissionRate: string;
        pixKey: string | null;
        customSlug?: string;
    };
    stats?: {
        totalClicks: number;
        totalConversions: number;
        totalRevenue: string;
        pendingCommission: string;
        paidCommission: string;
        conversionRate: string;
        last30Days: {
            clicks: number;
            conversions: number;
            revenue: string;
        };
    };
    links?: Array<{
        id: string;
        url: string;
        shortCode: string;
        customName?: string | null;
        clicks: number;
        conversions: number;
        revenue: string;
        product: { id: string; name: string; slug: string } | null;
        isActive: boolean;
    }>;
    commissions?: Array<{
        id: string;
        orderTotal: string;
        commissionRate: string;
        commissionAmount: string;
        currency: Currency;
        status: string;
        createdAt: string;
        approvedAt: string | null;
        paidAt: string | null;
    }>;
}

export default function AffiliateDashboard() {
    const { status } = useSession();
    const router = useRouter();
    const { t } = useTranslation('common');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [linkCreatorOpen, setLinkCreatorOpen] = useState(false);
    const [linkCreatorMode, setLinkCreatorMode] = useState<'create' | 'edit'>('create');
    const [editingLink, setEditingLink] = useState<{
        linkId: string;
        customName: string;
        productId: string | null;
    } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/afiliado-comum');
        } else if (status === 'authenticated') {
            // Carregar dados direto sem verificação extra
            fetchDashboard();
        }
    }, [status, router]);

    const fetchDashboard = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/affiliates/dashboard');
            const result = await response.json();

            // Verificar se não é afiliado ou é tipo errado
            if (result.status === 'not_affiliate') {
                showToast('Você não é um afiliado', 'error');
                router.push('/seja-afiliado');
                return;
            }

            setData(result);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            showToast('Erro ao carregar dashboard', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Link copiado!', 'success');
    };

    const handleDeleteLink = async (linkId: string, linkName: string) => {
        if (!confirm(`Tem certeza que deseja deletar o link "${linkName}"?`)) return;

        try {
            const response = await fetch(`/api/affiliates/links/${linkId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                showToast('Link deletado com sucesso', 'success');
                fetchDashboard();
            } else {
                showToast('Erro ao deletar link', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar link:', error);
            showToast('Erro ao deletar link', 'error');
        }
    };

    const openLinkCreator = (mode: 'create' | 'edit', link?: any) => {
        setLinkCreatorMode(mode);
        if (mode === 'edit' && link) {
            setEditingLink({
                linkId: link.id,
                customName: link.customName || '',
                productId: link.product?.id || null,
            });
        } else {
            setEditingLink(null);
        }
        setLinkCreatorOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; label: string; icon: React.ElementType }> = {
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: Clock },
            approved: { color: 'bg-blue-100 text-blue-800', label: 'Aprovada', icon: CheckCircle },
            paid: { color: 'bg-green-100 text-green-800', label: 'Paga', icon: CheckCircle },
            cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelada', icon: AlertCircle },
        };

        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FED466] mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('affiliateDashboard.loadingDashboard')}</p>
                </div>
            </div>
        );
    }

    // Status: Pending
    if (data?.status === 'pending') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 p-6">
                <div className="max-w-2xl mx-auto mt-20">
                    <Card className="border-t-4 border-yellow-500">
                        <CardHeader className="text-center pb-8">
                            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                                <Clock className="w-12 h-12 text-yellow-600" />
                            </div>
                            <CardTitle className="text-3xl">{t('affiliateDashboard.applicationUnderReview')}</CardTitle>
                            <CardDescription className="text-lg mt-2">
                                {data.message || t('affiliateDashboard.reviewingApplication')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4 pb-8">
                            <p className="text-gray-600">
                                {t('affiliateDashboard.emailNotification')}
                            </p>
                            <Button
                                onClick={() => router.push('/')}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                {t('affiliateDashboard.backToHome')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Status: Inactive/Suspended
    if (data?.status === 'inactive' || data?.status === 'suspended') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 p-6">
                <div className="max-w-2xl mx-auto mt-20">
                    <Card className="border-t-4 border-red-500">
                        <CardHeader className="text-center pb-8">
                            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <CardTitle className="text-3xl">{t('affiliateDashboard.account')} {data.status === 'suspended' ? t('affiliateDashboard.suspended') : t('affiliateDashboard.inactive')}</CardTitle>
                            <CardDescription className="text-lg mt-2">
                                {data.message || t('affiliateDashboard.accountNotActive')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center pb-8">
                            <Button
                                onClick={() => router.push('/contato')}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                {t('affiliateDashboard.contactUs')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const stats = data?.stats;
    const affiliate = data?.affiliate;
    const links = data?.links || [];
    const commissions = data?.commissions || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">
                            {t('affiliateDashboard.hello')}, {affiliate?.name?.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-gray-600 mt-2">{t('affiliateDashboard.trackPerformance')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">{t('affiliateDashboard.yourCode')}</p>
                        <p className="text-2xl font-bold text-[#FD9555]">{affiliate?.customSlug || affiliate?.code}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-t-4 border-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.totalClicks')}
                            </CardTitle>
                            <MousePointerClick className="w-5 h-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats?.totalClicks || 0}</div>
                            <p className="text-xs text-gray-500 mt-2">
                                {stats?.last30Days.clicks || 0} {t('affiliateDashboard.last30Days')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-green-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.conversions')}
                            </CardTitle>
                            <ShoppingCart className="w-5 h-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stats?.totalConversions || 0}</div>
                            <p className="text-xs text-gray-500 mt-2">
                                {stats?.conversionRate || '0'}% {t('affiliateDashboard.conversionRate')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-[#FD9555]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.totalRevenue')}
                            </CardTitle>
                            <DollarSign className="w-5 h-5 text-[#FD9555]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatCurrency(stats?.totalRevenue || '0', 'BRL')}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {formatCurrency(stats?.last30Days.revenue || '0', 'BRL')} {t('affiliateDashboard.thisMonth')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-[#FED466]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.commissions')}
                            </CardTitle>
                            <Wallet className="w-5 h-5 text-[#FED466]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-green-600">
                                {formatCurrency(stats?.paidCommission || '0', 'BRL')}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('affiliateDashboard.pending')}: {formatCurrency(stats?.pendingCommission || '0', 'BRL')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="links" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="links">{t('affiliateDashboard.myLinks')}</TabsTrigger>
                        <TabsTrigger value="commissions">{t('affiliateDashboard.commissions')}</TabsTrigger>
                    </TabsList>

                    {/* Meus Links */}
                    <TabsContent value="links" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{t('affiliateDashboard.affiliateLinks')}</CardTitle>
                                        <CardDescription>
                                            {t('affiliateDashboard.createLinksDesc')}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={() => openLinkCreator('create')}
                                        className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {t('affiliateDashboard.newLink')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {links.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Link2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {t('affiliateDashboard.noLinksYet')}
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            {t('affiliateDashboard.createLinksDesc')}
                                        </p>
                                        <Button
                                            onClick={() => openLinkCreator('create')}
                                            className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {t('affiliateDashboard.createFirstLink')}
                                        </Button>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('affiliateDashboard.linkName')}</TableHead>
                                                <TableHead>URL</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.clicks')}</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.sales')}</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.revenue')}</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {links.map((link) => (
                                                <TableRow key={link.id}>
                                                    <TableCell>
                                                        <div className="font-semibold text-gray-900">
                                                            {link.customName || 'Link de Divulgação'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                                {link.url.length > 50
                                                                    ? `...${link.url.slice(-50)}`
                                                                    : link.url}
                                                            </code>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-semibold">{link.clicks}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-semibold text-green-600">
                                                            {link.conversions}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(link.revenue, 'BRL')}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => copyToClipboard(link.url)}
                                                                title="Copiar link"
                                                                className="cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openLinkCreator('edit', link)}
                                                                title="Editar"
                                                                className="cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleDeleteLink(
                                                                        link.id,
                                                                        link.customName || link.product?.name || 'Link'
                                                                    )
                                                                }
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                                                title="Deletar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Comissões */}
                    <TabsContent value="commissions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('affiliateDashboard.commissionHistory')}</CardTitle>
                                <CardDescription>
                                    {t('affiliateDashboard.trackCommissions')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {commissions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {t('affiliateDashboard.noCommissionsYet')}
                                        </h3>
                                        <p className="text-gray-600">
                                            {t('affiliateDashboard.commissionsWillAppear')}
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('affiliateDashboard.date')}</TableHead>
                                                <TableHead>{t('affiliateDashboard.order')}</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.rate')}</TableHead>
                                                <TableHead className="text-right">{t('affiliateDashboard.commission')}</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {commissions.map((commission) => (
                                                <TableRow key={commission.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {formatCurrency(commission.orderTotal, commission.currency)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {commission.commissionRate}%
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-green-600">
                                                        {formatCurrency(commission.commissionAmount, commission.currency)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(commission.status)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Alerta PIX */}
                        {!affiliate?.pixKey && (
                            <Card className="border-yellow-200 bg-yellow-50">
                                <CardHeader>
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                                        <div>
                                            <CardTitle className="text-yellow-900">{t('affiliateDashboard.setupPixKey')}</CardTitle>
                                            <CardDescription className="text-yellow-700 mt-2">
                                                {t('affiliateDashboard.pixKeyRequired')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Link Creator Dialog */}
            <LinkCreator
                open={linkCreatorOpen}
                onOpenChange={setLinkCreatorOpen}
                mode={linkCreatorMode}
                initialData={editingLink || undefined}
                onSuccess={fetchDashboard}
            />
        </div>
    );
}
