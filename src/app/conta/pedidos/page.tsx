'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle, Package } from 'lucide-react';

interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    items: OrderItem[];
    itemCount: number;
}

export default function PedidosPage() {
    const { status } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('todos');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/orders/my-orders', {
                cache: 'no-store' // Força buscar dados atualizados
            });

            if (!response.ok) {
                throw new Error(t('orders.errorLoading'));
            }

            const data = await response.json();
            setOrders(data.orders || []);
            setLastUpdate(new Date());
        } catch {
            setError(t('orders.errorLoading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login?callbackUrl=/conta/pedidos');
            return;
        }

        if (status === 'authenticated') {
            fetchOrders();
        }
    }, [status, router, fetchOrders]);

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, {
            label: string;
            variant: 'default' | 'secondary' | 'destructive' | 'outline';
            icon: React.ReactNode;
            bgColor: string;
        }> = {
            completed: {
                label: t('orders.status.completed'),
                variant: 'default',
                icon: <CheckCircle className="w-4 h-4 mr-1" />,
                bgColor: 'bg-green-50 border-green-200 text-green-800'
            },
            pending: {
                label: t('orders.status.pending'),
                variant: 'secondary',
                icon: <Clock className="w-4 h-4 mr-1" />,
                bgColor: 'bg-yellow-50 border-yellow-200 text-yellow-800'
            },
            cancelled: {
                label: t('orders.status.cancelled'),
                variant: 'destructive',
                icon: <XCircle className="w-4 h-4 mr-1" />,
                bgColor: 'bg-red-50 border-red-200 text-red-800'
            },
            processing: {
                label: t('orders.status.processing'),
                variant: 'outline',
                icon: <Package className="w-4 h-4 mr-1" />,
                bgColor: 'bg-blue-50 border-blue-200 text-blue-800'
            },
            refunded: {
                label: t('orders.status.refunded'),
                variant: 'outline',
                icon: <XCircle className="w-4 h-4 mr-1" />,
                bgColor: 'bg-gray-50 border-gray-200 text-gray-800'
            },
        };

        const statusInfo = statusMap[status] || {
            label: status,
            variant: 'outline' as const,
            icon: <Package className="w-4 h-4 mr-1" />,
            bgColor: 'bg-gray-50 border-gray-200 text-gray-800'
        };

        return (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${statusInfo.bgColor} font-semibold text-sm`}>
                {statusInfo.icon}
                {statusInfo.label}
            </div>
        );
    };

    const filterOrders = (filterStatus: string) => {
        if (filterStatus === 'todos') return orders;
        return orders.filter(order => order.status === filterStatus);
    };

    const getOrderCount = (filterStatus: string) => {
        if (filterStatus === 'todos') return orders.length;
        return orders.filter(order => order.status === filterStatus).length;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    if (status === 'loading' || loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">{t('orders.myOrders')}</h1>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800">{t('orders.error')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-700">{error}</p>
                        <Button onClick={fetchOrders} className="mt-4" variant="outline">
                            {t('orders.tryAgain')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('orders.myOrders')}</h1>
                        <p className="text-sm sm:text-base text-gray-600">
                            {t('orders.manageOrders')}
                        </p>
                        {lastUpdate && (
                            <p className="text-xs text-gray-400 mt-1">
                                {t('orders.lastUpdate', { time: lastUpdate.toLocaleTimeString() })}
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={fetchOrders}
                        variant="outline"
                        disabled={loading}
                        className="flex items-center gap-2 w-full sm:w-auto"
                    >
                        <Package className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? t('orders.updating') : t('orders.update')}
                    </Button>
                </div>

                {orders.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('orders.noOrdersFound')}</CardTitle>
                            <CardDescription>
                                {t('orders.noOrdersYet')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/#produtos">
                                <Button className="bg-[#FED466] text-black hover:bg-[#FED466]/90">
                                    {t('orders.exploreProducts')}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="mb-6 overflow-x-auto scrollbar-hide -mx-3 sm:-mx-4 px-3 sm:px-4">
                            <TabsList className="inline-flex min-w-full w-auto">
                                <TabsTrigger value="todos" className="flex items-center gap-2 whitespace-nowrap">
                                    <Package className="w-4 h-4" />
                                    {t('orders.all')}
                                    <Badge variant="secondary" className="ml-1">{getOrderCount('todos')}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="flex items-center gap-2 whitespace-nowrap">
                                    <CheckCircle className="w-4 h-4" />
                                    {t('orders.completed')}
                                    <Badge variant="secondary" className="ml-1">{getOrderCount('completed')}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="pending" className="flex items-center gap-2 whitespace-nowrap">
                                    <Clock className="w-4 h-4" />
                                    {t('orders.pending')}
                                    <Badge variant="secondary" className="ml-1">{getOrderCount('pending')}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="processing" className="flex items-center gap-2 whitespace-nowrap">
                                    <Package className="w-4 h-4" />
                                    {t('orders.processing')}
                                    <Badge variant="secondary" className="ml-1">{getOrderCount('processing')}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="cancelled" className="flex items-center gap-2 whitespace-nowrap">
                                    <XCircle className="w-4 h-4" />
                                    {t('orders.cancelled')}
                                    <Badge variant="secondary" className="ml-1">{getOrderCount('cancelled')}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="todos" className="space-y-4">
                            {filterOrders('todos').map((order) => (
                                <OrderCard key={order.id} order={order} getStatusBadge={getStatusBadge} formatDate={formatDate} formatPrice={formatPrice} t={t} />
                            ))}
                        </TabsContent>

                        <TabsContent value="completed" className="space-y-4">
                            {filterOrders('completed').length > 0 ? (
                                filterOrders('completed').map((order) => (
                                    <OrderCard key={order.id} order={order} getStatusBadge={getStatusBadge} formatDate={formatDate} formatPrice={formatPrice} t={t} />
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="py-8 text-center text-gray-500">
                                        {t('orders.noCompletedOrders')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="pending" className="space-y-4">
                            {filterOrders('pending').length > 0 ? (
                                filterOrders('pending').map((order) => (
                                    <OrderCard key={order.id} order={order} getStatusBadge={getStatusBadge} formatDate={formatDate} formatPrice={formatPrice} t={t} />
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="py-8 text-center text-gray-500">
                                        {t('orders.noPendingOrders')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="processing" className="space-y-4">
                            {filterOrders('processing').length > 0 ? (
                                filterOrders('processing').map((order) => (
                                    <OrderCard key={order.id} order={order} getStatusBadge={getStatusBadge} formatDate={formatDate} formatPrice={formatPrice} t={t} />
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="py-8 text-center text-gray-500">
                                        {t('orders.noProcessingOrders')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="cancelled" className="space-y-4">
                            {filterOrders('cancelled').length > 0 ? (
                                filterOrders('cancelled').map((order) => (
                                    <OrderCard key={order.id} order={order} getStatusBadge={getStatusBadge} formatDate={formatDate} formatPrice={formatPrice} t={t} />
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="py-8 text-center text-gray-500">
                                        {t('orders.noCancelledOrders')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}

// Componente para renderizar cada card de pedido
function OrderCard({
    order,
    getStatusBadge,
    formatDate,
    formatPrice,
    t
}: {
    order: Order;
    getStatusBadge: (status: string) => React.ReactNode;
    formatDate: (date: string) => string;
    formatPrice: (price: number) => string;
    t: (key: string, options?: Record<string, unknown>) => string;
}) {
    return (
        <Card className="hover:shadow-lg transition-shadow bg-white">
            <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                            <CardTitle className="text-base sm:text-lg">
                                {t('orders.orderNumber', { id: order.id.slice(0, 8) + '...' })}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                                {formatDate(order.createdAt)}
                            </CardDescription>
                        </div>
                        <div className="flex items-start justify-start sm:justify-end">
                            {getStatusBadge(order.status)}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600">
                            {t(order.itemCount === 1 ? 'orders.items_one' : 'orders.items_other', { count: order.itemCount })}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#FD9555]">
                            {formatPrice(order.total)}
                        </span>
                    </div>

                    {order.items.length > 0 && (
                        <div className="border-t pt-3 sm:pt-4">
                            <p className="text-xs sm:text-sm font-semibold mb-2">{t('orders.products')}</p>
                            <ul className="space-y-1">
                                {order.items.slice(0, 3).map((item) => (
                                    <li key={item.id} className="text-xs sm:text-sm text-gray-600">
                                        • {item.name} {item.quantity > 1 && `(${item.quantity}x)`}
                                    </li>
                                ))}
                                {order.items.length > 3 && (
                                    <li className="text-xs sm:text-sm text-gray-500 italic">
                                        {t(order.items.length - 3 === 1 ? 'orders.moreItems_one' : 'orders.moreItems_other', { count: order.items.length - 3 })}
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Botões de ação baseados no status - PRIORIDADE NO MOBILE */}
                    {order.status === 'pending' ? (
                        <div className="space-y-3 pt-2">
                            <Link href={`/conta/pedidos/${order.id}`} className="block w-full">
                                <Button
                                    size="lg"
                                    className="w-full h-12 bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-bold text-base shadow-md"
                                >
                                    📋 Ver Detalhes
                                </Button>
                            </Link>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-xs sm:text-sm text-yellow-800 text-center">
                                    {t('orders.awaitingPayment')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mensagem para pedidos cancelados */}
                            {order.status === 'cancelled' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                    <p className="text-xs sm:text-sm text-red-800">
                                        {t('orders.orderCancelled')}
                                    </p>
                                </div>
                            )}

                            <Link href={`/conta/pedidos/${order.id}`} className="block w-full">
                                <Button
                                    size="lg"
                                    className="w-full h-12 bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold"
                                    disabled={order.status === 'cancelled'}
                                >
                                    {order.status === 'completed' ? t('orders.viewDownloads') : t('orders.viewDetails')}
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}