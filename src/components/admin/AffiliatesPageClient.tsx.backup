'use client';

import { useState } from 'react';
import { useAdminAffiliates } from '@/hooks/useAdminData';

interface Affiliate {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    commissionType?: string;
    commissionValue: string;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: string;
    pixKey?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, MoreVertical, Check, X, Ban, RefreshCw, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function AffiliatesPageClient() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
    const [newAffiliate, setNewAffiliate] = useState({
        name: '',
        email: '',
        phone: '',
        code: '',
        commissionValue: '10',
    });
    const { showToast } = useToast();

    const { data, isLoading, refetch } = useAdminAffiliates({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
    });

    const affiliates = data?.affiliates || [];
    const stats = data?.stats || {};

    const handleCreateAffiliate = async () => {
        try {
            if (!newAffiliate.name || !newAffiliate.email || !newAffiliate.code) {
                showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }

            const response = await fetch('/api/admin/affiliates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newAffiliate,
                    commissionValue: newAffiliate.commissionValue,
                }),
            });

            if (response.ok) {
                showToast('Afiliado criado com sucesso', 'success');
                setShowNewDialog(false);
                setNewAffiliate({
                    name: '',
                    email: '',
                    phone: '',
                    code: '',
                    commissionValue: '10',
                });
                refetch();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao criar afiliado', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar afiliado:', error);
            showToast('Erro ao criar afiliado', 'error');
        }
    };

    const handleEditAffiliate = async () => {
        try {
            if (!editingAffiliate) return;

            const response = await fetch('/api/admin/affiliates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingAffiliate.id,
                    name: editingAffiliate.name,
                    email: editingAffiliate.email,
                    phone: editingAffiliate.phone,
                    commissionType: editingAffiliate.commissionType,
                    commissionValue: editingAffiliate.commissionValue,
                    pixKey: editingAffiliate.pixKey,
                    bankName: editingAffiliate.bankName,
                    bankAccount: editingAffiliate.bankAccount,
                }),
            });

            if (response.ok) {
                showToast('Afiliado atualizado com sucesso', 'success');
                setShowEditDialog(false);
                setEditingAffiliate(null);
                refetch();
            } else {
                const error = await response.json();
                showToast(error.error || 'Erro ao atualizar afiliado', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar afiliado:', error);
            showToast('Erro ao atualizar afiliado', 'error');
        }
    };

    const handleStatusChange = async (affiliateId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/affiliates/${affiliateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                showToast('Status atualizado com sucesso', 'success');
                refetch();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar status', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            showToast('Erro ao atualizar status', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; label: string }> = {
            active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
            inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
            suspended: { color: 'bg-red-100 text-red-800', label: 'Suspenso' },
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Afiliados</h1>
                    <p className="text-gray-600 mt-1">Gerencie seu programa de afiliados</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button size="sm" onClick={() => setShowNewDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Afiliado
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Afiliados</CardDescription>
                        <CardTitle className="text-3xl">{stats.total || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Ativos</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{stats.active || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Comissões Pendentes</CardDescription>
                        <CardTitle className="text-2xl">
                            R$ {parseFloat(stats.totalCommissionPending || '0').toFixed(2)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Comissões Pagas</CardDescription>
                        <CardTitle className="text-2xl text-green-600">
                            R$ {parseFloat(stats.totalCommissionPaid || '0').toFixed(2)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por nome, email ou código..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Ativos</SelectItem>
                                <SelectItem value="inactive">Inativos</SelectItem>
                                <SelectItem value="suspended">Suspensos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {affiliates.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">Nenhum afiliado encontrado</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Comissão</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Cliques</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Receita</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {affiliates.map((affiliate: Affiliate) => (
                                        <tr key={affiliate.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                    {affiliate.code}
                                                </code>
                                            </td>
                                            <td className="py-3 px-4 font-medium">{affiliate.name}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{affiliate.email}</td>
                                            <td className="py-3 px-4">{getStatusBadge(affiliate.status)}</td>
                                            <td className="py-3 px-4 text-right">
                                                {affiliate.commissionValue}%
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-600">
                                                {affiliate.totalClicks}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-600">
                                                {affiliate.totalOrders}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-[#FD9555]">
                                                R$ {parseFloat(affiliate.totalRevenue).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingAffiliate(affiliate);
                                                                setShowEditDialog(true);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {affiliate.status !== 'active' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(affiliate.id, 'active')}
                                                            >
                                                                <Check className="w-4 h-4 mr-2 text-green-600" />
                                                                Ativar
                                                            </DropdownMenuItem>
                                                        )}
                                                        {affiliate.status !== 'inactive' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(affiliate.id, 'inactive')}
                                                            >
                                                                <X className="w-4 h-4 mr-2 text-gray-600" />
                                                                Desativar
                                                            </DropdownMenuItem>
                                                        )}
                                                        {affiliate.status !== 'suspended' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(affiliate.id, 'suspended')}
                                                            >
                                                                <Ban className="w-4 h-4 mr-2 text-red-600" />
                                                                Suspender
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog Novo Afiliado */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Criar Novo Afiliado</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para cadastrar um novo afiliado manualmente
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input
                                id="name"
                                value={newAffiliate.name}
                                onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                                placeholder="Nome do afiliado"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">E-mail *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newAffiliate.email}
                                onChange={(e) => setNewAffiliate({ ...newAffiliate, email: e.target.value })}
                                placeholder="email@exemplo.com"
                            />
                        </div>

                        <div>
                            <Label htmlFor="code">Código do Afiliado *</Label>
                            <Input
                                id="code"
                                value={newAffiliate.code}
                                onChange={(e) => setNewAffiliate({ ...newAffiliate, code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                placeholder="codigo123"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Apenas letras minúsculas e números, sem espaços
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                value={newAffiliate.phone}
                                onChange={(e) => setNewAffiliate({ ...newAffiliate, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div>
                            <Label htmlFor="commissionValue">Comissão (%)</Label>
                            <Input
                                id="commissionValue"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={newAffiliate.commissionValue}
                                onChange={(e) => setNewAffiliate({ ...newAffiliate, commissionValue: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowNewDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                                onClick={handleCreateAffiliate}
                            >
                                Criar Afiliado
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar Afiliado */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Afiliado</DialogTitle>
                        <DialogDescription>
                            Atualize os dados do afiliado
                        </DialogDescription>
                    </DialogHeader>

                    {editingAffiliate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-name">Nome Completo</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingAffiliate.name}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit-email">E-mail</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        value={editingAffiliate.email}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-phone">Telefone</Label>
                                    <Input
                                        id="edit-phone"
                                        value={editingAffiliate.phone || ''}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, phone: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit-commission">Comissão (%)</Label>
                                    <Input
                                        id="edit-commission"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={editingAffiliate.commissionValue}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, commissionValue: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="edit-pix">Chave PIX</Label>
                                <Input
                                    id="edit-pix"
                                    value={editingAffiliate.pixKey || ''}
                                    onChange={(e) => setEditingAffiliate({ ...editingAffiliate, pixKey: e.target.value })}
                                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-bank">Banco</Label>
                                    <Input
                                        id="edit-bank"
                                        value={editingAffiliate.bankName || ''}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, bankName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit-account">Conta Bancária</Label>
                                    <Input
                                        id="edit-account"
                                        value={editingAffiliate.bankAccount || ''}
                                        onChange={(e) => setEditingAffiliate({ ...editingAffiliate, bankAccount: e.target.value })}
                                        placeholder="Agência e Conta"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowEditDialog(false);
                                        setEditingAffiliate(null);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                                    onClick={handleEditAffiliate}
                                >
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
