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
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
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
}

interface TransactionTableProps {
    transactions: Transaction[];
    onEdit?: (transaction: any) => void;
    onDelete?: (id: string) => void;
    onTogglePaid?: (id: string, paid: boolean) => void;
    showActions?: boolean;
}

export function TransactionTable({
    transactions,
    onEdit,
    onDelete,
    onTogglePaid,
    showActions = true,
}: TransactionTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = transactions.filter(t => t.paid).reduce((sum, t) => sum + t.amount, 0);
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
            <div className="rounded-md border border-gray-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            {showActions && (
                                <TableHead className="w-[50px]">
                                    <Checkbox />
                                </TableHead>
                            )}
                            <TableHead className="text-gray-700">Data</TableHead>
                            <TableHead className="text-gray-700">Descrição</TableHead>
                            <TableHead className="text-gray-700">Categoria</TableHead>
                            <TableHead className="text-gray-700">Forma Pgto</TableHead>
                            <TableHead className="text-gray-700">Parcelas</TableHead>
                            <TableHead className="text-right text-gray-700">Valor</TableHead>
                            <TableHead className="text-center text-gray-700">Pago?</TableHead>
                            {showActions && <TableHead className="text-right text-gray-700">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={showActions ? 9 : 8}
                                    className="text-center text-gray-500 py-8"
                                >
                                    Nenhuma transação encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map(transaction => (
                                <TableRow key={transaction.id} className="hover:bg-gray-50">
                                    {showActions && (
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(transaction.id)}
                                                onCheckedChange={() => toggleSelect(transaction.id)}
                                            />
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
                                        {transaction.installmentsTotal
                                            ? `${transaction.installmentNumber}/${transaction.installmentsTotal}`
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-gray-900">
                                        {formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {onTogglePaid ? (
                                            <Checkbox
                                                checked={transaction.paid}
                                                onCheckedChange={checked =>
                                                    onTogglePaid(transaction.id, checked as boolean)
                                                }
                                            />
                                        ) : (
                                            <Badge
                                                variant={transaction.paid ? 'default' : 'secondary'}
                                                className={cn(
                                                    transaction.paid
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                )}
                                            >
                                                {transaction.paid ? 'Sim' : 'Não'}
                                            </Badge>
                                        )}
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
