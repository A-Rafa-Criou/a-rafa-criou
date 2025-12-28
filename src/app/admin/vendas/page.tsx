'use client'

import { useState } from 'react'
import { TrendingUp, Package, ShoppingCart, DollarSign, RefreshCw, Crown, Award, Medal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useVendasStats } from '@/hooks/useAdminData'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { toZonedTime } from 'date-fns-tz'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts'

// Paleta de cores expandida para melhor distinção visual
const COLORS = [
    '#FED466', // Amarelo
    '#FD9555', // Laranja
    '#F87171', // Vermelho claro
    '#FB923C', // Laranja médio
    '#FBBF24', // Amarelo dourado
    '#F59E0B', // Âmbar
    '#EF4444', // Vermelho
    '#DC2626', // Vermelho escuro
    '#FCA5A5', // Rosa claro
    '#FDBA74', // Pêssego
]

// Timezone de Brasília
const BRAZIL_TZ = 'America/Sao_Paulo';

// Página de estatísticas de vendas
export default function VendasPage() {
    // Estado do filtro de data - default: MÊS ATUAL no horário de Brasília
    const nowBrasilia = toZonedTime(new Date(), BRAZIL_TZ);
    const firstDayOfMonth = new Date(nowBrasilia.getFullYear(), nowBrasilia.getMonth(), 1);
    const todayDate = new Date(nowBrasilia.getFullYear(), nowBrasilia.getMonth(), nowBrasilia.getDate());

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: firstDayOfMonth,
        to: todayDate,
    })

    const [productType, setProductType] = useState<'paid' | 'free'>('paid')

    const { data: stats, isLoading, error, refetch, isFetching } = useVendasStats({
        startDate: dateRange?.from ? toZonedTime(dateRange.from, BRAZIL_TZ) : undefined,
        endDate: dateRange?.to ? (() => {
            const endDate = toZonedTime(dateRange.to, BRAZIL_TZ);
            endDate.setHours(23, 59, 59, 999);
            return endDate;
        })() : undefined,
        type: productType,
    })

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border-l-4">
                            <CardContent className="p-6">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 mb-4">Erro ao carregar estatísticas de vendas</p>
                <Button onClick={() => refetch()}>Tentar Novamente</Button>
            </div>
        )
    }

    const { topProducts, generalStats } = stats

    // Formatar dados para gráficos
    const pieChartData = topProducts.slice(0, 10).map((product, index) => ({
        name: product.productName.length > 25
            ? product.productName.substring(0, 25) + '...'
            : product.productName,
        value: product.totalQuantity,
        fullName: product.productName,
        color: COLORS[index % COLORS.length],
    }))

    // Top 10 produtos para o gráfico de barras
    const barChartData = topProducts.slice(0, 10).map((product) => ({
        name: product.productName.length > 40
            ? product.productName.substring(0, 40) + '...'
            : product.productName,
        quantidade: product.totalQuantity,
        fullName: product.productName,
    }))

    // Formatar moeda BRL
    const formatCurrency = (value: string | number) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(numValue)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-lg">
                        <TrendingUp className="w-6 h-6 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Estatísticas de Vendas</h1>
                        <p className="text-sm text-gray-500">Análise completa de produtos vendidos</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={productType} onValueChange={(value: 'paid' | 'free') => setProductType(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de produto" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paid">💰 Produtos Pagos</SelectItem>
                            <SelectItem value="free">🎁 Produtos Gratuitos</SelectItem>
                        </SelectContent>
                    </Select>

                    <DateRangePicker
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                    />

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Atualizar dados"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Cards de Estatísticas Gerais */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total de Unidades Vendidas
                        </CardTitle>
                        <Package className="w-4 h-4 text-[#FD9555]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {generalStats.totalUnitsSold.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {generalStats.totalProducts} produtos diferentes
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-[#FCA652] bg-gradient-to-br from-[#FCA652]/5 to-transparent">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total de Pedidos
                            </CardTitle>
                            <ShoppingCart className="w-4 h-4 text-[#FD9555]" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {generalStats.totalOrders.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Pedidos completados
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-[#FED466] bg-gradient-to-br from-[#FED466]/5 to-transparent">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Produtos Diferentes
                            </CardTitle>
                            <TrendingUp className="w-4 h-4 text-[#FD9555]" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {generalStats.totalProducts.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Variedade de itens vendidos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top 3 Produtos Mais Vendidos - Pódio */}
            {topProducts.length >= 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#FD9555]" />
                            Top 3 Produtos Mais Vendidos
                        </CardTitle>
                        <CardDescription>
                            Os produtos {productType === 'paid' ? 'pagos' : 'gratuitos'} com melhor desempenho
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* 1º Lugar */}
                            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#FED466]/20 to-transparent border-l-4 border-[#FED466] rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-[#FED466] flex items-center justify-center shadow-md">
                                        <Crown className="w-6 h-6 text-gray-900" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl font-bold text-gray-900">1º</span>
                                        <span className="px-2 py-0.5 bg-[#FED466] text-gray-900 text-xs font-bold rounded-full">
                                            CAMPEÃO
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-base mb-2">
                                        {topProducts[0].productName}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Package className="w-4 h-4 text-[#FD9555]" />
                                            <span className="text-gray-600">Vendidos:</span>
                                            <span className="font-bold text-gray-900">{topProducts[0].totalQuantity}</span>
                                        </div>
                                        {productType === 'paid' && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4 text-[#FD9555]" />
                                                <span className="text-gray-600">Receita:</span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(topProducts[0].totalRevenue)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2º Lugar */}
                            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#FD9555]/15 to-transparent border-l-4 border-[#FD9555] rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-[#FD9555] flex items-center justify-center shadow-md">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl font-bold text-gray-900">2º</span>
                                        <span className="px-2 py-0.5 bg-[#FD9555] text-white text-xs font-bold rounded-full">
                                            DESTAQUE
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-base mb-2">
                                        {topProducts[1].productName}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Package className="w-4 h-4 text-[#FD9555]" />
                                            <span className="text-gray-600">Vendidos:</span>
                                            <span className="font-bold text-gray-900">{topProducts[1].totalQuantity}</span>
                                        </div>
                                        {productType === 'paid' && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4 text-[#FD9555]" />
                                                <span className="text-gray-600">Receita:</span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(topProducts[1].totalRevenue)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3º Lugar */}
                            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#FB923C]/15 to-transparent border-l-4 border-[#FB923C] rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-[#FB923C] flex items-center justify-center shadow-md">
                                        <Medal className="w-6 h-6 text-gray-900" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl font-bold text-gray-900">3º</span>
                                        <span className="px-2 py-0.5 bg-[#FB923C] text-gray-900 text-xs font-bold rounded-full shadow-md">
                                            TOP 3
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-base mb-2">
                                        {topProducts[2].productName}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Package className="w-4 h-4 text-[#FD9555]" />
                                            <span className="text-gray-600">Vendidos:</span>
                                            <span className="font-bold text-gray-900">{topProducts[2].totalQuantity}</span>
                                        </div>
                                        {productType === 'paid' && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4 text-[#FD9555]" />
                                                <span className="text-gray-600">Receita:</span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(topProducts[2].totalRevenue)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Gráfico de Pizza - Top 10 Produtos */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
                    <CardDescription>Distribuição por quantidade vendida</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(props) => {
                                    const { percent } = props as { percent?: number }
                                    if (!percent || percent < 0.05) return ''
                                    return `${(percent * 100).toFixed(0)}%`
                                }}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieChartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value?: number | string, _name?: string, props?: { payload?: { fullName?: string } }) => {
                                    if (!value) return ['', '']
                                    return [
                                        `${value} unidades`,
                                        props?.payload?.fullName || '',
                                    ]
                                }}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend
                                verticalAlign="middle"
                                align="right"
                                layout="vertical"
                                iconType="circle"
                                formatter={(value) => {
                                    const fullName = value || ''
                                    return (
                                        <span className="text-xs" title={fullName}>
                                            {fullName.length > 30 ? fullName.substring(0, 30) + '...' : fullName}
                                        </span>
                                    )
                                }}
                                wrapperStyle={{
                                    paddingLeft: '20px',
                                    maxWidth: '250px',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráfico de Barras - Top 10 Produtos por Quantidade */}
            <Card>
                <CardHeader>
                    <CardTitle>Quantidade de Vendas por Produto</CardTitle>
                    <CardDescription>Volume de unidades vendidas por produto (Top 10)</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" stroke="#888" fontSize={12} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#888"
                                fontSize={11}
                                width={250}
                                tick={{ fill: '#374151' }}
                            />
                            <Tooltip
                                formatter={(value?: number | string, _name?: string, props?: { payload?: { fullName?: string } }) => {
                                    if (!value) return ['', '']
                                    return [
                                        `${value} unidades`,
                                        props?.payload?.fullName || '',
                                    ]
                                }}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                }}
                            />
                            <Bar
                                dataKey="quantidade"
                                name="Quantidade"
                                radius={[0, 8, 8, 0]}
                            >
                                {barChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Tabela de Produtos Mais Vendidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento dos Produtos Mais Vendidos</CardTitle>
                    <CardDescription>
                        Lista completa de produtos ordenados por quantidade vendida
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Produto
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Qtd. Vendida
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Receita Total
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Nº Pedidos
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        Ticket Médio
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {topProducts.map((product, index) => {
                                    // Renderizar medalha para top 3
                                    const getMedalIcon = () => {
                                        if (index === 0) return <Crown className="w-4 h-4 text-[#FFD700]" />
                                        if (index === 1) return <Award className="w-4 h-4 text-[#C0C0C0]" />
                                        if (index === 2) return <Medal className="w-4 h-4 text-[#CD7F32]" />
                                        return null
                                    }

                                    return (
                                        <tr
                                            key={`${product.productId}-${product.productName}-${index}`}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {getMedalIcon()}
                                                    <span>{index + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {product.productName}
                                                    </span>
                                                    {product.currentProductName &&
                                                        product.currentProductName !== product.productName && (
                                                            <span className="text-xs text-gray-500 mt-1">
                                                                Atual: {product.currentProductName}
                                                            </span>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#FED466]/20 text-gray-900">
                                                    {product.totalQuantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                {formatCurrency(product.totalRevenue)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                                                {product.orderCount}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                                                {formatCurrency(product.averageOrderValue)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {topProducts.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>Nenhuma venda registrada ainda</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
