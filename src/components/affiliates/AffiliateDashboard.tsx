'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
    const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
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

    const createGeneralLink = async () => {
        try {
            const response = await fetch('/api/affiliates/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const result = await response.json();

            if (response.ok) {
                showToast('Link criado com sucesso!', 'success');
                setShowCreateLinkDialog(false);
                fetchDashboard();
            } else {
                showToast(result.message || 'Erro ao criar link', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar link:', error);
            showToast('Erro ao criar link', 'error');
        }
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
                        <p className="text-gray-600 mt-1">
                            Bem-vindo, {data?.affiliate?.name}! Código: <strong>{data?.affiliate?.code}</strong>
                        </p>
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
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Meus Links</CardTitle>
                                <CardDescription>Links de afiliado para compartilhar</CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setShowCreateLinkDialog(true)}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Criar Link Geral
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!data?.links || data.links.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>Você ainda não tem links de afiliado</p>
                                <Button
                                    size="sm"
                                    onClick={() => setShowCreateLinkDialog(true)}
                                    className="mt-4 bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                                >
                                    Criar Primeiro Link
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
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

            {/* Dialog Criar Link Geral */}
            <Dialog open={showCreateLinkDialog} onOpenChange={setShowCreateLinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Link Geral</DialogTitle>
                        <DialogDescription>
                            Crie um link de afiliado que aponta para a página inicial. Os clientes que acessarem
                            através deste link e fizerem qualquer compra gerarão comissão para você.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                O link será válido por 30 dias após o primeiro clique do cliente. Qualquer compra
                                feita neste período será creditada a você.
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowCreateLinkDialog(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={createGeneralLink}
                                className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                            >
                                Criar Link
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
        </div>
    );
}
