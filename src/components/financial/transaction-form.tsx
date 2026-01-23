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
        paid: type === 'INCOME' ? true : false, // Receitas já marcadas como recebidas por padrão
        date: new Date(),
        recurrence: type === 'EXPENSE' ? 'ONE_OFF' : undefined, // Recorrência só para despesas
        ...transaction,
    });

    useEffect(() => {
        setFormData({
            type,
            scope,
            expenseKind,
            paid: type === 'INCOME' ? true : false,
            date: new Date(),
            recurrence: type === 'EXPENSE' ? 'ONE_OFF' : undefined,
            ...transaction,
        });
    }, [transaction, type, scope, expenseKind]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação: garantir que o valor foi preenchido
        if (!formData.amount && formData.amount !== 0) {
            alert('Por favor, preencha o valor da transação');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className={type === 'INCOME' ? 'bg-gradient-to-r from-green-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 mb-4 rounded-t-lg border-b-2 border-green-200' : ''}>
                        <DialogTitle className={`${type === 'INCOME' ? 'text-green-800 text-xl' : 'text-gray-900'} flex items-center gap-2`}>
                            {type === 'INCOME' && <span className="text-2xl">💰</span>}
                            {transaction?.id ? 'Editar' : type === 'INCOME' ? 'Adicionar' : 'Nova'} {type === 'INCOME' ? 'Venda Extra / Receita' : 'Despesa'}
                        </DialogTitle>
                        <DialogDescription className={type === 'INCOME' ? 'text-green-700' : 'text-gray-600'}>
                            {type === 'INCOME' ? (
                                <span className="block font-medium">
                                    ✨ <strong>Registre vendas externas, PIX recebidos ou outras entradas</strong> que não vieram da loja online
                                </span>
                            ) : (
                                'Preencha os dados da despesa'
                            )}
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
                                onChange={e => {
                                    // Evitar problema de timezone: criar data ao meio-dia local
                                    const [year, month, day] = e.target.value.split('-').map(Number);
                                    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                                    setFormData({ ...formData, date: localDate });
                                }}
                                required
                                className="border-gray-300 text-gray-900 cursor-pointer"
                            />
                        </div>

                        {/* Descrição */}
                        <div className="grid gap-2">
                            <Label htmlFor="description" className={type === 'INCOME' ? 'text-green-700 font-semibold' : 'text-gray-700'}>
                                {type === 'INCOME' ? 'Descrição da Receita' : 'Descrição'}
                            </Label>
                            <Input
                                id="description"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                                placeholder={type === 'INCOME' ? 'Ex: Venda Instagram, Transferência PIX, Comissão, etc' : 'Ex: Hospedagem, Mercado, etc'}
                                className={`${type === 'INCOME' ? 'border-green-300 focus:border-green-500' : 'border-gray-300'} text-gray-900 cursor-text`}
                            />
                        </div>

                        {/* Categoria */}
                        <div className="grid gap-2">
                            <Label htmlFor="category" className={type === 'INCOME' ? 'text-green-700 font-semibold' : 'text-gray-700'}>
                                Categoria
                            </Label>
                            <Select
                                value={formData.categoryId || ''}
                                onValueChange={value => setFormData({ ...formData, categoryId: value })}
                            >
                                <SelectTrigger className={`${type === 'INCOME' ? 'border-green-300 focus:border-green-500' : 'border-gray-300'} text-gray-900 cursor-pointer`}>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {filteredCategories.length === 0 && (
                                        <div className="px-2 py-3 text-sm text-gray-500">
                                            {type === 'INCOME'
                                                ? '⚠️ Nenhuma categoria de RECEITA encontrada. Crie uma na aba Categorias.'
                                                : '⚠️ Nenhuma categoria encontrada para este tipo.'
                                            }
                                        </div>
                                    )}
                                    {filteredCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id!} className="text-gray-900">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {filteredCategories.length === 0 && type === 'INCOME' && (
                                <p className="text-xs text-amber-600 mt-1">
                                    💡 Dica: Vá até a aba &quot;Categorias&quot; e crie categorias do tipo RECEITA (ex: Vendas Externas, Comissões, etc)
                                </p>
                            )}
                        </div>

                        {/* Forma de pagamento */}
                        <div className="grid gap-2">
                            <Label htmlFor="payment" className={type === 'INCOME' ? 'text-green-700 font-semibold' : 'text-gray-700'}>
                                Forma de {type === 'INCOME' ? 'Recebimento' : 'Pagamento'}
                            </Label>
                            <Select
                                value={formData.paymentMethod || ''}
                                onValueChange={value => setFormData({ ...formData, paymentMethod: value as any })}
                            >
                                <SelectTrigger className={`${type === 'INCOME' ? 'border-green-300 focus:border-green-500' : 'border-gray-300'} text-gray-900 cursor-pointer`}>
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

                        {/* RECEITA: Campo de valor simples */}
                        {type === 'INCOME' && (
                            <div className="grid gap-2">
                                <Label htmlFor="amount" className="text-green-700 font-bold text-base">
                                    💵 Valor Recebido
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount || ''}
                                    onChange={e => {
                                        const amount = e.target.value ? parseFloat(e.target.value) : undefined;
                                        setFormData({
                                            ...formData,
                                            amount,
                                        });
                                    }}
                                    required
                                    placeholder="0.00"
                                    className="border-green-300 focus:border-green-500 text-gray-900 font-semibold text-lg cursor-pointer"
                                />
                            </div>
                        )}

                        {/* DESPESA: Recorrência e parcelas */}
                        {type === 'EXPENSE' && (
                            <>
                                {/* Recorrência */}
                                <div className="grid gap-2">
                                    <Label htmlFor="recurrence" className="text-gray-700">
                                        Tipo de Despesa
                                    </Label>
                                    <Select
                                        value={formData.recurrence || 'ONE_OFF'}
                                        onValueChange={value => {
                                            const newRecurrence = value as any;
                                            const newData: any = {
                                                ...formData,
                                                recurrence: newRecurrence,
                                                // Limpa parcelas se mudar para recorrente
                                                installmentsTotal: newRecurrence !== 'ONE_OFF' ? undefined : formData.installmentsTotal,
                                                installmentNumber: newRecurrence !== 'ONE_OFF' ? undefined : formData.installmentNumber,
                                                amountTotal: newRecurrence !== 'ONE_OFF' ? undefined : formData.amountTotal,
                                            };

                                            // Se mudou para recorrente (MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL), forçar FIXED
                                            if (newRecurrence !== 'ONE_OFF') {
                                                newData.expenseKind = 'FIXED';
                                            }

                                            setFormData(newData);
                                        }}
                                    >
                                        <SelectTrigger className="border-gray-300 text-gray-900 cursor-pointer">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="ONE_OFF" className="text-gray-900">
                                                💳 Única ou Parcelada
                                            </SelectItem>
                                            <SelectItem value="MONTHLY" className="text-gray-900">
                                                📅 Recorrente Mensal
                                            </SelectItem>
                                            <SelectItem value="QUARTERLY" className="text-gray-900">
                                                📊 Recorrente Trimestral
                                            </SelectItem>
                                            <SelectItem value="SEMIANNUAL" className="text-gray-900">
                                                📆 Recorrente Semestral
                                            </SelectItem>
                                            <SelectItem value="ANNUAL" className="text-gray-900">
                                                🔄 Recorrente Anual
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formData.recurrence === 'MONTHLY' && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="text-sm font-semibold text-amber-800 mb-1">
                                                ⚠️ ATENÇÃO: Despesa Recorrente Mensal
                                            </p>
                                            <p className="text-xs text-amber-700">
                                                Esta despesa será criada automaticamente <strong>todos os meses</strong> por 12 meses.
                                                Use apenas para contas que realmente se repetem mensalmente (ex: assinaturas, aluguel).
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                💡 Se for uma compra parcelada (ex: celular em 12x), use <strong>&quot;💳 Única ou Parcelada&quot;</strong> ao invés desta opção!
                                            </p>
                                            <p className="text-xs text-amber-700 mt-2 font-semibold">
                                                ℹ️ Esta transação aparecerá em <strong>&quot;Contas Mensais&quot;</strong> (não em &quot;Gastos Dia a Dia&quot;).
                                            </p>
                                        </div>
                                    )}
                                    {formData.recurrence === 'QUARTERLY' && (
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                            <p className="text-sm font-semibold text-purple-800 mb-1">
                                                📊 Despesa Recorrente Trimestral
                                            </p>
                                            <p className="text-xs text-purple-700">
                                                Esta despesa será criada automaticamente <strong>a cada 3 meses</strong> por 12 ocorrências.
                                                Use para contas trimestrais (ex: impostos, manutenções).
                                            </p>
                                            <p className="text-xs text-purple-700 mt-2 font-semibold">
                                                ℹ️ Esta transação aparecerá em <strong>&quot;Contas Mensais&quot;</strong> (não em &quot;Gastos Dia a Dia&quot;).
                                            </p>
                                        </div>
                                    )}
                                    {formData.recurrence === 'SEMIANNUAL' && (
                                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                            <p className="text-sm font-semibold text-indigo-800 mb-1">
                                                📆 Despesa Recorrente Semestral
                                            </p>
                                            <p className="text-xs text-indigo-700">
                                                Esta despesa será criada automaticamente <strong>a cada 6 meses</strong> por 6 ocorrências.
                                                Use para contas semestrais (ex: seguro semestral, taxas).
                                            </p>
                                            <p className="text-xs text-indigo-700 mt-2 font-semibold">
                                                ℹ️ Esta transação aparecerá em <strong>&quot;Contas Mensais&quot;</strong> (não em &quot;Gastos Dia a Dia&quot;).
                                            </p>
                                        </div>
                                    )}
                                    {formData.recurrence === 'ANNUAL' && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm font-semibold text-blue-800 mb-1">
                                                🔄 Despesa Recorrente Anual
                                            </p>
                                            <p className="text-xs text-blue-700">
                                                Esta despesa será criada automaticamente <strong>todo ano</strong> por 3 anos.
                                                Use apenas para contas anuais (ex: domínio, IPTU).
                                            </p>
                                            <p className="text-xs text-blue-700 mt-2 font-semibold">
                                                ℹ️ Esta transação aparecerá em <strong>&quot;Contas Mensais&quot;</strong> (não em &quot;Gastos Dia a Dia&quot;).
                                            </p>
                                        </div>
                                    )}
                                    {formData.recurrence === 'ONE_OFF' && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-xs text-green-700">
                                                ✅ Despesa única ou parcelada. Configure o número de parcelas abaixo se for parcelado.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Valores e Parcelas - só mostra parcelas se for ONE_OFF */}
                                {formData.recurrence === 'ONE_OFF' && (
                                    <>
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                            <p className="text-sm font-semibold text-purple-800 mb-1">
                                                💳 Como funciona o parcelamento?
                                            </p>
                                            <p className="text-xs text-purple-700 mb-1">
                                                • Se colocar <strong>1 parcela</strong>: despesa única que aparece apenas no mês selecionado
                                            </p>
                                            <p className="text-xs text-purple-700 mb-1">
                                                • Se colocar <strong>12 parcelas</strong>: cria automaticamente 12 cobranças (1/12, 2/12... 12/12) em meses consecutivos
                                            </p>
                                            <p className="text-xs text-purple-700">
                                                • Cada parcela tem sua <strong>própria data</strong> e <strong>não se repete</strong> depois de terminar
                                            </p>
                                        </div>

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
                                    </>
                                )}

                                {/* Valor único para recorrentes */}
                                {formData.recurrence && formData.recurrence !== 'ONE_OFF' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="amount" className="text-gray-700">
                                            Valor {
                                                formData.recurrence === 'MONTHLY' ? 'Mensal' :
                                                    formData.recurrence === 'QUARTERLY' ? 'Trimestral' :
                                                        formData.recurrence === 'SEMIANNUAL' ? 'Semestral' :
                                                            'Anual'
                                            }
                                        </Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount || ''}
                                            onChange={e => {
                                                const amount = e.target.value ? parseFloat(e.target.value) : 0;
                                                setFormData({
                                                    ...formData,
                                                    amount,
                                                    amountMonthly: amount,
                                                });
                                            }}
                                            required
                                            placeholder="0.00"
                                            className="border-gray-300 text-gray-900 cursor-pointer"
                                        />
                                    </div>
                                )}

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
                            </>
                        )}

                        {/* Pago? */}
                        <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${type === 'INCOME'
                            ? 'border-green-200 bg-green-50 hover:bg-green-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}>
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
                            <Label htmlFor="paid" className={`text-sm font-semibold cursor-pointer ${type === 'INCOME' ? 'text-green-800' : 'text-gray-900'
                                }`}>
                                {type === 'INCOME' ? '✓ Recebi este valor' : 'Marcar como Pago'}
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
                            className={type === 'INCOME' ? 'bg-green-600 hover:bg-green-700 text-white font-semibold' : 'bg-[#FD9555] hover:bg-[#FD9555]/90 text-white'}
                        >
                            {loading ? 'Salvando...' : type === 'INCOME' ? '💰 Adicionar Receita' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
