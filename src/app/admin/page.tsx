'use client'

import { useState } from 'react'
import { Package, Users, ShoppingCart, FileText, TrendingUp, Tag, Percent, CalendarDays, BarChart3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAdminStatsFiltered, FilteredStatsResponse } from '@/hooks/useAdminData'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminDashboard() {
    // Estado do filtro de data - default: mês atual
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    })

    // React Query com filtro de data
    const {
        data: stats,
        isLoading: loading,
        error,
        refetch,
        isFetching
    } = useAdminStatsFiltered({
        startDate: dateRange?.from,
        endDate: dateRange?.to,
    })

    // Fallback se houver erro
    const statsData: FilteredStatsResponse | null = error ? null : stats ?? null

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
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

    if (!statsData) {
        return <div className="text-center py-12 text-gray-600">Erro ao carregar dados</div>
    }

    // Calcular percentual de desconto sobre receita bruta
    const discountPercentage = statsData.receitaBruta > 0
        ? ((statsData.descontoTotal / statsData.receitaBruta) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-6">
            {/* Header com filtro de data */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-lg">
                        <BarChart3 className="w-6 h-6 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-sm text-gray-500">Visão geral do período</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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

            {/* Cards de Receita e Desconto (Principais) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Receita do Período */}
                <Card className="border-l-4 border-l-green-500 lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Receita do Período</p>
                                <p className="text-3xl font-bold text-green-600">
                                    R$ {statsData.receitaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{statsData.pedidosCompletados || statsData.pedidosPeriodo} pedidos completados</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>

                        {/* Breakdown Bruto → Líquido */}
                        {statsData.receitaBruta > 0 && statsData.receitaBruta !== statsData.receitaPeriodo && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Bruto:</span>
                                    <span className="font-medium text-gray-800">
                                        R$ {statsData.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-red-600">Descontos:</span>
                                    <span className="font-medium text-red-600">
                                        - R$ {(statsData.receitaBruta - statsData.receitaPeriodo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-gray-200">
                                    <span className="text-green-600 font-medium">Líquido:</span>
                                    <span className="font-bold text-green-600">
                                        R$ {statsData.receitaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Breakdown por moeda */}
                        {statsData.receitaDetalhada && statsData.receitaDetalhada.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-600 mb-2">Por moeda:</p>
                                <div className="space-y-1.5">
                                    {statsData.receitaDetalhada.map((item) => (
                                        <div key={item.currency} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700">{item.currency}</span>
                                                <span className="text-gray-500">
                                                    {item.currency === 'BRL' ? 'R$' :
                                                        item.currency === 'USD' ? '$' :
                                                            item.currency === 'EUR' ? '€' : item.currency} {' '}
                                                    {item.amount.toLocaleString(
                                                        item.currency === 'BRL' ? 'pt-BR' : 'en-US',
                                                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {item.currency !== 'BRL' && (
                                                    <>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium text-gray-700">
                                                            R$ {item.amountBRL.toLocaleString('pt-BR', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Descontos Aplicados */}
                <Card className="border-l-4 border-l-red-500 lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Descontos Concedidos</p>
                                <p className="text-3xl font-bold text-red-600">
                                    R$ {statsData.descontoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {discountPercentage}% sobre bruto de R$ {statsData.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <Percent className="w-6 h-6 text-red-600" />
                            </div>
                        </div>

                        {/* Detalhamento de cupons */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Cupons usados</p>
                                    <p className="text-lg font-bold text-gray-800">{statsData.totalCuponsUsados}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Valor em cupons</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        R$ {statsData.descontoCupons.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Pedidos c/ cupom</p>
                                    <p className="text-lg font-bold text-gray-800">{statsData.pedidosComCupom}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Cupons Utilizados */}
            {statsData.topCupons && statsData.topCupons.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Tag className="w-5 h-5 text-purple-600" />
                            Cupons Mais Utilizados
                        </CardTitle>
                        <CardDescription>
                            Os cupons que mais geraram descontos no período
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {statsData.topCupons.map((coupon, index) => (
                                <div
                                    key={coupon.code}
                                    className="flex flex-col p-3 border rounded-lg bg-purple-50/50 hover:bg-purple-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-purple-200 text-purple-700">
                                            {index + 1}
                                        </span>
                                        <code className="text-sm font-bold text-purple-700 truncate">{coupon.code}</code>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        <span className="font-medium">{coupon.count}x</span> usado
                                    </div>
                                    <div className="text-sm font-bold text-red-600 mt-1">
                                        -R$ {coupon.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats secundárias */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                                <p className="text-3xl font-bold text-gray-900">{statsData.totalProdutos}</p>
                                <p className="text-xs text-gray-500 mt-1">Produtos ativos</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Clientes Cadastrados</p>
                                <p className="text-3xl font-bold text-gray-900">{statsData.totalClientes.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Total de usuários</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Arquivos no Sistema</p>
                                <p className="text-3xl font-bold text-gray-900">{statsData.arquivosUpload}</p>
                                <p className="text-xs text-gray-500 mt-1">PDFs disponíveis</p>
                            </div>
                            <div className="p-3 bg-indigo-100 rounded-full">
                                <FileText className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pedidos no Período</p>
                                <p className="text-3xl font-bold text-gray-900">{statsData.pedidosPeriodo}</p>
                                <p className="text-xs text-gray-500 mt-1">Todos os status</p>
                            </div>
                            <div className="p-3 bg-teal-100 rounded-full">
                                <ShoppingCart className="w-6 h-6 text-teal-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico diário simplificado */}
            {statsData.dadosDiarios && statsData.dadosDiarios.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                            Receita Diária
                        </CardTitle>
                        <CardDescription>
                            Receita e descontos por dia no período selecionado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left py-2.5 px-3 font-medium text-gray-600">Data</th>
                                        <th className="text-center py-2.5 px-2 font-medium text-gray-600">Pedidos</th>
                                        <th className="text-right py-2.5 px-3 font-medium text-gray-500">Bruto</th>
                                        <th className="text-right py-2.5 px-3 font-medium text-red-500">Desconto</th>
                                        <th className="text-right py-2.5 px-3 font-medium text-green-600">Líquido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsData.dadosDiarios.map((day) => {
                                        const bruto = day.bruto || (day.revenue + day.discount)
                                        return (
                                            <tr key={day.date} className="border-b hover:bg-gray-50">
                                                <td className="py-2 px-3 font-medium text-gray-700">
                                                    {format(new Date(day.date + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                                                </td>
                                                <td className="py-2 px-2 text-center text-gray-600">{day.orders}</td>
                                                <td className="py-2 px-3 text-right text-gray-500">
                                                    R$ {bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-3 text-right text-red-500">
                                                    {day.discount > 0 ? `-R$ ${day.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right text-green-600 font-medium">
                                                    R$ {day.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="py-2.5 px-3">Total</td>
                                        <td className="py-2.5 px-2 text-center">
                                            {statsData.dadosDiarios.reduce((sum, d) => sum + d.orders, 0)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-gray-600">
                                            R$ {statsData.dadosDiarios.reduce((sum, d) => sum + (d.bruto || d.revenue + d.discount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-red-500">
                                            -R$ {statsData.dadosDiarios.reduce((sum, d) => sum + d.discount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-green-600">
                                            R$ {statsData.dadosDiarios.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Pedidos Recentes
                            </CardTitle>
                            <CardDescription>
                                Últimos pedidos no período selecionado
                            </CardDescription>
                        </div>
                        <Link href="/admin/pedidos">
                            <Button variant="outline" size="sm">Ver Todos</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {statsData.recentOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <ShoppingCart className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
                            <p className="text-gray-600">Nenhum pedido no período selecionado</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {statsData.recentOrders.map((order) => (
                                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3 sm:gap-0 hover:border-[#FED466] transition-colors">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{order.customerName}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>Pedido #{order.id.slice(0, 8)}</span>
                                            {order.couponCode && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                                    <Tag className="w-3 h-3" />
                                                    {order.couponCode}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-medium text-gray-900">
                                                {order.currency === 'BRL' ? 'R$' :
                                                    order.currency === 'USD' ? '$' :
                                                        order.currency === 'EUR' ? '€' : order.currency} {' '}
                                                {new Intl.NumberFormat(
                                                    order.currency === 'BRL' ? 'pt-BR' : 'en-US',
                                                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                                                ).format(Number(order.total ?? 0))}
                                                <span className="text-xs text-gray-500 ml-1">({order.currency})</span>
                                            </p>
                                            {order.discount > 0 && (
                                                <p className="text-xs text-red-600">
                                                    Desconto: -R$ {order.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}
                                            {order.currency !== 'BRL' && (
                                                <p className="text-xs text-gray-600">
                                                    ≈ R$ {new Intl.NumberFormat('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }).format(Number(order.totalBRL ?? 0))}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {order.status === 'completed' ? 'Concluído' :
                                                order.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}