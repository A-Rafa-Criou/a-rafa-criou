'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CommercialLicenseDashboard from './CommercialLicenseDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, type Currency } from '@/lib/currency-helpers';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    TrendingUp,
    DollarSign,
    Users,
    Link2,
    Copy,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
    Plus,
    Edit,
    Trash2,
    Pencil,
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
        bankName: string | null;
        bankAccount: string | null;
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
        paymentProof?: string | null;
    }>;
}

export default function AffiliateDashboard() {
    const { status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [affiliateType, setAffiliateType] = useState<'common' | 'commercial_license' | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showEditLinkDialog, setShowEditLinkDialog] = useState(false);
    const [showEditSlugDialog, setShowEditSlugDialog] = useState(false);
    const [customSlug, setCustomSlug] = useState('');
    const [editingLink, setEditingLink] = useState<{ id: string; name: string } | null>(null);
    const [editData, setEditData] = useState({ pixKey: '', bankName: '', bankAccount: '' });
    const { showToast } = useToast();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
        } else if (status === 'authenticated') {
            checkAffiliateStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, router]);

    const checkAffiliateStatus = async () => {
        try {
            const response = await fetch('/api/user/affiliate-status');
            const affiliateStatus = await response.json();

            if (!affiliateStatus.isAffiliate) {
                showToast('Você precisa ser um afiliado para acessar esta página', 'error');
                router.push('/seja-afiliado');
                return;
            }

            if (affiliateStatus.status === 'suspended') {
                showToast('Sua conta de afiliado está suspensa', 'error');
                router.push('/');
                return;
            }

            // Salvar tipo de afiliado
            setAffiliateType(affiliateStatus.affiliateType);

            fetchDashboard();
        } catch (error) {
            console.error('Erro ao verificar status de afiliado:', error);
            router.push('/');
        }
    };

    const fetchDashboard = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/affiliates/dashboard');
            const result = await response.json();
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



    const handleEditProfile = async () => {
        try {
            const response = await fetch('/api/affiliates/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                showToast('Dados atualizados com sucesso!', 'success');
                setShowEditDialog(false);
                fetchDashboard();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar dados', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            showToast('Erro ao atualizar dados', 'error');
        }
    };

    const handleDeleteLink = async (linkId: string) => {
        if (!confirm('Tem certeza que deseja deletar este link?')) {
            return;
        }

        try {
            const response = await fetch(`/api/affiliates/links/${linkId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                showToast('Link deletado com sucesso!', 'success');
                fetchDashboard();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao deletar link', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar link:', error);
            showToast('Erro ao deletar link', 'error');
        }
    };

    const handleEditLink = async () => {
        if (!editingLink) return;

        try {
            const response = await fetch(`/api/affiliates/links/${editingLink.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customName: editingLink.name }),
            });

            if (response.ok) {
                showToast('Nome do link atualizado!', 'success');
                setShowEditLinkDialog(false);
                setEditingLink(null);
                fetchDashboard();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar link', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar link:', error);
            showToast('Erro ao atualizar link', 'error');
        }
    };

    const handleUpdateSlug = async () => {
        try {
            const response = await fetch('/api/affiliates/slug', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customSlug }),
            });

            const result = await response.json();

            if (response.ok) {
                showToast('Slug personalizado atualizado!', 'success');
                setShowEditSlugDialog(false);
                fetchDashboard();
            } else {
                showToast(result.error || result.details || 'Erro ao atualizar slug', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar slug:', error);
            showToast('Erro ao atualizar slug', 'error');
        }
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
            <div className="min-h-screen bg-[#F4F4F4] p-6">
                <div className="text-center py-12">Carregando...</div>
            </div>
        );
    }

    // Se for licença comercial, renderizar o dashboard específico
    if (affiliateType === 'commercial_license') {
        return <CommercialLicenseDashboard />;
    }

    // Status: Pending
    if (data?.status === 'pending') {
        return (
            <div className="min-h-screen bg-[#F4F4F4] p-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-10 h-10 text-yellow-600" />
                            </div>
                            <CardTitle className="text-2xl">Candidatura em Análise</CardTitle>
                            <CardDescription className="text-base">
                                {data.message || 'Sua candidatura está sendo analisada por nossa equipe.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-600">
                                Você receberá um e-mail quando sua candidatura for aprovada.
                            </p>
                            <Button
                                onClick={() => router.push('/')}
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

    // Status: Inactive/Suspended
    if (data?.status === 'inactive' || data?.status === 'suspended') {
        return (
            <div className="min-h-screen bg-[#F4F4F4] p-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl">
                                {data.status === 'inactive' ? 'Conta Inativa' : 'Conta Suspensa'}
                            </CardTitle>
                            <CardDescription className="text-base">{data.message}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-gray-600 mb-4">
                                Entre em contato com o suporte para mais informações.
                            </p>
                            <Button
                                onClick={() => router.push('/')}
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

    // Status: Active
    return (
        <div className="min-h-screen bg-[#F4F4F4] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard do Afiliado</h1>
                        <p className="text-gray-600 mt-1">Bem-vindo, {data?.affiliate?.name}!</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setEditData({
                                    pixKey: data?.affiliate?.pixKey || '',
                                    bankName: data?.affiliate?.bankName || '',
                                    bankAccount: data?.affiliate?.bankAccount || '',
                                });
                                setShowEditDialog(true);
                            }}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Dados
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchDashboard}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Card de Código Personalizado */}
                <Card>
                    <CardHeader>
                        <CardTitle>Seu Link de Afiliado</CardTitle>
                        <CardDescription>
                            Este código aparece em todos os seus links (?ref=seu-codigo)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex-1">
                                <div className="text-sm text-muted-foreground mb-1">Seu código:</div>
                                <code className="text-lg font-mono font-semibold">
                                    {(data?.affiliate as any)?.customSlug || data?.affiliate?.code}
                                </code>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCustomSlug((data?.affiliate as any)?.customSlug || '');
                                        setShowEditSlugDialog(true);
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Personalizar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        copyToClipboard(
                                            (data?.affiliate as any)?.customSlug || data?.affiliate?.code || ''
                                        )
                                    }
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards - Geral */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total de Cliques</CardDescription>
                                <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            <CardTitle className="text-3xl">{data?.stats?.totalClicks || 0}</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Conversões</CardDescription>
                                <TrendingUp className="w-5 h-5 text-gray-400" />
                            </div>
                            <CardTitle className="text-3xl">{data?.stats?.totalConversions || 0}</CardTitle>
                            <p className="text-sm text-gray-600">Taxa: {data?.stats?.conversionRate}%</p>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Comissão Pendente</CardDescription>
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <CardTitle className="text-3xl text-yellow-600">
                                {formatCurrency(data?.stats?.pendingCommission || '0', 'BRL')}
                            </CardTitle>
                            <p className="text-xs text-gray-500">Valores consolidados em BRL</p>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Comissão Paga</CardDescription>
                                <DollarSign className="w-5 h-5 text-green-500" />
                            </div>
                            <CardTitle className="text-3xl text-green-600">
                                {formatCurrency(data?.stats?.paidCommission || '0', 'BRL')}
                            </CardTitle>
                            <p className="text-xs text-gray-500">Valores consolidados em BRL</p>
                        </CardHeader>
                    </Card>
                </div>

                {/* Stats Últimos 30 Dias */}
                <Card>
                    <CardHeader>
                        <CardTitle>Últimos 30 Dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Cliques</p>
                                <p className="text-2xl font-semibold">{data?.stats?.last30Days.clicks || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Conversões</p>
                                <p className="text-2xl font-semibold">{data?.stats?.last30Days.conversions || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Receita (BRL)</p>
                                <p className="text-2xl font-semibold text-[#FD9555]">
                                    {formatCurrency(data?.stats?.last30Days.revenue || '0', 'BRL')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Meus Links */}
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Meus Links</CardTitle>
                            <CardDescription>Links de afiliado por produto</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!data?.links || data.links.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>Nenhum link criado ainda</p>
                                <p className="text-sm mt-2">Crie links específicos para produtos na seção &quot;Produtos para Divulgar&quot;</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Link</TableHead>
                                        <TableHead>Produto</TableHead>
                                        <TableHead className="text-right">Cliques</TableHead>
                                        <TableHead className="text-right">Conversões</TableHead>
                                        <TableHead className="text-right">Receita</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.links.map(link => (
                                        <TableRow key={link.id}>
                                            <TableCell className="font-medium">
                                                {link.customName || link.product?.name || 'Link Geral'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs max-w-xs truncate">
                                                {link.url}
                                            </TableCell>
                                            <TableCell>{link.product?.name || 'Link Geral'}</TableCell>
                                            <TableCell className="text-right">{link.clicks}</TableCell>
                                            <TableCell className="text-right">{link.conversions}</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(link.revenue, 'BRL')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => copyToClipboard(link.url)}
                                                        title="Copiar link"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingLink({
                                                                id: link.id,
                                                                name: link.customName || link.product?.name || 'Link Geral',
                                                            });
                                                            setShowEditLinkDialog(true);
                                                        }}
                                                        title="Editar nome"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteLink(link.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="Deletar link"
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

                {/* Minhas Comissões */}
                <Card>
                    <CardHeader>
                        <CardTitle>Minhas Comissões</CardTitle>
                        <CardDescription>Histórico de comissões</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!data?.commissions || data.commissions.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>Você ainda não tem comissões</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Venda</TableHead>
                                        <TableHead className="text-right">Taxa</TableHead>
                                        <TableHead className="text-right">Comissão</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Comprovante</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.commissions.map(commission => (
                                        <TableRow key={commission.id}>
                                            <TableCell>
                                                {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(commission.orderTotal, commission.currency)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {parseFloat(commission.commissionRate).toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-[#FD9555]">
                                                {formatCurrency(commission.commissionAmount, commission.currency)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(commission.status)}</TableCell>
                                            <TableCell className="text-center">
                                                {commission.status === 'paid' && commission.paymentProof ? (
                                                    <a
                                                        href={commission.paymentProof}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                                                        title="Ver comprovante de pagamento"
                                                    >
                                                        📄 Ver
                                                    </a>
                                                ) : commission.status === 'paid' ? (
                                                    <span className="text-gray-400 text-sm" title="Sem comprovante">—</span>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Informações de Pagamento */}
                {!data?.affiliate?.pixKey && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader>
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-1" />
                                <div>
                                    <CardTitle className="text-yellow-900">Configure sua Chave PIX</CardTitle>
                                    <CardDescription className="text-yellow-700">
                                        Adicione sua chave PIX para receber suas comissões
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                )}
            </div>



            {/* Dialog Editar Dados */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Dados Bancários</DialogTitle>
                        <DialogDescription>
                            Atualize suas informações para receber os pagamentos
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="pixKey">Chave PIX *</Label>
                            <Input
                                id="pixKey"
                                value={editData.pixKey}
                                onChange={(e) => setEditData({ ...editData, pixKey: e.target.value })}
                                placeholder="CPF, e-mail, telefone ou chave aleatória"
                            />
                        </div>

                        <div>
                            <Label htmlFor="bankName">Banco</Label>
                            <Input
                                id="bankName"
                                value={editData.bankName}
                                onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                                placeholder="Nome do banco"
                            />
                        </div>

                        <div>
                            <Label htmlFor="bankAccount">Conta Bancária</Label>
                            <Input
                                id="bankAccount"
                                value={editData.bankAccount}
                                onChange={(e) => setEditData({ ...editData, bankAccount: e.target.value })}
                                placeholder="Agência e Conta"
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                <strong>Importante:</strong> Mantenha suas informações bancárias atualizadas para receber seus pagamentos sem atrasos.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleEditProfile}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                Salvar Alterações
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar Nome do Link */}
            <Dialog open={showEditLinkDialog} onOpenChange={setShowEditLinkDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Nome do Link</DialogTitle>
                        <DialogDescription>
                            Personalize o nome de identificação do seu link
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="linkName">Nome do Link</Label>
                            <Input
                                id="linkName"
                                value={editingLink?.name || ''}
                                onChange={(e) =>
                                    setEditingLink(prev => prev ? { ...prev, name: e.target.value } : null)
                                }
                                placeholder="Ex: Campanha Natal 2026, Link Instagram, etc."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Este nome é apenas para sua organização interna
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => {
                                setShowEditLinkDialog(false);
                                setEditingLink(null);
                            }}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleEditLink}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                Salvar Nome
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Personalizar Slug */}
            <Dialog open={showEditSlugDialog} onOpenChange={setShowEditSlugDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Personalizar Link de Afiliado</DialogTitle>
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
                                placeholder="Ex: rafa-silva, maria-vendas"
                                maxLength={50}
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
                            <Button variant="outline" onClick={() => {
                                setShowEditSlugDialog(false);
                                setCustomSlug('');
                            }}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleUpdateSlug}
                                disabled={!customSlug || customSlug.length < 3}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                Salvar Código
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
