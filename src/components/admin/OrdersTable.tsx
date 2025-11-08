'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Eye, MoreVertical, Download, Mail, Edit, Plus, Copy, ExternalLink, FileText } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import EditOrderItemProductDialog from './EditOrderItemProductDialog'
import CreateCustomProductDialog from './CreateCustomProductDialog'
import { useAdminOrders } from '@/hooks/useAdminData'

interface Order {
    id: string
    email: string
    user: string
    status: string
    total: string
    currency: string
    itemsCount: number
    createdAt: string
    paymentProvider: string | null
}

interface OrderItem {
    id: string
    productName: string
    variationName: string | null
    productId: string
    variationId: string | null
    quantity: number
    price: string
    total: string
    files?: Array<{
        id: string
        path: string
        originalName: string
    }>
}

interface OrderDetail {
    id: string
    email: string
    status: string
    total: string
    currency: string
    totalBRL?: number
    exchangeRate?: number
    subtotal: string
    discountAmount: string
    paymentProvider: string | null
    paymentId: string | null
    paymentStatus: string | null
    couponCode: string | null
    paidAt: Date | null
    createdAt: string
    user: {
        name: string
    } | null
    items: OrderItem[]
    pdfs?: Array<{
        id: string
        name: string
        downloadedAt: Date
        path: string
        productId: string | null
        variationId: string | null
    }>
}

interface OrdersTableProps {
    search: string
    statusFilter: string
    onRefresh: () => void
}

export default function OrdersTable({ search, statusFilter, onRefresh }: OrdersTableProps) {
    // ✅ React Query - Cache persistente
    const { data, isLoading: loading } = useAdminOrders(statusFilter === 'all' ? undefined : statusFilter)
    
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
    const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null)
    const [itemImages, setItemImages] = useState<Record<string, string>>({})
    const [itemAttributes, setItemAttributes] = useState<Record<string, Array<{ name: string, value: string }>>>({})

    // Estados para os novos dialogs
    const [editProductDialog, setEditProductDialog] = useState<{ open: boolean; itemId: string; productName: string } | null>(null)
    const [createCustomDialog, setCreateCustomDialog] = useState(false)
    const [resendingEmail, setResendingEmail] = useState(false)

    const { showToast } = useToast()
    
    // Dados de orders vindo do React Query (memoizado)
    const orders = useMemo(() => data?.orders || [], [data?.orders])

    // Função auxiliar para obter símbolo da moeda
    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
            USD: '$',
            EUR: '€',
            BRL: 'R$'
        }
        return symbols[currency] || 'R$'
    }

    // Função para buscar imagem da variação
    const fetchItemImage = useCallback(async (productId: string, variationId: string | null) => {
        try {
            const key = variationId || productId
            const response = await fetch(`/api/products/${productId}/image?variationId=${variationId || ''}`)
            if (response.ok) {
                const data = await response.json()
                if (data.imageUrl) {
                    setItemImages(prev => ({ ...prev, [key]: data.imageUrl }))
                }
            }
        } catch (error) {
            console.error('Erro ao buscar imagem:', error)
        }
    }, [])

    // Função para buscar atributos da variação
    const fetchItemAttributes = useCallback(async (variationId: string) => {
        try {
            const response = await fetch(`/api/variations/${variationId}/attributes`)
            if (response.ok) {
                const data = await response.json()
                setItemAttributes(prev => ({ ...prev, [variationId]: data.attributes || [] }))
            }
        } catch (error) {
            console.error('Erro ao buscar atributos:', error)
        }
    }, [])

    // Função para fazer download do PDF
    const handleDownloadPDF = async (pdfPath: string) => {
        try {
            window.open(`/api/admin/download-file?path=${encodeURIComponent(pdfPath)}`, '_blank')
        } catch (error) {
            console.error('Erro ao baixar PDF:', error)
        }
    }

    // Função para copiar link de download
    const handleCopyDownloadLink = async (pdfPath: string) => {
        try {
            const url = `${window.location.origin}/api/admin/download-file?path=${encodeURIComponent(pdfPath)}`
            await navigator.clipboard.writeText(url)
            showToast('Link copiado para a área de transferência!', 'success')
        } catch (error) {
            console.error('Erro ao copiar link:', error)
            showToast('Erro ao copiar link', 'error')
        }
    }

    // Função para reenviar email
    const handleResendEmail = async () => {
        if (!selectedOrder) return

        try {
            setResendingEmail(true)
            const response = await fetch(`/api/admin/orders/${selectedOrder}/resend-email`, {
                method: 'POST'
            })

            if (response.ok) {
                showToast('Email reenviado com sucesso!', 'success')
            } else {
                const error = await response.json()
                showToast(error.message || 'Erro ao reenviar email', 'error')
            }
        } catch (error) {
            console.error('Erro ao reenviar email:', error)
            showToast('Erro ao reenviar email', 'error')
        } finally {
            setResendingEmail(false)
        }
    }

    const loadOrderDetails = async (orderId: string) => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`)
            if (response.ok) {
                const data = await response.json()
                setOrderDetails(data)
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error)
        }
    }

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (response.ok) {
                onRefresh() // React Query refetch
                if (selectedOrder === orderId) {
                    loadOrderDetails(orderId)
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error)
        }
    }

    useEffect(() => {
        if (selectedOrder) {
            loadOrderDetails(selectedOrder)
        }
    }, [selectedOrder])

    // Carregar imagens e atributos quando order details mudar
    useEffect(() => {
        if (orderDetails?.items) {
            orderDetails.items.forEach(item => {
                // Buscar imagem
                fetchItemImage(item.productId, item.variationId)
                // Buscar atributos se tiver variação
                if (item.variationId) {
                    fetchItemAttributes(item.variationId)
                }
            })
        }
    }, [orderDetails, fetchItemImage, fetchItemAttributes])

    // Memoizar filtro para evitar recálculos
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchLower = search.toLowerCase()
            return (
                order.id.toLowerCase().includes(searchLower) ||
                order.email.toLowerCase().includes(searchLower) ||
                order.user.toLowerCase().includes(searchLower)
            )
        })
    }, [orders, search])

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
            pending: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
            processing: { variant: 'default', color: 'bg-blue-100 text-blue-800' },
            completed: { variant: 'default', color: 'bg-green-100 text-green-800' },
            cancelled: { variant: 'destructive', color: 'bg-red-100 text-red-800' },
            refunded: { variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
        }

        const config = variants[status] || variants.pending

        const labels: Record<string, string> = {
            pending: 'Pendente',
            processing: 'Processando',
            completed: 'Concluído',
            cancelled: 'Cancelado',
            refunded: 'Reembolsado',
        }

        return (
            <Badge className={config.color}>
                {labels[status] || status}
            </Badge>
        )
    }

    if (loading) {
        return <div className="text-center py-8">Carregando pedidos...</div>
    }

    if (filteredOrders.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">
                    {search ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Itens</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => (
                            <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">
                                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                        #{order.id.slice(0, 8)}
                                    </code>
                                </td>
                                <td className="py-3 px-4">
                                    <div>
                                        <div className="font-medium text-gray-900">{order.user}</div>
                                        <div className="text-xs text-gray-500">{order.email}</div>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    {getStatusBadge(order.status)}
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#FD9555]">
                                    {order.currency === 'USD' && '$'}
                                    {order.currency === 'EUR' && '€'}
                                    {order.currency === 'BRL' && 'R$'}
                                    {' '}{parseFloat(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4">
                                    <Badge variant="outline">{order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}</Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setSelectedOrder(order.id)}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                Ver Detalhes
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                Marcar como Concluído
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'cancelled')}>
                                                Cancelar Pedido
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Dialog de Detalhes */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle>Detalhes do Pedido #{selectedOrder?.slice(0, 8)}</DialogTitle>
                                <DialogDescription>
                                    Informações completas do pedido
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleResendEmail}
                                    disabled={resendingEmail}
                                    className="flex items-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    {resendingEmail ? 'Enviando...' : 'Reenviar Email'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => setCreateCustomDialog(true)}
                                    className="flex items-center gap-2 bg-[#FD9555] hover:bg-[#FD9555]/90"
                                >
                                    <Plus className="w-4 h-4" />
                                    Produto Personalizado
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {orderDetails && (
                        <div className="space-y-6">
                            {/* Informações Básicas */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Cliente</label>
                                        <p className="text-gray-900">{orderDetails.user?.name || orderDetails.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Email</label>
                                        <p className="text-gray-900">{orderDetails.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Data do Pedido</label>
                                        <p className="text-gray-900">{new Date(orderDetails.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    {orderDetails.paidAt && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Data do Pagamento</label>
                                            <p className="text-gray-900">{new Date(orderDetails.paidAt).toLocaleString('pt-BR')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informações de Pagamento */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações de Pagamento</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Status</label>
                                        <div className="mt-1">
                                            <Select
                                                value={orderDetails.status}
                                                onValueChange={(value) => handleStatusChange(orderDetails.id, value)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pendente</SelectItem>
                                                    <SelectItem value="processing">Processando</SelectItem>
                                                    <SelectItem value="completed">Concluído</SelectItem>
                                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                                    <SelectItem value="refunded">Reembolsado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {orderDetails.paymentProvider && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Método de Pagamento</label>
                                            <p className="text-gray-900 capitalize">{orderDetails.paymentProvider}</p>
                                        </div>
                                    )}
                                    {orderDetails.paymentId && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">ID da Transação</label>
                                            <p className="text-gray-900 font-mono text-xs">{orderDetails.paymentId}</p>
                                        </div>
                                    )}
                                    {orderDetails.paymentStatus && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Status do Pagamento</label>
                                            <p className="text-gray-900">{orderDetails.paymentStatus}</p>
                                        </div>
                                    )}
                                    {orderDetails.couponCode && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Cupom Utilizado</label>
                                            <p className="text-gray-900 font-mono">{orderDetails.couponCode}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Moeda</label>
                                        <p className="text-gray-900">
                                            {orderDetails.currency === 'USD' && 'Dólar Americano (USD)'}
                                            {orderDetails.currency === 'EUR' && 'Euro (EUR)'}
                                            {orderDetails.currency === 'BRL' && 'Real Brasileiro (BRL)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Itens do Pedido */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Itens do Pedido</h3>
                                <div className="border rounded-lg">
                                    {orderDetails.items?.map((item: OrderItem) => {
                                        const imageKey = item.variationId || item.productId
                                        const itemImage = itemImages[imageKey]
                                        const attributes = item.variationId ? itemAttributes[item.variationId] : []

                                        return (
                                            <div key={item.id} className="p-4 border-b last:border-b-0">
                                                <div className="flex gap-4">
                                                    {/* Imagem */}
                                                    {itemImage && (
                                                        <div className="flex-shrink-0">
                                                            <Image
                                                                src={itemImage}
                                                                alt={item.productName}
                                                                width={80}
                                                                height={80}
                                                                className="rounded-lg object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Informações */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="font-medium text-gray-900 flex-1">{item.productName}</p>
                                                                    <p className="font-semibold text-[#FD9555] whitespace-nowrap">
                                                                        {getCurrencySymbol(orderDetails.currency)}
                                                                        {parseFloat(item.total).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                {item.variationName && (
                                                                    <p className="text-sm text-gray-600 mt-1">{item.variationName}</p>
                                                                )}

                                                                {/* Quantidade de PDFs */}
                                                                {item.files && item.files.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            <FileText className="w-3 h-3 mr-1" />
                                                                            {item.files.length} PDF{item.files.length > 1 ? 's' : ''}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setEditProductDialog({
                                                                        open: true,
                                                                        itemId: item.id,
                                                                        productName: item.productName
                                                                    })
                                                                }}
                                                                className="flex items-center gap-1 text-xs flex-shrink-0"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                Editar
                                                            </Button>
                                                        </div>

                                                        {/* Atributos em badges */}
                                                        {attributes && attributes.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {attributes.map((attr, attrIdx) => (
                                                                    <Badge key={attrIdx} variant="outline" className="text-xs">
                                                                        {attr.name}: {attr.value}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Links de Download dos PDFs */}
                                                        {item.files && item.files.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                {item.files.map((file) => (
                                                                    <div key={file.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Download className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                                                            <p className="text-xs font-medium text-gray-700 flex-1 truncate">
                                                                                {file.originalName}
                                                                            </p>
                                                                            <div className="flex gap-1 flex-shrink-0">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() => handleCopyDownloadLink(file.path)}
                                                                                    className="h-6 px-2 text-xs"
                                                                                >
                                                                                    <Copy className="w-3 h-3" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() => handleDownloadPDF(file.path)}
                                                                                    className="h-6 px-2 text-xs"
                                                                                >
                                                                                    <Download className="w-3 h-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <code className="text-[10px] font-mono text-gray-500 block truncate">
                                                                            {file.path}
                                                                        </code>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <p className="text-sm text-gray-500 mt-2">
                                                            Qtd: {item.quantity} × {' '}
                                                            {getCurrencySymbol(orderDetails.currency)}
                                                            {parseFloat(item.price).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* PDFs Enviados */}
                            {orderDetails.pdfs && orderDetails.pdfs.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">PDFs Enviados ao Cliente</h3>
                                    <div className="border rounded-lg">
                                        {orderDetails.pdfs.map((pdf) => (
                                            <div key={pdf.id} className="p-4 border-b last:border-b-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900">{pdf.name}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Enviado em: {new Date(pdf.downloadedAt).toLocaleString('pt-BR')}
                                                        </p>

                                                        {/* Link de Download */}
                                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                                <p className="text-xs font-semibold text-gray-700">Link de Download</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <code className="flex-1 text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 overflow-x-auto whitespace-nowrap">
                                                                    {window.location.origin}/api/admin/download-file?path={encodeURIComponent(pdf.path)}
                                                                </code>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleCopyDownloadLink(pdf.path)}
                                                                    className="flex items-center gap-1 flex-shrink-0"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                    Copiar
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-400 font-mono mt-2">Caminho: {pdf.path}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Enviado
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDownloadPDF(pdf.path)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Totais */}
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">
                                        {getCurrencySymbol(orderDetails.currency)}
                                        {parseFloat(orderDetails.subtotal).toFixed(2)}
                                    </span>
                                </div>
                                {parseFloat(orderDetails.discountAmount) > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Desconto</span>
                                        <span className="font-medium">
                                            -{getCurrencySymbol(orderDetails.currency)}
                                            {parseFloat(orderDetails.discountAmount).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-lg font-semibold">Total</span>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-[#FD9555]">
                                            {getCurrencySymbol(orderDetails.currency)}
                                            {parseFloat(orderDetails.total).toFixed(2)}
                                        </p>
                                        {orderDetails.currency !== 'BRL' && orderDetails.totalBRL && (
                                            <p className="text-sm text-gray-500">
                                                ≈ R$ {orderDetails.totalBRL.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de Editar Produto do Item */}
            {editProductDialog && orderDetails && (
                <EditOrderItemProductDialog
                    open={editProductDialog.open}
                    onOpenChange={(open) => !open && setEditProductDialog(null)}
                    orderId={orderDetails.id}
                    orderItemId={editProductDialog.itemId}
                    currentProductName={editProductDialog.productName}
                    onSuccess={() => {
                        loadOrderDetails(orderDetails.id)
                        showToast('Produto atualizado com sucesso!', 'success')
                    }}
                />
            )}

            {/* Dialog de Criar Produto Personalizado */}
            {createCustomDialog && orderDetails && (
                <CreateCustomProductDialog
                    open={createCustomDialog}
                    onOpenChange={setCreateCustomDialog}
                    orderId={orderDetails.id}
                    userEmail={orderDetails.email}
                    onSuccess={() => {
                        loadOrderDetails(orderDetails.id)
                        loadOrders()
                        onRefresh()
                        showToast('Produto personalizado criado e adicionado ao pedido!', 'success')
                    }}
                />
            )}
        </>
    )
}
