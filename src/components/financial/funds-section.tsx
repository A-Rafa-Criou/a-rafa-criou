'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Fund, FundContribution, FinancialCategory } from '@/types/financial';

interface FundWithContributions extends Fund {
    contributions?: FundContribution[];
    category?: FinancialCategory | null;
}

interface FundsSectionProps {
    annualBills: FundWithContributions[];
    investments: FundWithContributions[];
    currentMonth: string;
    onCreateFund: (type: 'ANNUAL_BILL' | 'INVESTMENT') => void;
    onToggleContribution: (fundId: string, month: string, saved: boolean) => Promise<void>;
}

export function FundsSection({
    annualBills,
    investments,
    currentMonth,
    onCreateFund,
    onToggleContribution,
}: FundsSectionProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const calculateProgress = (fund: FundWithContributions) => {
        if (!fund.contributions) return 0;
        const totalSaved = fund.contributions.reduce(
            (sum, c) => sum + (c.saved ? parseFloat(c.savedAmount?.toString() || '0') : 0),
            0
        );
        return (totalSaved / parseFloat(fund.totalAmount.toString())) * 100;
    };

    const countMissedMonths = (fund: FundWithContributions) => {
        if (!fund.contributions) return 0;
        return fund.contributions.filter(c => c.month <= currentMonth && !c.saved).length;
    };

    const handleToggle = async (fundId: string, month: string, currentValue: boolean) => {
        setLoading(`${fundId}-${month}`);
        try {
            await onToggleContribution(fundId, month, !currentValue);
        } finally {
            setLoading(null);
        }
    };

    const renderFundCard = (fund: FundWithContributions) => {
        const progress = calculateProgress(fund);
        const missedMonths = countMissedMonths(fund);
        const totalSaved = fund.contributions?.reduce(
            (sum, c) => sum + (c.saved ? parseFloat(c.savedAmount?.toString() || '0') : 0),
            0
        ) || 0;

        return (
            <Card key={fund.id} className="bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold text-gray-900">{fund.title}</CardTitle>
                            {fund.category?.name && (
                                <p className="text-sm text-gray-700 mt-1 font-medium">{fund.category.name}</p>
                            )}
                        </div>
                        {missedMonths > 0 && (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 border-2 border-red-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {missedMonths} atrasado{missedMonths > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Progresso */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Progresso</span>
                            <span className="text-gray-900 font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Guardado: {formatCurrency(totalSaved)}</span>
                            <span>Meta: {formatCurrency(parseFloat(fund.totalAmount.toString()))}</span>
                        </div>
                    </div>

                    {/* Informações */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">Valor Mensal</p>
                            <p className="text-gray-900 font-medium">
                                {formatCurrency(parseFloat(fund.monthlyAmount.toString()))}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">
                                {fund.fundType === 'ANNUAL_BILL' ? 'Vencimento' : 'Término'}
                            </p>
                            <p className="text-gray-900 font-medium">
                                {fund.endDate
                                    ? format(new Date(fund.endDate), 'dd/MM/yyyy', { locale: ptBR })
                                    : '-'}
                            </p>
                        </div>
                    </div>

                    {/* Lista de contribuições (últimos 6 meses) */}
                    {fund.contributions && fund.contributions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Contribuições</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {fund.contributions.slice(0, 6).map(contribution => (
                                    <div
                                        key={contribution.id}
                                        className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={contribution.saved}
                                                onCheckedChange={() => {
                                                    if (fund.id) {
                                                        handleToggle(fund.id, contribution.month, contribution.saved);
                                                    }
                                                }}
                                                disabled={!fund.id || loading === `${fund.id}-${contribution.month}`}
                                            />
                                            <span className="text-sm text-gray-700">
                                                {format(new Date(contribution.month + '-01'), 'MMM/yyyy', {
                                                    locale: ptBR,
                                                })}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatCurrency(parseFloat(contribution.expectedAmount.toString()))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {fund.notes && (
                        <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">{fund.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8">
            {/* Contas Anuais */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                        💰 Valores a Guardar para Contas Anuais
                    </h3>
                    <Button
                        onClick={() => onCreateFund('ANNUAL_BILL')}
                        className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold shadow-md"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Conta Anual
                    </Button>
                </div>
                {annualBills.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {annualBills.map(renderFundCard)}
                    </div>
                ) : (
                    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
                        <CardContent className="py-12 text-center text-gray-600 font-medium">
                            Nenhuma conta anual cadastrada
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Investimentos */}
            <div>
                <div className="flex justify-between items-center mb-6 mt-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                        📈 Valores a Guardar para Investimentos
                    </h3>
                    <Button
                        onClick={() => onCreateFund('INVESTMENT')}
                        className="bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-semibold shadow-md"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Investimento
                    </Button>
                </div>
                {investments.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {investments.map(renderFundCard)}
                    </div>
                ) : (
                    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
                        <CardContent className="py-12 text-center text-gray-600 font-medium">
                            Nenhum investimento cadastrado
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
