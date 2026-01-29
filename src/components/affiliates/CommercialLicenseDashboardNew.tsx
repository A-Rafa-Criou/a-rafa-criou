'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LinkCreator from './LinkCreator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DollarSign,
    ShoppingBag,
    FileText,
    Mail,
    Phone,
    Download,
    Clock,
    Copy,
    Link2,
    Plus,
    Edit,
    Trash2,
    Package,
    Calendar,
    Eye,
    Printer,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface AffiliateData {
    id: string;
    code: string;
    name: string;
    email: string;
    totalOrders: number;
    totalRevenue: string;
    customSlug?: string;
}

interface AffiliateLink {
    id: string;
    url: string;
    shortCode: string;
    customName?: string | null;
    clicks: number;
    conversions: number;
    revenue: string;
    product: { id: string; name: string; slug: string } | null;
    isActive: boolean;
}

interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    orderTotal: string;
    status: string;
    items: Array<{ productName: string; quantity: number }>;
    createdAt: string;
}

interface FileAccess {
    id: string;
    productName: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string | null;
    grantedAt: string;
    expiresAt: string;
    viewCount: number;
    printCount: number;
    isActive: boolean;
    expired: boolean;
}

interface Material {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileName: string;
    fileType: string | null;
}

export default function CommercialLicenseDashboard() {
    const { status } = useSession();
    const router = useRouter();
    const { t } = useTranslation('common');
    const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [fileAccess, setFileAccess] = useState<FileAccess[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [links, setLinks] = useState<AffiliateLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [linkCreatorOpen, setLinkCreatorOpen] = useState(false);
    const [linkCreatorMode, setLinkCreatorMode] = useState<'create' | 'edit'>('create');
    const [editingLink, setEditingLink] = useState<{
        linkId: string;
        customName: string;
        productId: string | null;
    } | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/afiliado-comercial');
        } else if (status === 'authenticated') {
            // Carregar dados direto
            fetchAllData();
        }
    }, [status, router]);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchAffiliate(),
            fetchOrders(),
            fetchFileAccess(),
            fetchMaterials(),
            fetchLinks(),
        ]);
        setLoading(false);
    };

    const fetchAffiliate = async () => {
        try {
            const response = await fetch('/api/affiliates/me');
            const data = await response.json();
            if (response.ok) {
                setAffiliate(data.affiliate);
            }
        } catch (error) {
            console.error('Error fetching affiliate:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/affiliates/orders');
            const data = await response.json();
            if (response.ok) {
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchFileAccess = async () => {
        try {
            const response = await fetch('/api/affiliates/file-access');
            const data = await response.json();
            if (response.ok) {
                setFileAccess(data.fileAccess || []);
            }
        } catch (error) {
            console.error('Error fetching file access:', error);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await fetch('/api/affiliates/materials');
            const data = await response.json();
            if (response.ok) {
                setMaterials(data.materials || []);
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    };

    const fetchLinks = async () => {
        try {
            const response = await fetch('/api/affiliates/dashboard');
            const data = await response.json();
            if (response.ok && data.links) {
                setLinks(data.links);
            }
        } catch (error) {
            console.error('Error fetching links:', error);
        }
    };

    const handleDeleteLink = async (linkId: string) => {
        if (!confirm('Tem certeza que deseja deletar este link?')) return;

        try {
            const response = await fetch(`/api/affiliates/links/${linkId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Link deletado com sucesso!');
                fetchLinks();
            } else {
                alert('Erro ao deletar link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            alert('Erro ao deletar link');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copiado!`);
    };

    const openLinkCreator = (mode: 'create' | 'edit', link?: AffiliateLink) => {
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FED466] mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-gray-900">
                                {affiliate?.name?.split(' ')[0]}
                            </h1>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                <FileText className="w-3 h-3 mr-1" />
                                {t('affiliateDashboard.commercialLicense')}
                            </Badge>
                        </div>
                        <p className="text-gray-600">
                            {t('affiliateDashboard.accessFilesManageLinks')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">{t('affiliateDashboard.yourCode')}</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {affiliate?.customSlug || affiliate?.code}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-t-4 border-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.totalSales')}
                            </CardTitle>
                            <ShoppingBag className="w-5 h-5 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {affiliate?.totalOrders || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{t('affiliateDashboard.salesViaLinks')}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-green-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.totalRevenue')}
                            </CardTitle>
                            <DollarSign className="w-5 h-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatCurrency(parseFloat(affiliate?.totalRevenue || '0'))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{t('affiliateDashboard.generatedSales')}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {t('affiliateDashboard.activeAccesses')}
                            </CardTitle>
                            <FileText className="w-5 h-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">
                                {fileAccess.filter((f) => f.isActive && !f.expired).length}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {fileAccess.length} {t('affiliateDashboard.totalAccesses')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="links" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-4">
                        <TabsTrigger value="links">{t('affiliateDashboard.myLinks')}</TabsTrigger>
                        <TabsTrigger value="access">{t('affiliateDashboard.accesses')}</TabsTrigger>
                        <TabsTrigger value="orders">{t('affiliateDashboard.orders')}</TabsTrigger>
                        <TabsTrigger value="materials">{t('affiliateDashboard.materials')}</TabsTrigger>
                    </TabsList>

                    {/* Meus Links */}
                    <TabsContent value="links" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{t('affiliateDashboard.affiliateLinks')}</CardTitle>
                                        <CardDescription>
                                            {t('affiliateDashboard.createLinksToTrack')}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={() => openLinkCreator('create')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
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
                                            {t('affiliateDashboard.noLinksCreated')}
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            {t('affiliateDashboard.createLinksToTrack')}
                                        </p>
                                        <Button
                                            onClick={() => openLinkCreator('create')}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
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
                                                <TableHead>{t('affiliateDashboard.url')}</TableHead>
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
                                                        <div className="font-semibold">
                                                            {link.customName || t('affiliateDashboard.promotionLink')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                            {link.url.length > 50
                                                                ? `...${link.url.slice(-50)}`
                                                                : link.url}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {link.clicks}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-green-600">
                                                        {link.conversions}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(parseFloat(link.revenue))}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    copyToClipboard(link.url, 'Link')
                                                                }
                                                                className="cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openLinkCreator('edit', link)}
                                                                className="cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteLink(link.id)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
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

                    {/* Acessos aos Arquivos */}
                    <TabsContent value="access" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('affiliateDashboard.fileAccess')}</CardTitle>
                                <CardDescription>
                                    {t('affiliateDashboard.filesAvailable5Days')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {fileAccess.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {t('affiliateDashboard.noAccessAvailable')}
                                        </h3>
                                        <p className="text-gray-600">
                                            {t('affiliateDashboard.accessWillAppear')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {fileAccess.map((access) => (
                                            <div
                                                key={access.id}
                                                className={`border rounded-lg p-4 ${!access.isActive || access.expired
                                                    ? 'bg-gray-50 opacity-60'
                                                    : 'bg-white'
                                                    }`}
                                            >
                                                <div className="space-y-4">
                                                    {/* Header com produto e badges */}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Package className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                                            <h3 className="font-semibold text-lg">
                                                                {access.productName}
                                                            </h3>
                                                            {access.expired || !access.isActive ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-red-100 text-red-800 border-red-200"
                                                                >
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    {t('affiliateDashboard.expired')}
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-green-100 text-green-800 border-green-200"
                                                                >
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    {t('affiliateDashboard.active')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Informações do comprador */}
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4" />
                                                            <span className="font-medium">{t('affiliateDashboard.buyer')}:</span>
                                                            <span>{access.buyerName}</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span>{access.buyerEmail}</span>
                                                            {access.buyerPhone && (
                                                                <>
                                                                    <span className="text-gray-400">|</span>
                                                                    <Phone className="w-4 h-4" />
                                                                    <span>{access.buyerPhone}</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Datas e contadores */}
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>
                                                                    {t('affiliateDashboard.expires')}:{' '}
                                                                    {new Date(
                                                                        access.expiresAt
                                                                    ).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="flex items-center gap-1">
                                                                    <Eye className="w-4 h-4" />
                                                                    {access.viewCount} {t('affiliateDashboard.views')}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Printer className="w-4 h-4" />
                                                                    {access.printCount} {t('affiliateDashboard.prints')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Botões de ação */}
                                                    <div className="flex gap-2 pt-2 border-t">
                                                        {!access.expired && access.isActive ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        window.open(
                                                                            `/api/affiliates/file-access/${access.id}`,
                                                                            '_blank',
                                                                            'noopener,noreferrer'
                                                                        )
                                                                    }
                                                                    className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    {t('affiliateDashboard.viewFile')}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        window.open(
                                                                            `/api/affiliates/file-access/${access.id}`,
                                                                            '_blank',
                                                                            'noopener,noreferrer'
                                                                        );
                                                                    }}
                                                                    className="cursor-pointer hover:bg-gray-100"
                                                                >
                                                                    <Printer className="w-4 h-4 mr-2" />
                                                                    {t('affiliateDashboard.openToPrint')}
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                disabled
                                                                variant="outline"
                                                                className="cursor-not-allowed"
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                {t('affiliateDashboard.accessExpired')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Pedidos */}
                    <TabsContent value="orders" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('affiliateDashboard.orderHistory')}</CardTitle>
                                <CardDescription>
                                    {t('affiliateDashboard.salesThroughLinks')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {orders.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {t('affiliateDashboard.noOrdersYet')}
                                        </h3>
                                        <p className="text-gray-600">
                                            {t('affiliateDashboard.ordersWillAppear')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map((order) => (
                                            <div key={order.id} className="border rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold">
                                                                {order.customerName}
                                                            </h3>
                                                            <Badge variant="outline">
                                                                #{order.orderNumber}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-4 h-4" />
                                                                {order.customerEmail}
                                                            </span>
                                                            {order.customerPhone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="w-4 h-4" />
                                                                    {order.customerPhone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-green-600">
                                                            {formatCurrency(parseFloat(order.orderTotal))}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    {order.items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-2 text-sm text-gray-600"
                                                        >
                                                            <Package className="w-4 h-4" />
                                                            <span>{item.productName}</span>
                                                            <span className="text-gray-400">x{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Materiais */}
                    <TabsContent value="materials" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('affiliateDashboard.marketingMaterials')}</CardTitle>
                                <CardDescription>
                                    {t('affiliateDashboard.downloadMaterials')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {materials.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Download className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {t('affiliateDashboard.noMaterialsAvailable')}
                                        </h3>
                                        <p className="text-gray-600">
                                            {t('affiliateDashboard.materialsWillAppear')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {materials.map((material) => (
                                            <div
                                                key={material.id}
                                                className="flex items-start gap-4 border rounded-lg p-4 hover:border-purple-300 transition-colors"
                                            >
                                                <Download className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{material.title}</h3>
                                                    {material.description && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {material.description}
                                                        </p>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                                                        asChild
                                                    >
                                                        <a
                                                            href={material.fileUrl}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            {t('affiliateDashboard.download')} {material.fileType?.toUpperCase()}
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
            </div>

            {/* Link Creator Dialog */}
            <LinkCreator
                open={linkCreatorOpen}
                onOpenChange={setLinkCreatorOpen}
                mode={linkCreatorMode}
                initialData={editingLink || undefined}
                onSuccess={fetchLinks}
            />
        </div>
    );
}
