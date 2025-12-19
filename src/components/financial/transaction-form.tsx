'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { FinancialTransaction, FinancialCategory } from '@/types/financial';

interface TransactionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<FinancialTransaction>) => Promise<void>;
    transaction?: Partial<FinancialTransaction> & { id?: string };
    categories: FinancialCategory[];
    type: 'INCOME' | 'EXPENSE';
    scope: 'STORE' | 'PERSONAL';
    expenseKind?: 'FIXED' | 'VARIABLE' | 'DAILY';
}

export function TransactionForm({
    open,
    onOpenChange,
    onSubmit,
    transaction,
    categories,
    type,
    scope,
    expenseKind,
}: TransactionFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<FinancialTransaction>>({
        type,
        scope,
        expenseKind,
        paid: false,
        date: new Date(),
        ...transaction,
    });

    useEffect(() => {
        setFormData({
            type,
            scope,
            expenseKind,
            paid: false,
            date: new Date(),
            ...transaction,
        });
    }, [transaction, type, scope, expenseKind]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtro mais flexível para categorias vindas do banco
    const filteredCategories = categories.filter((c: any) => {
        const categoryType = c.type?.toUpperCase();
        const categoryScope = c.scope?.toUpperCase();
        const targetType = type.toUpperCase();
        const targetScope = scope.toUpperCase();

        return (
            c.active &&
            categoryType === targetType &&
            (categoryScope === targetScope || categoryScope === 'BOTH')
        );
    });

    // Debug: mostrar categorias disponíveis no console
    useEffect(() => {
        console.log('Categorias recebidas:', categories.length);
        console.log('Tipo:', type, 'Scope:', scope);
        console.log('Categorias filtradas:', filteredCategories.length);
        if (filteredCategories.length > 0) {
            console.log('Primeira categoria:', filteredCategories[0]);
        }
    }, [categories, type, scope, filteredCategories]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">
                            {transaction?.id ? 'Editar' : 'Nova'} {type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                            Preencha os dados da transação
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Data */}
                        <div className="grid gap-2">
                            <Label htmlFor="date" className="text-gray-700">
                                Data
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={
                                    formData.date ? format(new Date(formData.date), 'yyyy-MM-dd') : ''
                                }
                                onChange={e =>
                                    setFormData({ ...formData, date: new Date(e.target.value) })
                                }
                                required
                                className="border-gray-300 text-gray-900 cursor-pointer"
                            />
                        </div>

                        {/* Descrição */}
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-gray-700">
                                Descrição
                            </Label>
                            <Input
                                id="description"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                                placeholder="Ex: Hospedagem, Mercado, etc"
                                className="border-gray-300 text-gray-900 cursor-text"
                            />
                        </div>

                        {/* Categoria */}
                        <div className="grid gap-2">
                            <Label htmlFor="category" className="text-gray-700">
                                Categoria
                            </Label>
                            <Select
                                value={formData.categoryId || ''}
                                onValueChange={value => setFormData({ ...formData, categoryId: value })}
                            >
                                <SelectTrigger className="border-gray-300 text-gray-900 cursor-pointer">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {filteredCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id!} className="text-gray-900">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Forma de pagamento */}
                        <div className="grid gap-2">
                            <Label htmlFor="payment" className="text-gray-700">
                                Forma de Pagamento
                            </Label>
                            <Select
                                value={formData.paymentMethod || ''}
                                onValueChange={value => setFormData({ ...formData, paymentMethod: value as any })}
                            >
                                <SelectTrigger className="border-gray-300 text-gray-900 cursor-pointer">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="PIX" className="text-gray-900">PIX</SelectItem>
                                    <SelectItem value="CREDIT_CARD" className="text-gray-900">Cartão de Crédito</SelectItem>
                                    <SelectItem value="DEBIT_CARD" className="text-gray-900">Cartão de Débito</SelectItem>
                                    <SelectItem value="BOLETO" className="text-gray-900">Boleto</SelectItem>
                                    <SelectItem value="CASH" className="text-gray-900">Dinheiro</SelectItem>
                                    <SelectItem value="BANK_TRANSFER" className="text-gray-900">Transferência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Valores e Parcelas */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="installments" className="text-gray-700">
                                    Parcelas
                                </Label>
                                <Input
                                    id="installments"
                                    type="number"
                                    min="1"
                                    value={formData.installmentsTotal || ''}
                                    onChange={e => {
                                        const installments = e.target.value ? parseInt(e.target.value) : undefined;
                                        const newData: any = {
                                            ...formData,
                                            installmentsTotal: installments,
                                        };
                                        // Se tiver valor total e parcelas, calcula valor da parcela
                                        if (installments && installments > 1 && formData.amountTotal) {
                                            newData.amount = formData.amountTotal / installments;
                                            newData.amountMonthly = newData.amount;
                                        }
                                        setFormData(newData);
                                    }}
                                    placeholder="1"
                                    className="border-gray-300 text-gray-900 cursor-pointer"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amount" className="text-gray-700">
                                    {formData.installmentsTotal && formData.installmentsTotal > 1
                                        ? 'Valor da Parcela'
                                        : 'Valor'}
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount || ''}
                                    onChange={e => {
                                        const amount = e.target.value ? parseFloat(e.target.value) : 0;
                                        const newData: any = {
                                            ...formData,
                                            amount,
                                            amountMonthly: amount,
                                        };
                                        // Se tiver parcelas, calcula valor total automaticamente
                                        if (formData.installmentsTotal && formData.installmentsTotal > 1) {
                                            newData.amountTotal = amount * formData.installmentsTotal;
                                        }
                                        setFormData(newData);
                                    }}
                                    required
                                    placeholder="0.00"
                                    className="border-gray-300 text-gray-900 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Valor total (se parcelado) */}
                        {formData.installmentsTotal && formData.installmentsTotal > 1 && (
                            <div className="grid gap-2">
                                <Label htmlFor="totalAmount" className="text-gray-700 font-semibold">
                                    Valor Total {formData.amountTotal ? `(${formData.installmentsTotal}x de R$ ${Number(formData.amount || 0).toFixed(2)})` : ''}
                                </Label>
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amountTotal || ''}
                                    onChange={e => {
                                        const total = e.target.value ? parseFloat(e.target.value) : undefined;
                                        const newData: any = {
                                            ...formData,
                                            amountTotal: total,
                                        };
                                        // Calcula valor da parcela automaticamente
                                        if (total && formData.installmentsTotal && formData.installmentsTotal > 1) {
                                            newData.amount = total / formData.installmentsTotal;
                                            newData.amountMonthly = newData.amount;
                                        }
                                        setFormData(newData);
                                    }}
                                    placeholder="0.00"
                                    className="border-gray-300 text-gray-900 font-semibold text-lg cursor-pointer"
                                />
                            </div>
                        )}

                        {/* Pago? */}
                        <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <Checkbox
                                id="paid"
                                checked={formData.paid}
                                onCheckedChange={checked =>
                                    setFormData({
                                        ...formData,
                                        paid: checked as boolean,
                                        paidAt: checked ? new Date() : undefined,
                                    })
                                }
                            />
                            <Label htmlFor="paid" className="text-sm text-gray-900 font-semibold cursor-pointer">
                                Marcar como Pago
                            </Label>
                        </div>

                        {/* Observações */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-gray-700">
                                Observações
                            </Label>
                            <Textarea
                                id="notes"
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Informações adicionais"
                                className="border-gray-300 text-gray-900"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="text-gray-700 border-gray-300"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white"
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
