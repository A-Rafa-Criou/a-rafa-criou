'use client';

import { useState } from 'react';
import { useAdminCommissions } from '@/hooks/useAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, type Currency } from '@/lib/currency-helpers';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Check, X, DollarSign, AlertTriangle, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Commission {
    id: string;
    status: string;
    commissionAmount: string;
    orderTotal: string;
    commissionRate: string;
    currency: Currency;
    createdAt: string;
    approvedAt: string | null;
    paidAt: string | null;
    notes: string | null;
    paymentMethod: string | null; // 🔄 Método de pagamento
    paymentProof: string | null; // 🔄 Comprovante de pagamento
    affiliate: {
        id: string;
        code: string;
        name: string;
        email: string;
        pixKey?: string | null; // 🔄 Dados bancários
        bankName?: string | null;
        bankAccount?: string | null;
    };
    order: {
        id: string;
        email: string;
        createdAt: string;
    };
}

export default function CommissionsPageClient() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
    const [actionDialog, setActionDialog] = useState<'approve' | 'pay' | 'cancel' | 'edit' | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [paymentProof, setPaymentProof] = useState('');
    const [notes, setNotes] = useState('');
    const { showToast } = useToast();

    const { data, isLoading, refetch } = useAdminCommissions({
        status: statusFilter === 'all' ? undefined : statusFilter,
    });

    const commissions = (data?.commissions || []) as Commission[];
    const stats = data?.stats || {};

    const handleAction = async (action: 'approved' | 'paid' | 'cancelled') => {
        if (!selectedCommission) return;

        try {
            const body: Record<string, string> = { status: action };
            if (action === 'paid') {
                body.paymentMethod = paymentMethod;
                if (paymentProof) {
                    body.paymentProof = paymentProof; // 🔄 Enviar comprovante
                }
            }
            if (notes) {
                body.notes = notes;
            }

            const response = await fetch(`/api/admin/affiliates/commissions/${selectedCommission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                showToast('Comissão atualizada com sucesso', 'success');
                setActionDialog(null);
                setSelectedCommission(null);
                setNotes('');
                setPaymentProof(''); // 🔄 Limpar comprovante
                refetch();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar comissão', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar comissão:', error);
            showToast('Erro ao atualizar comissão', 'error');
        }
    };

    const handleEditPaidCommission = async () => {
        if (!selectedCommission) return;

        try {
            const body: Record<string, string> = {};
            if (paymentMethod) body.paymentMethod = paymentMethod;
            if (paymentProof) body.paymentProof = paymentProof;
            if (notes) body.notes = notes;

            const response = await fetch(`/api/admin/affiliates/commissions/${selectedCommission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                showToast('Comissão atualizada com sucesso', 'success');
                setActionDialog(null);
                setSelectedCommission(null);
                setNotes('');
                setPaymentProof('');
                refetch();
            } else {
                const error = await response.json();
                showToast(error.message || 'Erro ao atualizar comissão', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar comissão:', error);
            showToast('Erro ao atualizar comissão', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; label: string }> = {
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
            approved: { color: 'bg-blue-100 text-blue-800', label: 'Aprovada' },
            paid: { color: 'bg-green-100 text-green-800', label: 'Paga' },
            cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
        };

        const config = variants[status] || variants.pending;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    if (isLoading) {
        return (
            <div>
                <div className="text-center py-12">Carregando comissões...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pendentes</CardDescription>
                        <CardTitle className="text-3xl text-yellow-600">{stats.pending || 0}</CardTitle>
                        <p className="text-sm text-gray-600">
                            {formatCurrency(stats.totalPending || '0', 'BRL')}
                        </p>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Aprovadas</CardDescription>
                        <CardTitle className="text-3xl text-blue-600">{stats.approved || 0}</CardTitle>
                        <p className="text-sm text-gray-600">
                            {formatCurrency(stats.totalApproved || '0', 'BRL')}
                        </p>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pagas</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{stats.paid || 0}</CardTitle>
                        <p className="text-sm text-gray-600">
                            {formatCurrency(stats.totalPaid || '0', 'BRL')}
                        </p>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-3xl">{stats.total || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filtros e Tabela */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendentes</SelectItem>
                                <SelectItem value="approved">Aprovadas</SelectItem>
                                <SelectItem value="paid">Pagas</SelectItem>
                                <SelectItem value="cancelled">Canceladas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {commissions.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">Nenhuma comissão encontrada</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Afiliado</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Pedido</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Venda</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Taxa</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Comissão</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Comprovante</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commissions.map((commission) => (
                                        <tr key={commission.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    <div className="font-medium">{commission.affiliate.name}</div>
                                                    <div className="text-xs text-gray-500">{commission.affiliate.code}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                    #{commission.order.id.slice(0, 8)}
                                                </code>
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-600">
                                                {formatCurrency(commission.orderTotal, commission.currency)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-600">
                                                {parseFloat(commission.commissionRate).toFixed(1)}%
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-[#FD9555]">
                                                {formatCurrency(commission.commissionAmount, commission.currency)}
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(commission.status)}</td>
                                            <td className="py-3 px-4 text-center">
                                                {commission.paymentProof ? (
                                                    <a
                                                        href={commission.paymentProof}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                                                        title="Ver comprovante"
                                                    >
                                                        📄 Ver
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    {commission.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedCommission(commission);
                                                                    setActionDialog('approve');
                                                                }}
                                                            >
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedCommission(commission);
                                                                    setActionDialog('cancel');
                                                                }}
                                                            >
                                                                <X className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {commission.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedCommission(commission);
                                                                setActionDialog('pay');
                                                            }}
                                                        >
                                                            <DollarSign className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                    )}
                                                    {commission.status === 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedCommission(commission);
                                                                setPaymentMethod(commission.paymentMethod || 'pix');
                                                                setPaymentProof(commission.paymentProof || '');
                                                                setNotes(commission.notes || '');
                                                                setActionDialog('edit');
                                                            }}
                                                            title="Editar comprovante e observações"
                                                        >
                                                            <Edit className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                    )}
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

            {/* Dialog de Aprovação */}
            <Dialog open={actionDialog === 'approve'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aprovar Comissão</DialogTitle>
                        <DialogDescription>
                            Confirme a aprovação da comissão de{' '}
                            {selectedCommission ? formatCurrency(selectedCommission.commissionAmount, selectedCommission.currency) : 'R$ 0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedCommission?.notes && selectedCommission.notes.includes('FRAUDE') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div className="text-sm text-red-800">{selectedCommission.notes}</div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Adicione observações sobre esta comissão..."
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => handleAction('approved')}>Aprovar Comissão</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Pagamento */}
            <Dialog open={actionDialog === 'pay'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Marcar como Pago</DialogTitle>
                        <DialogDescription>
                            Confirme o pagamento de{' '}
                            {selectedCommission ? formatCurrency(selectedCommission.commissionAmount, selectedCommission.currency) : 'R$ 0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Dados Bancários do Afiliado */}
                        {selectedCommission && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                    💳 Dados do Afiliado para Pagamento
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Nome:</span>{' '}
                                        <span className="text-gray-900">{selectedCommission.affiliate.name}</span>
                                    </div>
                                    {selectedCommission.affiliate.pixKey && (
                                        <div>
                                            <span className="font-medium text-gray-700">Chave PIX:</span>{' '}
                                            <code className="bg-white px-2 py-1 rounded text-blue-600 font-mono">
                                                {selectedCommission.affiliate.pixKey}
                                            </code>
                                        </div>
                                    )}
                                    {selectedCommission.affiliate.bankName && (
                                        <div>
                                            <span className="font-medium text-gray-700">Banco:</span>{' '}
                                            <span className="text-gray-900">{selectedCommission.affiliate.bankName}</span>
                                        </div>
                                    )}
                                    {selectedCommission.affiliate.bankAccount && (
                                        <div>
                                            <span className="font-medium text-gray-700">Conta:</span>{' '}
                                            <span className="text-gray-900">{selectedCommission.affiliate.bankAccount}</span>
                                        </div>
                                    )}
                                    {!selectedCommission.affiliate.pixKey && !selectedCommission.affiliate.bankAccount && (
                                        <div className="text-yellow-700 text-xs">
                                            ⚠️ Afiliado ainda não cadastrou dados bancários
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="paymentProof">Comprovante de Pagamento</Label>
                            <Textarea
                                id="paymentProof"
                                value={paymentProof}
                                onChange={(e) => setPaymentProof(e.target.value)}
                                placeholder="Cole o link do comprovante (ex: drive.google.com/...)"
                                rows={2}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Será enviado no e-mail para o afiliado
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notes">Observações (Opcional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observações adicionais..."
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => handleAction('paid')}>Confirmar Pagamento</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Cancelamento */}
            <Dialog open={actionDialog === 'cancel'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Comissão</DialogTitle>
                        <DialogDescription>
                            Confirme o cancelamento da comissão de{' '}
                            {selectedCommission ? formatCurrency(selectedCommission.commissionAmount, selectedCommission.currency) : 'R$ 0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="notes">Motivo do Cancelamento</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Explique o motivo do cancelamento..."
                                rows={3}
                                required
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Voltar
                            </Button>
                            <Button variant="destructive" onClick={() => handleAction('cancelled')}>
                                Cancelar Comissão
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Edição (Comissões Pagas) */}
            <Dialog open={actionDialog === 'edit'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Comissão Paga</DialogTitle>
                        <DialogDescription>
                            Atualize o comprovante e observações da comissão de{' '}
                            {selectedCommission ? formatCurrency(selectedCommission.commissionAmount, selectedCommission.currency) : 'R$ 0.00'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Dados Bancários do Afiliado (somente leitura) */}
                        {selectedCommission && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    💳 Dados do Afiliado
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Nome:</span>{' '}
                                        <span className="text-gray-900">{selectedCommission.affiliate.name}</span>
                                    </div>
                                    {selectedCommission.affiliate.pixKey && (
                                        <div>
                                            <span className="font-medium text-gray-700">Chave PIX:</span>{' '}
                                            <code className="bg-white px-2 py-1 rounded text-blue-600 font-mono">
                                                {selectedCommission.affiliate.pixKey}
                                            </code>
                                        </div>
                                    )}
                                    {selectedCommission.affiliate.bankName && (
                                        <div>
                                            <span className="font-medium text-gray-700">Banco:</span>{' '}
                                            <span className="text-gray-900">{selectedCommission.affiliate.bankName}</span>
                                        </div>
                                    )}
                                    {selectedCommission.affiliate.bankAccount && (
                                        <div>
                                            <span className="font-medium text-gray-700">Conta:</span>{' '}
                                            <span className="text-gray-900">{selectedCommission.affiliate.bankAccount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="editPaymentMethod">Método de Pagamento</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="editPaymentProof">Comprovante de Pagamento</Label>
                            <Textarea
                                id="editPaymentProof"
                                value={paymentProof}
                                onChange={(e) => setPaymentProof(e.target.value)}
                                placeholder="Cole o link do comprovante (ex: drive.google.com/...)"
                                rows={2}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Será atualizado no e-mail já enviado ao afiliado
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="editNotes">Observações</Label>
                            <Textarea
                                id="editNotes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observações adicionais..."
                                rows={2}
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Você está editando uma comissão já marcada como paga. As alterações não enviarão um novo e-mail ao afiliado.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleEditPaidCommission}>Salvar Alterações</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
