'use client';

import { useState, Fragment } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
    onEditFund: (fund: FundWithContributions) => void;
    onDeleteFund: (fundId: string) => void;
    onToggleContribution: (fundId: string, month: string, saved: boolean) => Promise<void>;
}

export function FundsSection({
    annualBills,
    investments,
    currentMonth,
    onCreateFund,
    onEditFund,
    onDeleteFund,
    onToggleContribution,
}: FundsSectionProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedFunds, setExpandedFunds] = useState<Set<string>>(new Set());

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const toggleExpand = (fundId: string) => {
        const newExpanded = new Set(expandedFunds);
        if (newExpanded.has(fundId)) {
            newExpanded.delete(fundId);
        } else {
            newExpanded.add(fundId);
        }
        setExpandedFunds(newExpanded);
    };

    const handleToggle = async (fundId: string, month: string, currentValue: boolean) => {
        setLoading(`${fundId}-${month}`);
        try {
            await onToggleContribution(fundId, month, !currentValue);
        } finally {
            setLoading(null);
        }
    };

    const renderFundsTable = (funds: FundWithContributions[], title: string, type: 'ANNUAL_BILL' | 'INVESTMENT') => {
        // Criar lista agrupada por fundo
        const fundGroups = funds.map(fund => {
            const contributions = (fund.contributions || [])
                .filter(c => c.month >= currentMonth) // Apenas do mês atual em diante
                .sort((a, b) => a.month.localeCompare(b.month)); // Ordem crescente

            return {
                fund,
                contributions,
                currentContribution: contributions[0], // Primeira parcela (mês atual ou próxima)
                futureContributions: contributions.slice(1), // Demais parcelas
            };
        }).filter(g => g.contributions.length > 0); // Apenas fundos com contribuições futuras

        // Calcular totais
        const allContributions = fundGroups.flatMap(g => g.contributions);
        const total = allContributions.reduce((sum, c) => sum + parseFloat(c.expectedAmount.toString()), 0);
        const totalPaid = allContributions.filter(c => c.saved).reduce((sum, c) => sum + parseFloat(c.savedAmount?.toString() || '0'), 0);
        const totalPending = total - totalPaid;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <Button
                        onClick={() => onCreateFund(type)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                    </Button>
                </div>

                <div className="rounded-md border border-gray-200 bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="text-gray-700">Mês</TableHead>
                                <TableHead className="text-gray-700">Descrição</TableHead>
                                <TableHead className="text-gray-700">Categoria</TableHead>
                                <TableHead className="text-gray-700">Vencimento</TableHead>
                                <TableHead className="text-right text-gray-700">Valor</TableHead>
                                <TableHead className="text-center text-gray-700">Pago?</TableHead>
                                <TableHead className="text-right text-gray-700">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fundGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                        Nenhum fundo encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fundGroups.map((group) => {
                                    const { fund, currentContribution, futureContributions } = group;
                                    const isExpanded = expandedFunds.has(fund.id || '');

                                    // Calcular rowSpan dinamicamente
                                    const totalRowsForFund = 1 + (isExpanded ? futureContributions.length : 0);

                                    const renderContributionRow = (contribution: FundContribution, isFirst: boolean) => {
                                        const dueDay = fund.startDate ? new Date(fund.startDate).getDate() : 10;
                                        const [year, month] = contribution.month.split('-');
                                        const fullDate = new Date(parseInt(year), parseInt(month) - 1, dueDay);
                                        const isPast = contribution.month < currentMonth;
                                        const isCurrent = contribution.month === currentMonth;
                                        const isOverdue = isPast && !contribution.saved;

                                        return (
                                            <TableRow key={`${fund.id}-${contribution.month}`} className="hover:bg-gray-50">
                                                {isFirst && (
                                                    <TableCell rowSpan={totalRowsForFund}>
                                                        {futureContributions.length > 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => fund.id && toggleExpand(fund.id)}
                                                                className="h-6 w-6"
                                                            >
                                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-gray-900">
                                                    <span className={cn(
                                                        "font-medium",
                                                        contribution.saved && "line-through text-gray-500",
                                                        isOverdue && "text-red-700",
                                                        isCurrent && "text-blue-700"
                                                    )}>
                                                        {format(fullDate, 'MMM/yy', { locale: ptBR })}
                                                    </span>
                                                </TableCell>
                                                {isFirst && (
                                                    <TableCell className="font-medium text-gray-900" rowSpan={totalRowsForFund}>
                                                        {fund.title}
                                                    </TableCell>
                                                )}
                                                {isFirst && (
                                                    <TableCell className="text-gray-700" rowSpan={totalRowsForFund}>
                                                        {fund.category?.name || '-'}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-gray-900">
                                                    {format(fullDate, 'dd/MM/yyyy', { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-gray-900">
                                                    {formatCurrency(parseFloat(contribution.expectedAmount.toString()))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center items-center py-1">
                                                        <Switch
                                                            checked={contribution.saved}
                                                            onCheckedChange={() => {
                                                                if (fund.id) {
                                                                    handleToggle(fund.id, contribution.month, contribution.saved);
                                                                }
                                                            }}
                                                            disabled={!fund.id || loading === `${fund.id}-${contribution.month}`}
                                                            className={cn(
                                                                "h-6 w-11",
                                                                contribution.saved
                                                                    ? "!bg-green-500 hover:!bg-green-600"
                                                                    : "!bg-gray-400 hover:!bg-gray-500"
                                                            )}
                                                        />
                                                    </div>
                                                </TableCell>
                                                {isFirst && (
                                                    <TableCell className="text-right" rowSpan={totalRowsForFund}>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onEditFund(fund)}
                                                                className="text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const totalParcels = fund.contributions?.length || 0;
                                                                    if (confirm(`Tem certeza que deseja deletar o fundo "${fund.title}" e todas as suas ${totalParcels} parcelas?`)) {
                                                                        fund.id && onDeleteFund(fund.id);
                                                                    }
                                                                }}
                                                                className="text-red-600 hover:text-red-900 cursor-pointer hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    };

                                    return (
                                        <Fragment key={fund.id}>
                                            {renderContributionRow(currentContribution, true)}
                                            {isExpanded && futureContributions.map(contribution =>
                                                <Fragment key={`${fund.id}-${contribution.month}`}>
                                                    {renderContributionRow(contribution, false)}
                                                </Fragment>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Totais - só mostrar se houver dados */}
                {allContributions.length > 0 && (
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
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {renderFundsTable(annualBills, '📅 Contas Anuais', 'ANNUAL_BILL')}
            {renderFundsTable(investments, '💰 Investimentos', 'INVESTMENT')}
        </div>
    );
}
