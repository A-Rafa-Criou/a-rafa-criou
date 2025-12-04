'use client'

import { useState } from 'react'
import {
    ShoppingCart,
    Search,
    DollarSign,
    CheckCircle,
    Clock
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import OrdersTable from './OrdersTable'
import { useAdminOrders } from '@/hooks/useAdminData'

export default function OrdersPageClient() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // ✅ React Query - Cache persistente de 2 minutos
    const { data, isLoading: loading, refetch } = useAdminOrders(statusFilter === 'all' ? undefined : statusFilter)

    const stats = data?.stats || {
        total: 0,
        totalRevenue: 0,
        pending: 0,
        completed: 0,
        cancelled: 0
    }

    const handleRefresh = () => {
        refetch()
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border-l-4">
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-xl shadow-sm">
                    <ShoppingCart className="w-7 h-7 text-gray-800" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
                    <p className="text-gray-600 mt-1">Gerencie todos os pedidos da loja</p>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <ShoppingCart className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#FD9555]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    R$ {parseFloat(String(stats.totalRevenue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full">
                                <DollarSign className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                        {stats.receitaDetalhada && stats.receitaDetalhada.length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-1">
                                {stats.receitaDetalhada.map((item: { currency: string; amount: number; amountBRL: number }, index: number) => (
                                    <div key={index} className="flex justify-between text-xs text-gray-600">
                                        <span className="font-medium">
                                            {item.currency === 'USD' && '$'}
                                            {item.currency === 'EUR' && '€'}
                                            {item.currency === 'BRL' && 'R$'}
                                            {item.currency === 'MXN' && 'MX$'}
                                            {' '}{item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        {item.currency !== 'BRL' && (
                                            <span className="text-gray-500">
                                                ≈ R$ {item.amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-full">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Pedidos */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Lista de Pedidos
                                <Badge variant="outline" className="ml-2">{stats.total}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Visualize e gerencie todos os pedidos
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Pesquisar por ID, email ou nome..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filtrar status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="processing">Processando</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                                <SelectItem value="refunded">Reembolsado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pb-2">
                    <OrdersTable
                        search={search}
                        statusFilter={statusFilter}
                        onRefresh={handleRefresh}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
