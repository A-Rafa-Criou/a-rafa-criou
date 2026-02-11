'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Search, RefreshCw, Eye, Check, X, FileText,
    Shield, AlertTriangle, Edit, Pencil
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import Image from 'next/image';

interface Affiliate {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    affiliateType: 'common' | 'commercial_license';
    status: string;
    commissionValue: string;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: string;
    pixKey?: string | null;
    termsAccepted: boolean;
    termsAcceptedAt?: string | null;
    termsIp?: string | null;
    contractSigned?: boolean;
    contractSignedAt?: string | null;
    contractSignatureData?: string | null;
    contractDocumentUrl?: string | null;
    autoApproved?: boolean;
    approvedAt?: string | null;
    approvedBy?: string | null;
    createdAt: string;
    notes?: string | null;
}

export default function AffiliatesPageClient() {
    const [affiliateType, setAffiliateType] = useState<'all' | 'common' | 'commercial_license'>('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [pending, setPending] = useState<Affiliate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
    const [viewDialog, setViewDialog] = useState<'details' | 'terms' | 'contract' | 'approve' | 'editStatus' | 'commission' | 'editPix' | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [newStatus, setNewStatus] = useState<string>('active');
    const [newCommission, setNewCommission] = useState('');
    const [commissionNotes, setCommissionNotes] = useState('');
    const [updatingCommission, setUpdatingCommission] = useState(false);
    const [newPixKey, setNewPixKey] = useState('');
    const [updatingPix, setUpdatingPix] = useState(false);
    const { showToast } = useToast();

    const loadAffiliates = async () => {
        setIsLoading(true);
        try {
            // Carregar todos os afiliados
            const response = await fetch('/api/admin/affiliates');
            if (response.ok) {
                const data = await response.json();
                setAffiliates(data.affiliates || []);
            }

            // Carregar pendentes de aprovação
            const pendingResponse = await fetch('/api/admin/affiliates/pending');
            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                setPending(data.pending || []);
            }
        } catch (error) {
            console.error('Erro ao carregar afiliados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAffiliates();
    }, []);

    // Inicializar newCommission quando abrir dialog de comissão
    useEffect(() => {
        if (viewDialog === 'commission' && selectedAffiliate) {
            setNewCommission(selectedAffiliate.commissionValue);
        }
    }, [viewDialog, selectedAffiliate]);

    const filteredAffiliates = affiliates.filter(aff => {
        // Filtro por tipo
        if (affiliateType !== 'all' && aff.affiliateType !== affiliateType) return false;

        // Filtro por status
        if (statusFilter !== 'all' && aff.status !== statusFilter) return false;

        // Busca
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                aff.name.toLowerCase().includes(searchLower) ||
                aff.email.toLowerCase().includes(searchLower) ||
                aff.code.toLowerCase().includes(searchLower)
            );
        }

        return true;
    });

    const handleApproveReject = async (action: 'approve' | 'reject') => {
        if (!selectedAffiliate) return;

        try {
            const response = await fetch('/api/admin/affiliates/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliateId: selectedAffiliate.id,
                    action,
                    notes: approvalNotes,
                }),
            });

            if (response.ok) {
                showToast(
                    action === 'approve' ? 'Afiliado aprovado com sucesso!' : 'Afiliado rejeitado',
                    'success'
                );
                setViewDialog(null);
                setSelectedAffiliate(null);
                setApprovalNotes('');
                loadAffiliates();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao processar', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao processar aprovação', 'error');
        }
    };

    const handleUpdateCommission = async () => {
        if (!selectedAffiliate) return;

        const commissionValue = parseFloat(newCommission);
        if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
            showToast('Comissão deve ser entre 0% e 100%', 'error');
            return;
        }

        setUpdatingCommission(true);
        try {
            const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/commission`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commissionValue: commissionValue.toFixed(2),
                    notifyAffiliate: true,
                    notes: commissionNotes || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.changed) {
                    showToast(
                        `Comissão atualizada de ${data.oldCommission}% para ${data.newCommission}%${data.emailSent ? ' (email enviado)' : ''}`,
                        'success'
                    );
                } else {
                    showToast('Comissão mantida (mesmo valor)', 'info');
                }
                setViewDialog(null);
                setSelectedAffiliate(null);
                setNewCommission('');
                setCommissionNotes('');
                loadAffiliates();
            } else {
                showToast(data.error || 'Erro ao atualizar comissão', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao atualizar comissão', 'error');
        } finally {
            setUpdatingCommission(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedAffiliate) return;

        try {
            const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    notes: approvalNotes,
                }),
            });

            if (response.ok) {
                showToast('Status atualizado com sucesso!', 'success');
                setViewDialog(null);
                setSelectedAffiliate(null);
                setApprovalNotes('');
                setNewStatus('active');
                loadAffiliates();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar status', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao atualizar status', 'error');
        }
    };

    const handleUpdatePixKey = async () => {
        if (!selectedAffiliate) return;

        if (!newPixKey || newPixKey.length < 11) {
            showToast('Chave PIX inválida', 'error');
            return;
        }

        setUpdatingPix(true);
        try {
            const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pixKey: newPixKey,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Chave PIX atualizada com sucesso!', 'success');
                setViewDialog(null);
                setSelectedAffiliate(null);
                setNewPixKey('');
                loadAffiliates();
            } else {
                showToast(data.error || 'Erro ao atualizar chave PIX', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao atualizar chave PIX', 'error');
        } finally {
            setUpdatingPix(false);
        }
    };

    const getTypeBadge = (type: string) => {
        if (type === 'common') {
            return <Badge className="bg-blue-100 text-blue-800">Afiliado Comum</Badge>;
        }
        return <Badge className="bg-purple-100 text-purple-800">Licença Comercial</Badge>;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; label: string }> = {
            active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
            inactive: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
            suspended: { color: 'bg-red-100 text-red-800', label: 'Suspenso' },
            rejected: { color: 'bg-gray-100 text-gray-800', label: 'Rejeitado' },
        };
        const config = variants[status] || variants.inactive;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">Carregando afiliados...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={loadAffiliates}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-3xl">{affiliates.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Afiliados Comuns</CardDescription>
                        <CardTitle className="text-2xl text-blue-600">
                            {affiliates.filter(a => a.affiliateType === 'common').length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Licenças Comerciais</CardDescription>
                        <CardTitle className="text-2xl text-purple-600">
                            {affiliates.filter(a => a.affiliateType === 'commercial_license').length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-yellow-800">Pendentes Aprovação</CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">{pending.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Ativos</CardDescription>
                        <CardTitle className="text-3xl text-green-600">
                            {affiliates.filter(a => a.status === 'active').length}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Pendentes de Aprovação */}
            {pending.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <CardTitle className="text-yellow-900">
                                Pendentes de Aprovação ({pending.length})
                            </CardTitle>
                        </div>
                        <CardDescription className="text-yellow-800">
                            Licenças comerciais aguardando revisão manual
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pending.map(aff => (
                                <div
                                    key={aff.id}
                                    className="bg-white p-4 rounded-lg border border-yellow-200 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-semibold">{aff.name}</p>
                                        <p className="text-sm text-gray-600">{aff.email}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Solicitado em: {new Date(aff.createdAt).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedAffiliate(aff);
                                                setViewDialog('details');
                                            }}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Ver Detalhes
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => {
                                                setSelectedAffiliate(aff);
                                                setViewDialog('approve');
                                            }}
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            Aprovar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                                setSelectedAffiliate(aff);
                                                setViewDialog('approve');
                                            }}
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Rejeitar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs por Tipo */}
            <Card>
                <CardHeader>
                    <Tabs value={affiliateType} onValueChange={(v) => setAffiliateType(v as typeof affiliateType)}>
                        <TabsList>
                            <TabsTrigger value="all">
                                Todos ({affiliates.length})
                            </TabsTrigger>
                            <TabsTrigger value="common">
                                Afiliados Comuns ({affiliates.filter(a => a.affiliateType === 'common').length})
                            </TabsTrigger>
                            <TabsTrigger value="commercial_license">
                                Licenças Comerciais ({affiliates.filter(a => a.affiliateType === 'commercial_license').length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex gap-4 mt-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por nome, email ou código..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border rounded-lg"
                            aria-label="Filtrar por status"
                        >
                            <option value="all">Todos Status</option>
                            <option value="active">Ativos</option>
                            <option value="inactive">Inativos</option>
                            <option value="suspended">Suspensos</option>
                            <option value="rejected">Rejeitados</option>
                        </select>
                    </div>
                </CardHeader>

                <CardContent>
                    {filteredAffiliates.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">Nenhum afiliado encontrado</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Comissão</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Receita</th>
                                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Termos</th>
                                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Contrato</th>
                                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAffiliates.map(aff => (
                                        <tr key={aff.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                    {aff.code}
                                                </code>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium">{aff.name}</p>
                                                    <p className="text-xs text-gray-500">{aff.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">{getTypeBadge(aff.affiliateType)}</td>
                                            <td className="py-3 px-4">{getStatusBadge(aff.status)}</td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>{aff.commissionValue}%</span>
                                                    {aff.affiliateType === 'common' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedAffiliate(aff);
                                                                setViewDialog('commission');
                                                            }}
                                                            title="Alterar comissão"
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-600">{aff.totalOrders}</td>
                                            <td className="py-3 px-4 text-right font-semibold text-[#FD9555]">
                                                R$ {parseFloat(aff.totalRevenue || '0').toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {aff.termsAccepted ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedAffiliate(aff);
                                                            setViewDialog('terms');
                                                        }}
                                                    >
                                                        <Check className="w-4 h-4 text-green-600 mr-1" />
                                                        Ver
                                                    </Button>
                                                ) : (
                                                    <X className="w-4 h-4 text-gray-400 mx-auto" />
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {aff.contractSigned ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedAffiliate(aff);
                                                            setViewDialog('contract');
                                                        }}
                                                    >
                                                        <FileText className="w-4 h-4 text-blue-600 mr-1" />
                                                        Ver
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex gap-1 justify-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedAffiliate(aff);
                                                            setViewDialog('details');
                                                        }}
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedAffiliate(aff);
                                                            setNewStatus(aff.status);
                                                            setViewDialog('editStatus');
                                                        }}
                                                        title="Editar status"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog: Detalhes Completos */}
            <Dialog open={viewDialog === 'details'} onOpenChange={() => setViewDialog(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Afiliado</DialogTitle>
                    </DialogHeader>

                    {selectedAffiliate && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Nome:</p>
                                            <p className="font-medium">{selectedAffiliate.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Email:</p>
                                            <p className="font-medium">{selectedAffiliate.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Telefone:</p>
                                            <p className="font-medium">{selectedAffiliate.phone || 'Não informado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Código:</p>
                                            <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                                                {selectedAffiliate.code}
                                            </code>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Tipo:</p>
                                            {getTypeBadge(selectedAffiliate.affiliateType)}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Status:</p>
                                            {getStatusBadge(selectedAffiliate.status)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Estatísticas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Performance</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-600">{selectedAffiliate.totalClicks}</p>
                                            <p className="text-sm text-gray-600">Cliques</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{selectedAffiliate.totalOrders}</p>
                                            <p className="text-sm text-gray-600">Vendas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-orange-600">
                                                R$ {parseFloat(selectedAffiliate.totalRevenue || '0').toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-600">Receita Gerada</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dados Bancários */}
                            {selectedAffiliate.affiliateType === 'common' && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">Dados de Pagamento</CardTitle>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setNewPixKey(selectedAffiliate.pixKey || '');
                                                setViewDialog('editPix');
                                            }}
                                        >
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Editar PIX
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-sm text-gray-600">Chave PIX:</p>
                                                {selectedAffiliate.pixKey ? (
                                                    <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                                                        {selectedAffiliate.pixKey}
                                                    </code>
                                                ) : (
                                                    <p className="text-sm text-yellow-600">⚠️ Chave PIX não configurada</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Aprovação */}
                            {selectedAffiliate.approvedAt && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Histórico de Aprovação</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm">
                                                <span className="text-gray-600">Aprovado em:</span>{' '}
                                                {new Date(selectedAffiliate.approvedAt).toLocaleString('pt-BR')}
                                            </p>
                                            {selectedAffiliate.autoApproved ? (
                                                <Badge className="bg-blue-100 text-blue-800">
                                                    Aprovação Automática
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-800">
                                                    Aprovação Manual
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Notas */}
                            {selectedAffiliate.notes && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Observações</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{selectedAffiliate.notes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog: Termos Aceitos */}
            <Dialog open={viewDialog === 'terms'} onOpenChange={() => setViewDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aceitação de Termos</DialogTitle>
                    </DialogHeader>

                    {selectedAffiliate && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <Check className="w-5 h-5" />
                                <span className="font-semibold">Termos aceitos</span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div>
                                    <p className="text-gray-600">Data/Hora:</p>
                                    <p className="font-medium">
                                        {selectedAffiliate.termsAcceptedAt
                                            ? new Date(selectedAffiliate.termsAcceptedAt).toLocaleString('pt-BR')
                                            : 'Não disponível'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600">IP do aceite:</p>
                                    <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                                        {selectedAffiliate.termsIp || 'Não registrado'}
                                    </code>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog: Contrato Assinado */}
            <Dialog open={viewDialog === 'contract'} onOpenChange={() => setViewDialog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Contrato com Assinatura Digital</DialogTitle>
                        <DialogDescription>
                            Licença Comercial - Contrato aceito digitalmente
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAffiliate && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Shield className="w-5 h-5" />
                                <span className="font-semibold">Contrato assinado digitalmente</span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div>
                                    <p className="text-gray-600">Data da assinatura:</p>
                                    <p className="font-medium">
                                        {selectedAffiliate.contractSignedAt
                                            ? new Date(selectedAffiliate.contractSignedAt).toLocaleString('pt-BR')
                                            : 'Não disponível'}
                                    </p>
                                </div>
                            </div>

                            {/* Assinatura Digital */}
                            {selectedAffiliate.contractSignatureData && (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <p className="text-sm font-semibold mb-2">Assinatura Digital:</p>
                                    <div className="bg-white border rounded p-2">
                                        <Image
                                            src={selectedAffiliate.contractSignatureData}
                                            alt="Assinatura digital"
                                            width={400}
                                            height={100}
                                            className="max-w-full h-auto"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Link para Documento */}
                            {selectedAffiliate.contractDocumentUrl && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(selectedAffiliate.contractDocumentUrl!, '_blank')}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Baixar Contrato Completo (PDF)
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog: Editar Status */}
            <Dialog open={viewDialog === 'editStatus'} onOpenChange={() => setViewDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Status do Afiliado</DialogTitle>
                        <DialogDescription>
                            {selectedAffiliate?.name} - {selectedAffiliate?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Novo Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="inactive">Inativo</SelectItem>
                                    <SelectItem value="suspended">Suspenso</SelectItem>
                                    <SelectItem value="rejected">Rejeitado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="status-notes">Observações (opcional)</Label>
                            <Textarea
                                id="status-notes"
                                placeholder="Adicione observações sobre a alteração de status..."
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setViewDialog(null);
                                    setApprovalNotes('');
                                    setNewStatus('active');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleUpdateStatus}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Atualizar Status
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Aprovar/Rejeitar */}
            <Dialog open={viewDialog === 'approve'} onOpenChange={() => setViewDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aprovar/Rejeitar Licença Comercial</DialogTitle>
                        <DialogDescription>
                            {selectedAffiliate?.name} - {selectedAffiliate?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="approval-notes">Observações (opcional)</Label>
                            <Textarea
                                id="approval-notes"
                                placeholder="Adicione observações sobre a aprovação/rejeição..."
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setViewDialog(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleApproveReject('reject')}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Rejeitar
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveReject('approve')}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Aprovar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Editar Chave PIX */}
            <Dialog open={viewDialog === 'editPix'} onOpenChange={() => {
                setViewDialog(null);
                setNewPixKey('');
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Chave PIX</DialogTitle>
                        <DialogDescription>
                            {selectedAffiliate?.name} - {selectedAffiliate?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-yellow-700 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-semibold">Chave PIX Atual</span>
                            </div>
                            {selectedAffiliate?.pixKey ? (
                                <code className="font-mono text-sm bg-white px-2 py-1 rounded">
                                    {selectedAffiliate.pixKey}
                                </code>
                            ) : (
                                <p className="text-sm text-yellow-800">⚠️ Nenhuma chave configurada</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-pix-key">Nova Chave PIX</Label>
                            <Input
                                id="new-pix-key"
                                type="text"
                                placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                                value={newPixKey}
                                onChange={(e) => setNewPixKey(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">
                                Digite a chave PIX completa (mínimo 11 caracteres)
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>ℹ️ Importante:</strong> Certifique-se que a chave PIX está correta.
                                Os pagamentos automáticos serão enviados para esta chave.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setViewDialog(null);
                                    setNewPixKey('');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-[#FD9555] hover:bg-[#fd8540]"
                                onClick={handleUpdatePixKey}
                                disabled={updatingPix || !newPixKey || newPixKey.length < 11}
                            >
                                {updatingPix ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Atualizando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Confirmar Alteração
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: Alterar Comissão */}
            <Dialog open={viewDialog === 'commission'} onOpenChange={() => {
                setViewDialog(null);
                setNewCommission('');
                setCommissionNotes('');
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Taxa de Comissão</DialogTitle>
                        <DialogDescription>
                            {selectedAffiliate?.name} - {selectedAffiliate?.email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-semibold">Comissão Atual</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">
                                {selectedAffiliate?.commissionValue}%
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-commission">Nova Taxa de Comissão (%)</Label>
                            <Input
                                id="new-commission"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Ex: 15.0"
                                value={newCommission}
                                onChange={(e) => setNewCommission(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">
                                Valor entre 0% e 100%. Use ponto para decimais (ex: 12.5)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="commission-notes">Motivo da Alteração (opcional)</Label>
                            <Textarea
                                id="commission-notes"
                                placeholder="Exemplo: Desempenho excepcional, bonificação especial..."
                                value={commissionNotes}
                                onChange={(e) => setCommissionNotes(e.target.value)}
                                rows={3}
                            />
                            <p className="text-xs text-gray-500">
                                Esta mensagem será enviada por email ao afiliado
                            </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>⚠️ Atenção:</strong> A nova taxa será aplicada apenas às vendas futuras.
                                Comissões pendentes manterão a taxa anterior.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setViewDialog(null);
                                    setNewCommission('');
                                    setCommissionNotes('');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-[#FD9555] hover:bg-[#fd8540]"
                                onClick={handleUpdateCommission}
                                disabled={updatingCommission || !newCommission}
                            >
                                {updatingCommission ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Atualizando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Confirmar Alteração
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
