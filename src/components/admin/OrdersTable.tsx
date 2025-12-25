'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Eye, MoreVertical, Download, Mail, Edit, Plus, Copy, ExternalLink, FileText, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import EditOrderItemProductDialog from './EditOrderItemProductDialog'
import CreateCustomProductDialog from './CreateCustomProductDialog'
import { useAdminOrders } from '@/hooks/useAdminData'

interface Order {
    id: string
    email: string
    user: string
    phone: string | null
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
    accessDays: number | null
    createdAt: string
    user: {
        name: string
        phone?: string | null
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
    data?: {
        orders: Order[]
        stats: {
            total: number
            totalRevenue: number
            pending: number
            completed: number
            cancelled: number
            freeOrders: number
        }
    }
    loading?: boolean
}

export default function OrdersTable({ search, statusFilter, onRefresh, data: propsData, loading: propsLoading }: OrdersTableProps) {
    // ✅ Usar dados do pai se fornecidos, caso contrário buscar diretamente
    const { data: fetchedData, isLoading: fetchedLoading } = useAdminOrders(
        statusFilter === 'all' ? undefined : statusFilter,
        false
    )

    const data = propsData || fetchedData
    const loading = propsLoading !== undefined ? propsLoading : fetchedLoading

    const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
    const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null)
    const [itemImages, setItemImages] = useState<Record<string, string>>({})
    const [itemAttributes, setItemAttributes] = useState<Record<string, Array<{ name: string, value: string }>>>({})

    // Estados para os novos dialogs
    const [editProductDialog, setEditProductDialog] = useState<{ open: boolean; itemId: string; productName: string } | null>(null)
    const [createCustomDialog, setCreateCustomDialog] = useState(false)
    const [resendingEmail, setResendingEmail] = useState(false)

    // Estados para deletar pedido
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orderId: string; orderEmail: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Estados para editar dias de acesso
    const [accessDaysDialog, setAccessDaysDialog] = useState<{ open: boolean; orderId: string; currentDays: number | null } | null>(null)
    const [newAccessDays, setNewAccessDays] = useState<number>(30)
    const [isUpdatingAccessDays, setIsUpdatingAccessDays] = useState(false)

    // Paginação
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const { showToast } = useToast()

    // Dados de orders vindo do React Query (memoizado)
    const orders = useMemo(() => data?.orders || [], [data?.orders])

    // Função auxiliar para obter símbolo da moeda
    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
            USD: '$',
            EUR: '€',
            BRL: 'R$',
            MXN: 'MX$'
        }
        return symbols[currency] || 'R$'
    }

    // Função auxiliar para formatar telefone para WhatsApp
    const formatPhoneForWhatsApp = (phone: string | null | undefined): string | null => {
        if (!phone) return null

        // Remove todos os caracteres não-numéricos
        const digitsOnly = phone.replace(/\D/g, '')

        // Se não tiver dígitos suficientes, retorna null
        if (!digitsOnly || digitsOnly.length < 10) return null

        // Retorna o número como está, sem assumir código de país
        // O usuário deve cadastrar com código do país completo
        return digitsOnly
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

    const handleDeleteOrder = async () => {
        if (!deleteDialog) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/orders/${deleteDialog.orderId}/delete`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Pedido deletado com sucesso', 'success');
                onRefresh(); // React Query refetch
                setDeleteDialog(null);
            } else {
                showToast(data.message || data.error || 'Não foi possível deletar o pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar pedido:', error);
            showToast('Erro ao deletar o pedido. Tente novamente.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateAccessDays = async () => {
        if (!accessDaysDialog) return;

        setIsUpdatingAccessDays(true);
        try {
            const response = await fetch(`/api/admin/orders/${accessDaysDialog.orderId}/access-days`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessDays: newAccessDays }),
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`Dias de acesso alterados para ${newAccessDays} dias`, 'success');
                onRefresh(); // React Query refetch
                if (selectedOrder === accessDaysDialog.orderId) {
                    loadOrderDetails(accessDaysDialog.orderId);
                }
                setAccessDaysDialog(null);
            } else {
                showToast(data.error || 'Não foi possível atualizar dias de acesso', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar dias de acesso:', error);
            showToast('Erro ao atualizar dias de acesso. Tente novamente.', 'error');
        } finally {
            setIsUpdatingAccessDays(false);
        }
    };

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
        return orders.filter((order: Order) => {
            const searchLower = search.toLowerCase()
            return (
                order.id.toLowerCase().includes(searchLower) ||
                order.email.toLowerCase().includes(searchLower) ||
                order.user.toLowerCase().includes(searchLower)
            )
        })
    }, [orders, search])

    // Calcular pedidos paginados
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return filteredOrders.slice(startIndex, endIndex)
    }, [filteredOrders, currentPage, itemsPerPage])

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

    // Resetar página ao mudar busca ou filtro
    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter])

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
            pending: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
            processing: { variant: 'default', color: 'bg-blue-100 text-blue-800' },
            completed: { variant: 'default', color: 'bg-green-100 text-green-800' },
            cancelled: { variant: 'destructive', color: 'bg-red-100 text-red-800' },
            refunded: { variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
            paid: { variant: 'default', color: 'bg-green-100 text-green-800' },
        }

        const config = variants[status] || variants.pending

        const labels: Record<string, string> = {
            pending: 'Pendente',
            processing: 'Processando',
            completed: 'Concluído',
            cancelled: 'Cancelado',
            refunded: 'Reembolsado',
            paid: 'Pago',
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
            <div>
                <table className="w-full">
                    <thead className="bg-white">
                        <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">WhatsApp</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Itens</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrders.map((order: Order) => (
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
                                    {order.phone && formatPhoneForWhatsApp(order.phone) ? (
                                        <a
                                            href={`https://wa.me/${formatPhoneForWhatsApp(order.phone)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                            title={`WhatsApp: ${order.phone}`}
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            <span>{order.phone}</span>
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Não cadastrado</span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    {getStatusBadge(order.status)}
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#FD9555]">
                                    {parseFloat(order.total) === 0 ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                            Gratuito
                                        </Badge>
                                    ) : (
                                        <>
                                            {order.currency === 'USD' && '$'}
                                            {order.currency === 'EUR' && '€'}
                                            {order.currency === 'BRL' && 'R$'}
                                            {order.currency === 'MXN' && 'MX$'}
                                            {' '}{parseFloat(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    {parseFloat(order.total) === 0 ? (
                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                            {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'} (Gratuito)
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">{order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}</Badge>
                                    )}
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
                                            {order.status === 'paid' && (
                                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                    Converter para Concluído
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                Marcar como Concluído
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'cancelled')}>
                                                Cancelar Pedido
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Gerenciar Acesso</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setAccessDaysDialog({
                                                        open: true,
                                                        orderId: order.id,
                                                        currentDays: null, // será carregado depois
                                                    });
                                                    setNewAccessDays(30);
                                                }}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Alterar Dias de Acesso
                                            </DropdownMenuItem>

                                            {/* Botão de deletar - apenas para pendente, cancelado e processando */}
                                            {(['pending', 'cancelled', 'processing'].includes(order.status)) && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteDialog({
                                                            open: true,
                                                            orderId: order.id,
                                                            orderEmail: order.email
                                                        })}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Deletar Pedido
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {parseFloat(order.total) === 0 && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                                                        className="text-red-600"
                                                    >
                                                        Limpar Pedido Gratuito
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredOrders.length)} de {filteredOrders.length} pedidos
                    </p>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {(() => {
                                const maxVisible = 5;
                                const halfVisible = Math.floor(maxVisible / 2);
                                let startPage = Math.max(1, currentPage - halfVisible);
                                const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                                if (endPage - startPage < maxVisible - 1) {
                                    startPage = Math.max(1, endPage - maxVisible + 1);
                                }

                                const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

                                return pages.map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(page)}
                                            isActive={currentPage === page}
                                            className="cursor-pointer"
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ));
                            })()}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

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
                                    {orderDetails.user?.phone && formatPhoneForWhatsApp(orderDetails.user.phone) && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">WhatsApp</label>
                                            <a
                                                href={`https://wa.me/${formatPhoneForWhatsApp(orderDetails.user.phone)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                <span>{orderDetails.user.phone}</span>
                                            </a>
                                        </div>
                                    )}
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
                                            {orderDetails.currency === 'MXN' && 'Peso Mexicano (MXN)'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700">Dias de Acesso</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-gray-900">
                                                {orderDetails.accessDays || 30} dias
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setAccessDaysDialog({
                                                        open: true,
                                                        orderId: orderDetails.id,
                                                        currentDays: orderDetails.accessDays,
                                                    });
                                                    setNewAccessDays(orderDetails.accessDays || 30);
                                                }}
                                                className="h-7 px-2 text-xs"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Alterar
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Tempo de acesso aos produtos após a compra
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

                                        // 🆕 Para items históricos, extrair atributos do productName
                                        let displayProductName = item.productName
                                        let displayVariationName = item.variationName

                                        // Se não tem productId (item histórico) e nome contém " - ", separar
                                        if (!item.productId && item.productName && item.productName.includes(' - ')) {
                                            const parts = item.productName.split(' - ')
                                            if (parts.length >= 2) {
                                                // Últimas partes geralmente são os atributos
                                                const lastPart = parts[parts.length - 1]
                                                // Se a última parte tem vírgulas, são atributos
                                                if (lastPart.includes(',') || lastPart.match(/^[A-Z][a-zà-ú]+$/)) {
                                                    displayProductName = parts.slice(0, -1).join(' - ')
                                                    displayVariationName = lastPart
                                                }
                                            }
                                        }

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
                                                                    <p className="font-medium text-gray-900 flex-1">{displayProductName || item.productName}</p>
                                                                    <p className="font-semibold text-[#FD9555] whitespace-nowrap">
                                                                        {getCurrencySymbol(orderDetails.currency)}
                                                                        {parseFloat(item.total).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                {displayVariationName && (
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        {displayVariationName}
                                                                        {!item.productId && (
                                                                            <Badge variant="outline" className="ml-2 text-xs">Histórico WP</Badge>
                                                                        )}
                                                                    </p>
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
                        onRefresh()
                        showToast('Produto personalizado criado e adicionado ao pedido!', 'success')
                    }}
                />
            )}

            {/* AlertDialog de Confirmação de Deleção */}
            <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja deletar este pedido?</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground">
                            <p>Esta ação não pode ser desfeita. O pedido será permanentemente removido do banco de dados.</p>
                            {deleteDialog && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm font-medium text-gray-900">Pedido: {deleteDialog.orderId.slice(0, 8)}...</p>
                                    <p className="text-sm text-gray-600">Cliente: {deleteDialog.orderEmail}</p>
                                </div>
                            )}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrder}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? 'Deletando...' : 'Deletar Pedido'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog para Editar Dias de Acesso */}
            <AlertDialog open={accessDaysDialog?.open || false} onOpenChange={(open) => !open && setAccessDaysDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Alterar Dias de Acesso</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground space-y-3">
                            <p>Defina por quantos dias o cliente terá acesso aos produtos deste pedido.</p>
                            <div className="mt-4">
                                <Label htmlFor="newAccessDays">Número de Dias</Label>
                                <Input
                                    id="newAccessDays"
                                    type="number"
                                    min="1"
                                    max="3650"
                                    value={newAccessDays}
                                    onChange={(e) => setNewAccessDays(parseInt(e.target.value) || 30)}
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Mínimo: 1 dia | Máximo: 3650 dias (10 anos)
                                </p>
                            </div>
                            {accessDaysDialog?.currentDays !== null && accessDaysDialog?.currentDays !== undefined && (
                                <div className="p-3 bg-blue-50 rounded-md">
                                    <p className="text-sm text-blue-800">
                                        Dias de acesso atuais: <strong>{accessDaysDialog.currentDays || 'Usando padrão (30 dias)'}</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpdatingAccessDays}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUpdateAccessDays}
                            disabled={isUpdatingAccessDays}
                            className="bg-[#FD9555] hover:bg-[#FD9555]/90"
                        >
                            {isUpdatingAccessDays ? 'Salvando...' : 'Salvar Alterações'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
