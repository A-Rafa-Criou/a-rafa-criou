'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/financial/stat-card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import type { DashboardSummary } from '@/types/financial';

interface DashboardSectionProps {
    summary: DashboardSummary;
}

const COLORS = ['#FD9555', '#FED466', '#4CAF50', '#2196F3'];

export function DashboardSection({ summary }: DashboardSectionProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatShortCurrency = (value: number) => {
        if (value >= 1000) {
            return `R$ ${(value / 1000).toFixed(1)}k`;
        }
        return formatCurrency(value);
    };

    // Dados para o gráfico de pizza (Loja vs Pessoal)
    const scopeData = [
        { name: 'Loja', value: summary.storeExpenses },
        { name: 'Pessoal', value: summary.personalExpenses },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Saldo Inicial"
                    value={formatCurrency(summary.openingBalance)}
                    icon={<Wallet className="h-5 w-5" />}
                    className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border-blue-300"
                />
                <StatCard
                    title="Entradas"
                    value={formatCurrency(summary.totalIncome)}
                    subtitle={`${summary.dailyFlow.filter(d => d.income > 0).length} dias com vendas`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    className="bg-gradient-to-br from-green-100 to-green-200 text-green-900 border-green-300"
                />
                <StatCard
                    title="Saídas"
                    value={formatCurrency(summary.totalExpense)}
                    subtitle={`Loja: ${formatShortCurrency(summary.storeExpenses)} | Pessoal: ${formatShortCurrency(summary.personalExpenses)}`}
                    icon={<TrendingDown className="h-5 w-5" />}
                    className="bg-gradient-to-br from-red-100 to-red-200 text-red-900 border-red-300"
                />
                <StatCard
                    title="Saldo Atual"
                    value={formatCurrency(summary.currentBalance)}
                    subtitle={
                        summary.currentBalance >= summary.openingBalance
                            ? `+${formatCurrency(summary.currentBalance - summary.openingBalance)}`
                            : `${formatCurrency(summary.currentBalance - summary.openingBalance)}`
                    }
                    icon={<DollarSign className="h-5 w-5" />}
                    className={
                        summary.currentBalance >= summary.openingBalance
                            ? 'bg-gradient-to-br from-[#FED466] to-[#FED466]/80 text-gray-900 border-[#FED466]'
                            : 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-900 border-orange-300'
                    }
                />
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Gráfico de fluxo de caixa diário */}
                <Card className="bg-white border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Fluxo de Caixa Diário</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {summary.dailyFlow.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={summary.dailyFlow}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280' }}
                                        tickFormatter={value => {
                                            const date = new Date(value);
                                            return `${date.getDate()}/${date.getMonth() + 1}`;
                                        }}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280' }}
                                        tickFormatter={formatShortCurrency}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        labelFormatter={value => {
                                            const date = new Date(value);
                                            return date.toLocaleDateString('pt-BR');
                                        }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ color: '#6b7280' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#4CAF50"
                                        strokeWidth={2}
                                        name="Entradas"
                                        dot={{ fill: '#4CAF50' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expense"
                                        stroke="#f44336"
                                        strokeWidth={2}
                                        name="Saídas"
                                        dot={{ fill: '#f44336' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#FD9555"
                                        strokeWidth={3}
                                        name="Saldo"
                                        dot={{ fill: '#FD9555' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Gráfico de pizza Loja vs Pessoal */}
                <Card className="bg-white border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Gastos: Loja x Pessoal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {scopeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={scopeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={entry => `${entry.name}: ${formatCurrency(entry.value)}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {scopeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ color: '#6b7280' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                Nenhum gasto registrado
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Resumo adicional */}
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardHeader>
                    <CardTitle className="text-gray-900">Resumo do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-gray-600">Total Loja</p>
                            <p className="text-2xl font-bold text-[#FD9555]">
                                {formatCurrency(summary.storeExpenses)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Pessoal</p>
                            <p className="text-2xl font-bold text-[#FD9555]">
                                {formatCurrency(summary.personalExpenses)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Variação</p>
                            <p
                                className={`text-2xl font-bold ${summary.currentBalance - summary.openingBalance >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}
                            >
                                {summary.currentBalance - summary.openingBalance >= 0 ? '+' : ''}
                                {formatCurrency(summary.currentBalance - summary.openingBalance)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
