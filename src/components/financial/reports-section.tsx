'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { PaymentMethodStats, CategoryStats, TopExpenses } from '@/types/financial';

interface ReportsSectionProps {
    storeTotal: number;
    personalTotal: number;
    paymentMethods: PaymentMethodStats[];
    categories: CategoryStats[];
    topExpenses: TopExpenses[];
}

const COLORS = ['#FD9555', '#FED466', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548'];

export function ReportsSection({
    storeTotal,
    personalTotal,
    paymentMethods,
    categories,
    topExpenses,
}: ReportsSectionProps) {
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

    // Dados para gráfico Loja x Pessoal
    const scopeData = [
        { name: 'Loja', value: storeTotal },
        { name: 'Pessoal', value: personalTotal },
    ].filter(item => item.value > 0);

    // Dados para gráfico de formas de pagamento
    const paymentData = paymentMethods.map(pm => ({
        name: pm.method.replace('_', ' '),
        value: pm.total,
        count: pm.count,
    }));

    return (
        <div className="space-y-6">
            {/* Total Loja x Pessoal */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white border-2 border-gray-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-[#FD9555]/10 to-[#FED466]/10 border-b-2 border-gray-200">
                        <CardTitle className="text-xl font-bold text-gray-900">Gastos: Loja x Pessoal</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-4 bg-gradient-to-br from-[#FD9555]/20 to-[#FD9555]/10 rounded-lg border-2 border-[#FD9555]">
                                <p className="text-sm font-semibold text-gray-700 mb-1">LOJA</p>
                                <p className="text-3xl font-bold text-[#FD9555]">{formatCurrency(storeTotal)}</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-[#FED466]/20 to-[#FED466]/10 rounded-lg border-2 border-[#FED466]">
                                <p className="text-sm font-semibold text-gray-700 mb-1">PESSOAL</p>
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(personalTotal)}</p>
                            </div>
                        </div>
                        {scopeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={scopeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                                    <YAxis
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280' }}
                                        tickFormatter={formatShortCurrency}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#FD9555" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Formas de Pagamento */}
                <Card className="bg-white border-2 border-gray-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-gray-200">
                        <CardTitle className="text-xl font-bold text-gray-900">Formas de Pagamento Mais Usadas</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {paymentData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={paymentData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={entry => `${entry.name}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {paymentData.map((entry, index) => (
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
                            <div className="flex items-center justify-center h-[250px] text-gray-500">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Gastos por Categoria */}
            <Card className="bg-white border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b-2 border-gray-200">
                    <CardTitle className="text-xl font-bold text-gray-900">Gastos por Categoria</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {categories.length > 0 ? (
                        <div className="rounded-md border-2 border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50">
                                        <TableHead className="text-gray-900 font-bold">Categoria</TableHead>
                                        <TableHead className="text-center text-gray-900 font-bold">Transações</TableHead>
                                        <TableHead className="text-right text-gray-900 font-bold">Total</TableHead>
                                        <TableHead className="text-right text-gray-900 font-bold">Percentual</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map(cat => (
                                        <TableRow key={cat.categoryId} className="hover:bg-orange-50 border-b border-gray-200">
                                            <TableCell className="font-semibold text-gray-900">
                                                {cat.categoryName}
                                            </TableCell>
                                            <TableCell className="text-center text-gray-700 font-medium">{cat.count}</TableCell>
                                            <TableCell className="text-right font-bold text-[#FD9555] text-lg">
                                                {formatCurrency(cat.total)}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-700 font-medium">
                                                {cat.percentage.toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">Nenhuma categoria encontrada</div>
                    )}
                </CardContent>
            </Card>

            {/* Tabela de Onde Mais Gastou */}
            <Card className="bg-white border-2 border-gray-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-gray-200">
                    <CardTitle className="text-xl font-bold text-gray-900">Onde Mais Gastei (Top 10)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {topExpenses.length > 0 ? (
                        <div className="rounded-md border-2 border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50">
                                        <TableHead className="text-gray-900 font-bold">#</TableHead>
                                        <TableHead className="text-gray-900 font-bold">Descrição</TableHead>
                                        <TableHead className="text-gray-900 font-bold">Categoria</TableHead>
                                        <TableHead className="text-center text-gray-900 font-bold">Vezes</TableHead>
                                        <TableHead className="text-right text-gray-900 font-bold">Total Gasto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topExpenses.map((expense, index) => (
                                        <TableRow key={index} className="hover:bg-red-50 border-b border-gray-200">
                                            <TableCell className="font-bold text-gray-600 text-lg">{index + 1}</TableCell>
                                            <TableCell className="font-semibold text-gray-900">
                                                {expense.description}
                                            </TableCell>
                                            <TableCell className="text-gray-700 font-medium">
                                                {expense.categoryName || '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-gray-700 font-medium">{expense.count}x</TableCell>
                                            <TableCell className="text-right font-bold text-red-600 text-xl">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">Nenhum gasto encontrado</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
