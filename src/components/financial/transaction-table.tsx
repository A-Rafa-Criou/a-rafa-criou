'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    date: Date;
    description: string;
    amount: number;
    paid: boolean;
    paymentMethod?: string;
    categoryName?: string;
    installmentNumber?: number;
    installmentsTotal?: number;
    recurrence?: string;
    canceledAt?: Date | null;
}

interface TransactionTableProps {
    transactions: Transaction[];
    onEdit?: (transaction: any) => void;
    onDelete?: (id: string) => void;
    onTogglePaid?: (id: string, paid: boolean) => void;
    onCancelRecurrence?: (id: string) => void;
    onReactivateRecurrence?: (id: string) => void;
    onAdjustInstallment?: (transactionId: string, newNumber: number) => Promise<void>;
    showActions?: boolean;
}

export function TransactionTable({
    transactions,
    onEdit,
    onDelete,
    onTogglePaid,
    onCancelRecurrence,
    onReactivateRecurrence,
    onAdjustInstallment,
    showActions = true,
}: TransactionTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingInstallment, setEditingInstallment] = useState<string | null>(null);
    const [tempInstallmentValue, setTempInstallmentValue] = useState<number>(0);

    // Filtros
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'installment' | 'recurring' | 'oneoff' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'>('all');

    // Aplicar filtros
    const filteredTransactions = transactions.filter(transaction => {
        // Filtro de busca por descrição
        if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Filtro de status
        if (statusFilter === 'paid' && !transaction.paid) return false;
        if (statusFilter === 'pending' && transaction.paid) return false;

        // Filtro de tipo
        if (typeFilter === 'installment' && !transaction.installmentsTotal) return false;
        if (typeFilter === 'recurring' && (!transaction.recurrence || transaction.recurrence === 'ONE_OFF')) return false;
        if (typeFilter === 'oneoff' && (transaction.recurrence !== 'ONE_OFF' || transaction.installmentsTotal)) return false;
        if (typeFilter === 'monthly' && transaction.recurrence !== 'MONTHLY') return false;
        if (typeFilter === 'quarterly' && transaction.recurrence !== 'QUARTERLY') return false;
        if (typeFilter === 'semiannual' && transaction.recurrence !== 'SEMIANNUAL') return false;
        if (typeFilter === 'annual' && transaction.recurrence !== 'ANNUAL') return false;

        return true;
    });

    const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
    const totalPaid = filteredTransactions.filter(t => t.paid).reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
    const totalPending = total - totalPaid;

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            {transactions.length > 0 && (
                <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Busca por descrição */}
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-600">🔍 Buscar</Label>
                                <Input
                                    placeholder="Pesquisar por descrição..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-9 text-sm border-gray-300"
                                />
                            </div>

                            {/* Filtro de status */}
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-600">💰 Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                                        onClick={() => setStatusFilter('all')}
                                        className="flex-1 h-9 text-xs"
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={statusFilter === 'paid' ? 'default' : 'outline'}
                                        onClick={() => setStatusFilter('paid')}
                                        className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                                    >
                                        ✓ Pago
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                                        onClick={() => setStatusFilter('pending')}
                                        className="flex-1 h-9 text-xs bg-orange-600 hover:bg-orange-700"
                                    >
                                        ⏳ Pendente
                                    </Button>
                                </div>
                            </div>

                            {/* Filtro de tipo */}
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-600">📋 Tipo</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'all' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('all')}
                                        className="h-9 text-xs"
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'oneoff' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('oneoff')}
                                        className="h-9 text-xs"
                                        title="Único"
                                    >
                                        1×
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'installment' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('installment')}
                                        className="h-9 text-xs"
                                        title="Parcelado"
                                    >
                                        💳
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'recurring' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('recurring')}
                                        className="h-9 text-xs"
                                        title="Todos Recorrentes"
                                    >
                                        🔄
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'monthly' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('monthly')}
                                        className="h-9 text-xs"
                                        title="Mensal"
                                    >
                                        📅
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'quarterly' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('quarterly')}
                                        className="h-9 text-xs"
                                        title="Trimestral"
                                    >
                                        📊
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'semiannual' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('semiannual')}
                                        className="h-9 text-xs"
                                        title="Semestral"
                                    >
                                        📆
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={typeFilter === 'annual' ? 'default' : 'outline'}
                                        onClick={() => setTypeFilter('annual')}
                                        className="h-9 text-xs"
                                        title="Anual"
                                    >
                                        🔄
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 text-center">
                            Mostrando {filteredTransactions.length} de {transactions.length} transações
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="rounded-md border border-gray-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            {showActions && (
                                <TableHead className="w-[50px]">
                                    {/* Coluna de seleção - feature futura */}
                                </TableHead>
                            )}
                            <TableHead className="text-gray-700">Data</TableHead>
                            <TableHead className="text-gray-700">Descrição</TableHead>
                            <TableHead className="text-gray-700">Categoria</TableHead>
                            <TableHead className="text-gray-700">Forma Pgto</TableHead>
                            <TableHead className="text-gray-700">Recorrência</TableHead>
                            <TableHead className="text-right text-gray-700">Valor</TableHead>
                            <TableHead className="text-center text-gray-700">Pago?</TableHead>
                            {showActions && <TableHead className="text-right text-gray-700">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={showActions ? 9 : 8}
                                    className="text-center text-gray-500 py-8"
                                >
                                    {transactions.length === 0 ? 'Nenhuma transação encontrada' : 'Nenhuma transação corresponde aos filtros'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTransactions.map(transaction => (
                                <TableRow
                                    key={transaction.id}
                                    className={cn(
                                        "hover:bg-gray-50 transition-colors",
                                        transaction.canceledAt && "bg-red-50/50 opacity-60",
                                        transaction.paid && "bg-green-50/30"
                                    )}
                                >
                                    {showActions && (
                                        <TableCell>
                                            {/* Indicador visual de status */}
                                            <div className="flex items-center justify-center">
                                                {transaction.canceledAt ? (
                                                    <div className="h-2 w-2 rounded-full bg-red-500" title="Cancelada" />
                                                ) : transaction.paid ? (
                                                    <div className="h-2 w-2 rounded-full bg-green-500" title="Paga" />
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full bg-orange-400" title="Pendente" />
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                    <TableCell className="text-gray-900">
                                        {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        {transaction.description}
                                    </TableCell>
                                    <TableCell className="text-gray-700">
                                        {transaction.categoryName || '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-700">
                                        {transaction.paymentMethod || '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-700">
                                        <div className="flex flex-col gap-1">
                                            {transaction.installmentsTotal ? (
                                                <div className="flex items-center gap-2">
                                                    {editingInstallment === transaction.id ? (
                                                        <div className="flex items-center gap-1 bg-purple-50 p-1 rounded border border-purple-300">
                                                            <span className="text-xs text-purple-700">💳</span>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                max={transaction.installmentsTotal}
                                                                value={tempInstallmentValue}
                                                                onChange={(e) => setTempInstallmentValue(parseInt(e.target.value) || 1)}
                                                                className="w-12 h-6 text-xs p-1 border-purple-300"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && onAdjustInstallment) {
                                                                        onAdjustInstallment(transaction.id, tempInstallmentValue);
                                                                        setEditingInstallment(null);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingInstallment(null);
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-xs text-purple-700">/{transaction.installmentsTotal}x</span>
                                                            <button
                                                                onClick={() => {
                                                                    if (onAdjustInstallment) {
                                                                        onAdjustInstallment(transaction.id, tempInstallmentValue);
                                                                    }
                                                                    setEditingInstallment(null);
                                                                }}
                                                                className="text-green-600 hover:text-green-800 p-0.5"
                                                                title="Salvar"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingInstallment(null)}
                                                                className="text-red-600 hover:text-red-800 p-0.5"
                                                                title="Cancelar"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-xs w-fit",
                                                                    transaction.paid
                                                                        ? "bg-purple-100 text-purple-800 border-purple-300 font-semibold"
                                                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                                                )}
                                                            >
                                                                💳 Parcelado {transaction.installmentNumber}/{transaction.installmentsTotal}x
                                                            </Badge>
                                                            {/* Warning se número da parcela parece errado */}
                                                            {transaction.installmentNumber &&
                                                                transaction.installmentNumber > transaction.installmentsTotal && (
                                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs w-fit">
                                                                        ⚠️ Erro
                                                                    </Badge>
                                                                )}
                                                            {onAdjustInstallment && showActions && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingInstallment(transaction.id);
                                                                        setTempInstallmentValue(transaction.installmentNumber || 1);
                                                                    }}
                                                                    className="text-purple-600 hover:text-purple-800 text-xs p-0.5"
                                                                    title="Ajustar número da parcela"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ) : transaction.recurrence && transaction.recurrence !== 'ONE_OFF' ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs w-fit",
                                                            transaction.canceledAt
                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                : transaction.paid
                                                                    ? "bg-blue-100 text-blue-800 border-blue-300 font-semibold"
                                                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}
                                                    >
                                                        {transaction.recurrence === 'MONTHLY'
                                                            ? '📅 Recorrente Mensal'
                                                            : transaction.recurrence === 'QUARTERLY'
                                                                ? '📊 Recorrente Trimestral'
                                                                : transaction.recurrence === 'SEMIANNUAL'
                                                                    ? '📆 Recorrente Semestral'
                                                                    : '🔄 Recorrente Anual'
                                                        }
                                                    </Badge>
                                                    {!transaction.canceledAt && onCancelRecurrence && (
                                                        <button
                                                            onClick={() => onCancelRecurrence(transaction.id)}
                                                            className="text-red-600 hover:text-red-800 text-xs underline"
                                                            title="Cancelar recorrência"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                    {transaction.canceledAt && onReactivateRecurrence && (
                                                        <>
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs w-fit font-semibold">
                                                                ❌ Cancelada
                                                            </Badge>
                                                            <button
                                                                onClick={() => onReactivateRecurrence(transaction.id)}
                                                                className="text-green-600 hover:text-green-800 text-xs underline"
                                                                title="Reativar recorrência"
                                                            >
                                                                Reativar
                                                            </button>
                                                        </>
                                                    )}
                                                    {transaction.canceledAt && !onReactivateRecurrence && (
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs w-fit font-semibold">
                                                            ❌ Cancelada
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Única</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-gray-900">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={cn(
                                                "font-semibold",
                                                transaction.paid ? "text-green-700" : "text-gray-900"
                                            )}>
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                            {transaction.installmentsTotal && transaction.installmentsTotal > 1 && (
                                                <span className="text-xs text-gray-500">
                                                    Total: {formatCurrency(transaction.amount * transaction.installmentsTotal)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center items-center py-1">
                                            {onTogglePaid ? (
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={transaction.paid}
                                                        onCheckedChange={(checked) =>
                                                            onTogglePaid(transaction.id, checked)
                                                        }
                                                        className={cn(
                                                            "h-6 w-11",
                                                            transaction.paid
                                                                ? "!bg-green-500 hover:!bg-green-600"
                                                                : "!bg-gray-400 hover:!bg-gray-500"
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant={transaction.paid ? 'default' : 'secondary'}
                                                    className={cn(
                                                        transaction.paid
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 font-semibold'
                                                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold'
                                                    )}
                                                >
                                                    {transaction.paid ? '✓ Sim' : '✗ Não'}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    {showActions && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {onEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onEdit(transaction)}
                                                        className="text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {onDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onDelete(transaction.id)}
                                                        className="text-red-600 hover:text-red-900 cursor-pointer hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Totais */}
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600 mb-1">TOTAL</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
                        </div>
                        <div className="text-center border-l border-gray-300">
                            <p className="text-sm font-medium text-green-700 mb-1">PAGO</p>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="text-center border-l border-gray-300">
                            <p className="text-sm font-medium text-orange-700 mb-1">PENDENTE</p>
                            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPending)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
