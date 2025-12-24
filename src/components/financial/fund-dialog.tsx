'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Calendar, Calculator } from 'lucide-react';
import type { Fund, FinancialCategory } from '@/types/financial';
import { format, addMonths } from 'date-fns';

interface FundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<Fund>) => Promise<void>;
    fund?: Fund | null;
    fundType: 'ANNUAL_BILL' | 'INVESTMENT';
    categories: FinancialCategory[];
}

export function FundDialog({
    open,
    onOpenChange,
    onSubmit,
    fund,
    fundType,
    categories,
}: FundDialogProps) {
    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        notes: '',
        startDate: format(new Date(), 'yyyy-MM'),
        dueDay: 10, // Dia do vencimento (1-31)
        isRecurring: true, // Contas anuais recorrem por padrão
    });

    // Modo de cálculo: 'total-first' ou 'monthly-first'
    const [calculationMode, setCalculationMode] = useState<'total-first' | 'monthly-first'>('total-first');

    // Valores de entrada
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [monthlyAmount, setMonthlyAmount] = useState<string>('');
    const [installments, setInstallments] = useState<number>(1);

    // Valores calculados
    const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
    const [calculatedMonthly, setCalculatedMonthly] = useState<number>(0);
    const [endDate, setEndDate] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (fund) {
            const startDateStr = fund.startDate ? format(new Date(fund.startDate), 'yyyy-MM') : format(new Date(), 'yyyy-MM');
            const dueDay = fund.startDate ? new Date(fund.startDate).getDate() : 10;
            setFormData({
                title: fund.title || '',
                categoryId: fund.categoryId || '',
                notes: fund.notes || '',
                startDate: startDateStr,
                dueDay: dueDay,
                isRecurring: true,
            });

            const total = parseFloat(fund.totalAmount?.toString() || '0');
            const monthly = parseFloat(fund.monthlyAmount?.toString() || '0');

            setTotalAmount(total.toFixed(2));
            setMonthlyAmount(monthly.toFixed(2));
            setCalculatedTotal(total);
            setCalculatedMonthly(monthly);

            // Calcular número de parcelas baseado nos valores
            if (monthly > 0) {
                const calc = Math.round(total / monthly);
                setInstallments(calc > 0 ? calc : 1);
            }
        } else {
            setFormData({
                title: '',
                categoryId: '',
                notes: '',
                startDate: format(new Date(), 'yyyy-MM'),
                dueDay: 10,
                isRecurring: true,
            });
            setTotalAmount('');
            setMonthlyAmount('');
            setInstallments(fundType === 'ANNUAL_BILL' ? 12 : 1);
            setCalculatedTotal(0);
            setCalculatedMonthly(0);
        }
    }, [fund, fundType, open]);

    // Recalcular quando modo "total primeiro"
    useEffect(() => {
        if (calculationMode === 'total-first' && totalAmount) {
            const total = parseFloat(totalAmount) || 0;
            const monthly = installments > 0 ? total / installments : 0;
            setCalculatedTotal(total);
            setCalculatedMonthly(monthly);
            setMonthlyAmount(monthly.toFixed(2));
        }
    }, [calculationMode, totalAmount, installments]);

    // Recalcular quando modo "mensal primeiro"
    useEffect(() => {
        if (calculationMode === 'monthly-first' && monthlyAmount) {
            const monthly = parseFloat(monthlyAmount) || 0;
            const total = monthly * installments;
            setCalculatedTotal(total);
            setCalculatedMonthly(monthly);
            setTotalAmount(total.toFixed(2));
        }
    }, [calculationMode, monthlyAmount, installments]);

    // Calcular data de término automaticamente
    useEffect(() => {
        if (formData.startDate && installments > 0) {
            const [year, month] = formData.startDate.split('-').map(Number);
            const start = new Date(year, month - 1, 1);
            // Adiciona installments-1 porque o primeiro mês já conta
            const end = addMonths(start, installments - 1);
            const endDateStr = format(end, 'yyyy-MM');
            console.log('📅 Calculando endDate:', {
                startDate: formData.startDate,
                installments,
                start: start.toISOString(),
                end: end.toISOString(),
                endDate: endDateStr
            });
            setEndDate(endDateStr);
        }
    }, [formData.startDate, installments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const dueDay = formData.dueDay.toString().padStart(2, '0');
            // Usar formato completo de data/hora para evitar problemas de timezone
            // Adicionar T12:00:00 garante que o dia não será alterado por conversões de fuso
            const submitData: Partial<Fund> = {
                fundType,
                title: formData.title,
                totalAmount: calculatedTotal,
                monthlyAmount: calculatedMonthly,
                startDate: new Date(formData.startDate + '-' + dueDay + 'T12:00:00'),
                endDate: endDate ? new Date(endDate + '-' + dueDay + 'T12:00:00') : undefined,
                categoryId: formData.categoryId || undefined,
                notes: formData.notes || undefined,
                active: true,
            };

            console.log('📤 Enviando dados do fundo:', {
                ...submitData,
                startDate: submitData.startDate?.toISOString(),
                endDate: submitData.endDate?.toISOString(),
            });

            await onSubmit(submitData);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {fund ? 'Editar' : 'Criar'}{' '}
                            {fundType === 'ANNUAL_BILL' ? 'Conta Anual' : 'Investimento'}
                        </DialogTitle>
                        <DialogDescription>
                            {fundType === 'ANNUAL_BILL'
                                ? 'Configure uma conta anual (IPVA, IPTU, etc.) para guardar dinheiro mensalmente'
                                : 'Configure um investimento e guarde valores mensalmente até atingir a meta'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-6">
                        {/* Informações Básicas */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-base font-semibold">
                                    Nome da {fundType === 'ANNUAL_BILL' ? 'Conta' : 'Meta'} *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder={fundType === 'ANNUAL_BILL' ? 'Ex: IPVA 2025, IPTU' : 'Ex: Reserva de Emergência, Viagem'}
                                    className="text-base"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="categoryId" className="text-base font-semibold">Categoria</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={value => setFormData(prev => ({ ...prev, categoryId: value }))}
                                >
                                    <SelectTrigger className="text-base">
                                        <SelectValue placeholder="Selecione uma categoria (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.filter(cat => cat.id).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id!}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Cálculo de Valores */}
                        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calculator className="h-5 w-5 text-blue-600" />
                                    <Label className="text-base font-semibold text-gray-900">
                                        Cálculo Automático de Valores
                                    </Label>
                                </div>

                                <RadioGroup
                                    value={calculationMode}
                                    onValueChange={(value: 'total-first' | 'monthly-first') => setCalculationMode(value)}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-gray-200 bg-white">
                                        <RadioGroupItem value="total-first" id="total-first" />
                                        <Label htmlFor="total-first" className="flex-1 cursor-pointer font-medium">
                                            Sei o valor total e quero dividir em parcelas
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 border-gray-200 bg-white">
                                        <RadioGroupItem value="monthly-first" id="monthly-first" />
                                        <Label htmlFor="monthly-first" className="flex-1 cursor-pointer font-medium">
                                            Sei quanto vou guardar por mês
                                        </Label>
                                    </div>
                                </RadioGroup>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    {/* Valor Total */}
                                    <div className="space-y-2">
                                        <Label htmlFor="totalAmount" className="text-sm font-semibold">
                                            Valor Total (R$) *
                                        </Label>
                                        <Input
                                            id="totalAmount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={totalAmount}
                                            onChange={e => setTotalAmount(e.target.value)}
                                            disabled={calculationMode === 'monthly-first'}
                                            className="text-base font-semibold"
                                            required
                                        />
                                    </div>

                                    {/* Valor Mensal */}
                                    <div className="space-y-2">
                                        <Label htmlFor="monthlyAmount" className="text-sm font-semibold">
                                            Valor Mensal (R$) *
                                        </Label>
                                        <Input
                                            id="monthlyAmount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={monthlyAmount}
                                            onChange={e => setMonthlyAmount(e.target.value)}
                                            disabled={calculationMode === 'total-first'}
                                            className="text-base font-semibold"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Número de Parcelas/Meses */}
                                <div className="space-y-2">
                                    <Label htmlFor="installments" className="text-sm font-semibold">
                                        {fundType === 'ANNUAL_BILL' ? 'Número de Meses para Guardar' : 'Quantos Meses até a Meta'}
                                    </Label>
                                    <Select
                                        value={installments.toString()}
                                        onValueChange={value => setInstallments(parseInt(value))}
                                    >
                                        <SelectTrigger className="text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Pagamento único (à vista)</SelectItem>
                                            {Array.from({ length: 24 }, (_, i) => i + 2).map(num => (
                                                <SelectItem key={num} value={num.toString()}>
                                                    {num} {num === 12 ? 'meses (1 ano)' : num === 24 ? 'meses (2 anos)' : 'meses'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Resumo do Cálculo */}
                                {calculatedTotal > 0 && (
                                    <Card className="p-4 bg-white border-2 border-green-200">
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-gray-700">📊 Resumo:</p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Valor Total:</p>
                                                    <p className="text-lg font-bold text-green-700">{formatCurrency(calculatedTotal)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Por Mês:</p>
                                                    <p className="text-lg font-bold text-blue-700">{formatCurrency(calculatedMonthly)}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2">
                                                💡 {installments === 1
                                                    ? 'Pagamento único, sem parcelamento'
                                                    : `Guardando ${formatCurrency(calculatedMonthly)} por mês durante ${installments} meses`}
                                            </p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </Card>

                        {/* Datas */}
                        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                    <Label className="text-base font-semibold text-gray-900">
                                        Período
                                    </Label>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label htmlFor="startDate" className="text-sm font-semibold">
                                                Mês de Início *
                                            </Label>
                                            <Input
                                                id="startDate"
                                                type="month"
                                                value={formData.startDate}
                                                onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                                className="text-base"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dueDay" className="text-sm font-semibold">
                                                Dia *
                                            </Label>
                                            <Select
                                                value={formData.dueDay.toString()}
                                                onValueChange={value => setFormData(prev => ({ ...prev, dueDay: parseInt(value) }))}
                                            >
                                                <SelectTrigger className="text-base">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                        <SelectItem key={day} value={day.toString()}>
                                                            Dia {day}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-600">
                                                Data Completa de Início
                                            </Label>
                                            <Input
                                                value={formData.startDate + '-' + formData.dueDay.toString().padStart(2, '0')}
                                                disabled
                                                className="text-base bg-blue-50 text-blue-700 font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-600">
                                                Data de Término (automático)
                                            </Label>
                                            <Input
                                                value={endDate ? endDate + '-' + formData.dueDay.toString().padStart(2, '0') : ''}
                                                disabled
                                                className="text-base bg-gray-100 text-gray-700 font-semibold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {fundType === 'ANNUAL_BILL' && (
                                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border-2 border-purple-200">
                                        <Switch
                                            id="recurring"
                                            checked={formData.isRecurring}
                                            onCheckedChange={checked => setFormData(prev => ({ ...prev, isRecurring: checked }))}
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor="recurring" className="cursor-pointer font-semibold text-sm">
                                                🔄 Repetir anualmente
                                            </Label>
                                            <p className="text-xs text-gray-600">
                                                Esta conta se repetirá automaticamente no próximo ano
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Observações */}
                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-base font-semibold">Observações</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Informações adicionais, lembretes..."
                                rows={3}
                                className="text-base"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || calculatedTotal === 0}
                            className="bg-[#FD9555] hover:bg-[#FD9555]/90"
                        >
                            {isSubmitting ? 'Salvando...' : fund ? 'Atualizar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
