'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, ArrowLeft, AlertCircle, CheckCircle2, Clock, FileDown, MessageCircle, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';

interface OrderItem {
    id: string;
    productId: string;
    variationId: string | null;
    name: string;
    quantity: number;
    price: number;
    total: number;
    imageUrl?: string;
    variation?: Record<string, string>;
    files?: Array<{
        id: string;
        name: string;
        originalName: string;
        path: string;
        size: number;
        mimeType: string;
    }>;
}

interface OrderDetails {
    id: string;
    email: string;
    status: string;
    subtotal: number;
    discountAmount?: number | null;
    couponCode?: string | null;
    total: number;
    currency: string;  // ✅ Adicionado campo de moeda
    paymentProvider: string;
    paymentStatus: string;
    createdAt: string;
    paidAt: string | null;
    updatedAt: string | null;
    accessDays: number; // ✅ Dias de acesso
    items: OrderItem[];
}

export default function PedidoDetalhesPage() {
    const { t } = useTranslation('common');
    const { status: sessionStatus } = useSession();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
    const [downloadMessages, setDownloadMessages] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

    const { addItem } = useCart();

    const fetchOrderDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/api/orders/${orderId}`);

            if (response.status === 404) {
                setError('Pedido não encontrado');
                return;
            }

            if (response.status === 403) {
                setError('Você não tem permissão para acessar este pedido');
                return;
            }

            if (!response.ok) {
                throw new Error('Erro ao carregar pedido');
            }

            const data = await response.json();
            setOrder(data);

        } catch (err) {
            console.error('Erro ao buscar pedido:', err);
            setError('Não foi possível carregar o pedido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    // Função para ajuda via WhatsApp
    const handleWhatsAppHelp = () => {
        if (!order) return;

        const whatsappNumber = '5511998274504';
        const message = encodeURIComponent(
            `Olá! Preciso de ajuda com meu pedido:\n\n` +
            `Pedido: ${order.id}\n` +
            `Nome: ${order.email}\n` +
            `Total: ${formatPrice(order.total, order.currency)}\n` +  // ✅ Usando formatPrice com currency
            `Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\n\n` +
            `Aguardo retorno. Obrigado!`
        );

        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    };

    // Função para refazer compra
    const handleRedoOrder = () => {
        if (!order) return;

        // Adicionar todos os itens do pedido ao carrinho
        order.items.forEach((item) => {
            // Converter variação para o formato esperado pelo carrinho
            const attributes: { name: string; value: string }[] = [];
            if (item.variation) {
                Object.entries(item.variation).forEach(([name, value]) => {
                    attributes.push({ name, value });
                });
            }

            const cartItem = {
                id: item.productId,
                productId: item.productId,
                variationId: item.variationId || '',
                name: item.name,
                price: item.price,
                variationName: item.variation ? Object.values(item.variation).join(' / ') : '',
                image: item.imageUrl || '',
                ...(attributes.length > 0 && { attributes }),
            };

            // Adicionar item a quantidade de vezes necessária
            for (let i = 0; i < item.quantity; i++) {
                addItem(cartItem);
            }
        });

        // Redirecionar para o carrinho
        router.push('/carrinho');
    };

    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.push(`/auth/login?callbackUrl=/conta/pedidos/${orderId}`);
            return;
        }

        if (sessionStatus === 'authenticated') {
            fetchOrderDetails();
        }
    }, [sessionStatus, router, orderId, fetchOrderDetails]);

    const handleDownload = async (orderItemId: string) => {
        if (!order) return; // Guard clause

        try {
            // Adicionar ao set de downloads em andamento
            setDownloadingItems((prev) => new Set(prev).add(orderItemId));

            // Limpar mensagem anterior
            setDownloadMessages((prev) => {
                const newMessages = { ...prev };
                delete newMessages[orderItemId];
                return newMessages;
            });

            // ✅ USAR MESMO ENDPOINT QUE /obrigado (sem verificação de userId)
            const params = new URLSearchParams();
            params.set('orderId', order.id);
            params.set('itemId', orderItemId);

            const response = await fetch(`/api/orders/download?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar link de download');
            }

            // Mostrar mensagem de sucesso
            setDownloadMessages((prev) => ({
                ...prev,
                [orderItemId]: {
                    type: 'success',
                    message: 'Link gerado com sucesso! Abrindo em nova aba...',
                },
            }));

            // Abrir download usando a URL assinada
            const downloadUrl = data.downloadUrl || data.signedUrl;
            if (downloadUrl) {
                // Detectar se é mobile (iOS ou Android)
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                if (isMobile) {
                    // Mobile: usar location.href para evitar bloqueio de popup
                    window.location.href = downloadUrl;

                    // Opcional: volta para a página após um delay
                    setTimeout(() => {
                        // Se ainda estiver na mesma página (PDF não carregou), volta
                        if (window.location.href === downloadUrl) {
                            window.history.back();
                        }
                    }, 1000);
                } else {
                    // Desktop/Tablet: abre em nova aba
                    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                }
            } else {
                throw new Error('URL de download não disponível');
            }

            // Limpar mensagem após 10 segundos
            setTimeout(() => {
                setDownloadMessages((prev) => {
                    const newMessages = { ...prev };
                    delete newMessages[orderItemId];
                    return newMessages;
                });
            }, 10000);
        } catch (err: unknown) {
            console.error('Erro ao fazer download:', err);

            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar link de download';

            setDownloadMessages((prev) => ({
                ...prev,
                [orderItemId]: {
                    type: 'error',
                    message: errorMessage,
                },
            }));

            // Limpar mensagem de erro após 10 segundos
            setTimeout(() => {
                setDownloadMessages((prev) => {
                    const newMessages = { ...prev };
                    delete newMessages[orderItemId];
                    return newMessages;
                });
            }, 10000);
        } finally {
            // Remover do set de downloads em andamento
            setDownloadingItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(orderItemId);
                return newSet;
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
            completed: {
                label: t('orders.status.completed'),
                variant: 'default',
                icon: <CheckCircle2 className="w-4 h-4" />
            },
            pending: {
                label: t('orders.status.pending'),
                variant: 'secondary',
                icon: <Clock className="w-4 h-4" />
            },
            cancelled: {
                label: t('orders.status.cancelled'),
                variant: 'destructive',
                icon: <AlertCircle className="w-4 h-4" />
            },
            processing: {
                label: t('orders.status.processing'),
                variant: 'outline',
                icon: <Clock className="w-4 h-4" />
            },
        };

        const statusInfo = statusMap[status] || {
            label: status,
            variant: 'outline' as const,
            icon: <AlertCircle className="w-4 h-4" />
        };

        return (
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                {statusInfo.icon}
                {statusInfo.label}
            </Badge>
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';

        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPrice = (price: number, currency: string = 'BRL') => {
        const symbols: Record<string, string> = {
            'BRL': 'R$',
            'USD': '$',
            'EUR': '€',
            'MXN': 'MEX$'
        }

        const symbol = symbols[currency.toUpperCase()] || 'R$'

        // Formato brasileiro para BRL
        if (currency.toUpperCase() === 'BRL') {
            return `${symbol} ${price.toFixed(2).replace('.', ',')}`
        }

        // Para MXN, usar formato com espaço
        if (currency.toUpperCase() === 'MXN') {
            return `${symbol} ${price.toFixed(2)}`
        }

        // Para USD e EUR
        return `${symbol}${price.toFixed(2)}`
    };

    if (sessionStatus === 'loading' || loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Skeleton className="h-8 w-48 mb-6" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Link href="/conta/pedidos">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('orderDetails.backToOrders')}
                    </Button>
                </Link>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!order) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
                <Link href="/conta/pedidos">
                    <Button variant="ghost" className="mb-3 sm:mb-4 -ml-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('orderDetails.backToOrders')}
                    </Button>
                </Link>

                <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {t('orderDetails.orderNumber', { id: order.id.slice(0, 8) + '...' })}
                        </h1>
                        {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm sm:text-base text-gray-600">
                        {t('orderDetails.orderedOn')} {formatDate(order.createdAt)}
                    </p>
                </div>

                {/* ⚠️ Alerta de Cancelamento */}
                {order.status === 'cancelled' && (
                    <Alert variant="destructive" className="mb-4 sm:mb-6">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <AlertDescription className="text-xs sm:text-sm">
                            <strong>Pedido Cancelado</strong>
                            <p className="mt-2">
                                Este pedido foi cancelado {order.updatedAt ? `em ${formatDate(order.updatedAt)}` : ''}.
                            </p>
                            <p className="mt-2">
                                <strong>Possíveis motivos:</strong>
                            </p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Você cancelou o pedido antes de efetuar o pagamento</li>
                                <li>O pagamento não foi confirmado dentro do prazo</li>
                                <li>Houve um problema com o método de pagamento</li>
                            </ul>
                            <p className="mt-3">
                                Se você deseja adquirir estes produtos novamente, adicione-os ao carrinho e realize um novo pedido.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {/* ✅ Alerta de Sucesso (Pedido Completo) */}
                {order.status === 'completed' && (
                    <Alert className="mb-4 sm:mb-6 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <AlertDescription className="text-green-800 text-xs sm:text-sm">
                            <strong>Pedido Concluído com Sucesso!</strong>
                            <p className="mt-1">
                                Seu pedido foi pago e você já pode fazer o download dos produtos abaixo.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {/* ⏳ Alerta de Pendência com Pix */}
                {order.status === 'pending' && (
                    <>
                        <Alert className="mb-4 sm:mb-6 border-yellow-200 bg-yellow-50">
                            <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <AlertDescription className="text-yellow-800">
                                <strong className="text-sm sm:text-base">Aguardando Pagamento</strong>
                                <p className="mt-1 text-xs sm:text-sm">
                                    Seu pedido foi criado, mas ainda está aguardando a confirmação do pagamento.
                                </p>
                                <p className="mt-2 text-xs sm:text-sm font-semibold">
                                    👇 Precisa de ajuda? Use as opções abaixo
                                </p>
                            </AlertDescription>
                        </Alert>

                        {/* Card de Opções de Ajuda */}
                        <Card className="mb-4 sm:mb-6 shadow-lg border-2 border-[#FED466]">
                            <CardHeader className="pb-3 sm:pb-4">
                                <CardTitle className="text-base sm:text-lg">
                                    💡 Opções de Ajuda
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Precisa de ajuda ou quer refazer a compra?
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {/* Botão WhatsApp */}
                                    <Button
                                        onClick={handleWhatsAppHelp}
                                        size="lg"
                                        className="w-full h-14 sm:h-12 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold text-sm sm:text-base shadow-md flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        <span>Ajuda com Pedido</span>
                                    </Button>

                                    {/* Botão Refazer Compra */}
                                    <Button
                                        onClick={handleRedoOrder}
                                        size="lg"
                                        variant="outline"
                                        className="w-full h-14 sm:h-12 border-2 border-[#FED466] hover:bg-[#FED466]/10 text-gray-900 font-bold text-sm sm:text-base shadow-md flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        <span>Refazer Compra</span>
                                    </Button>
                                </div>

                                {/* Informação adicional */}
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-800">
                                        <strong>💬 Ajuda com Pedido:</strong> Abre o WhatsApp com suas informações do pedido para suporte rápido.
                                    </p>
                                    <p className="text-xs text-blue-800 mt-2">
                                        <strong>🛒 Refazer Compra:</strong> Adiciona os produtos deste pedido ao carrinho para tentar novamente.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Informações do Pedido */}
                <Card className="mb-4 sm:mb-6">
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="text-base sm:text-lg">{t('orderDetails.orderInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('orderDetails.email')}</p>
                                <p className="font-medium text-sm sm:text-base break-all">{order.email}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('orderDetails.paymentMethod')}</p>
                                <p className="font-medium text-sm sm:text-base capitalize">
                                    {order.paymentProvider === 'mercado_pago' ? t('orderDetails.pix') :
                                        order.paymentProvider === 'stripe' ? t('orderDetails.creditCard') :
                                            order.paymentProvider}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('orderDetails.paymentStatus')}</p>
                                <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                                    {order.paymentStatus === 'paid' ? t('orderDetails.paid') : order.paymentStatus}
                                </Badge>
                            </div>
                            {order.paidAt && (
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('orderDetails.paymentDate')}</p>
                                    <p className="font-medium text-sm sm:text-base">{formatDate(order.paidAt)}</p>
                                </div>
                            )}
                            {order.status === 'completed' && (
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Prazo de Acesso</p>
                                    <p className="font-medium text-sm sm:text-base">
                                        {order.accessDays} {order.accessDays === 1 ? 'dia' : 'dias'}
                                        <span className="text-xs text-gray-500 ml-2">
                                            (expira em {formatDate(new Date(new Date(order.paidAt || order.createdAt).getTime() + order.accessDays * 24 * 60 * 60 * 1000).toISOString())})
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Produtos */}
                <Card className="mb-4 sm:mb-6">
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="text-base sm:text-lg">{t('orderDetails.productsOrdered')}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            {order.status === 'completed'
                                ? t('orderDetails.clickToDownload')
                                : t('orderDetails.downloadsAvailableAfterPayment')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className="space-y-3 sm:space-y-4">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white"
                                >
                                    <div className="flex gap-3 sm:gap-4 mb-3">
                                        {/* Imagem do Produto */}
                                        <div className="flex-shrink-0">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 border relative">
                                                {item.imageUrl ? (
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 640px) 80px, 96px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Informações do Produto */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-sm sm:text-lg leading-tight pr-2">{item.name}</h3>
                                                <p className="text-base sm:text-lg font-bold text-[#FD9555] whitespace-nowrap">
                                                    {formatPrice(item.price * item.quantity, order.currency)}
                                                </p>
                                            </div>

                                            {/* Variações em Badges */}
                                            {item.variation && (
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                                                    {Object.entries(item.variation).map(([key, value]) => (
                                                        <Badge
                                                            key={key}
                                                            variant="outline"
                                                            className="text-xs bg-gray-50 border-gray-300"
                                                        >
                                                            <span className="font-medium">{key}:</span>
                                                            <span className="ml-1">{value}</span>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {order.status === 'completed' && (
                                        <>
                                            {(() => {
                                                // Calcular se o download expirou usando accessDays do pedido
                                                const paidDate = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
                                                const now = new Date();
                                                const daysSincePurchase = Math.floor((now.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
                                                const accessDays = order.accessDays || 30;
                                                const isExpired = daysSincePurchase > accessDays;

                                                if (isExpired) {
                                                    return (
                                                        <Button
                                                            disabled
                                                            size="lg"
                                                            className="w-full h-12 bg-gray-400 cursor-not-allowed text-black font-bold text-sm sm:text-base"
                                                        >
                                                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                                            {t('orderDetails.downloadExpired')}
                                                        </Button>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2">
                                                        {item.files && item.files.length > 0 ? (
                                                            <>
                                                                {/* Botão "Baixar Todos" se tiver mais de 1 arquivo */}
                                                                {item.files.length > 1 && (
                                                                    <Button
                                                                        className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-medium cursor-pointer"
                                                                        onClick={async () => {
                                                                            try {
                                                                                setDownloadingItems(prev => new Set(prev).add('all-' + item.id));

                                                                                // Criar ZIP com todos os arquivos
                                                                                const zip = new JSZip();

                                                                                // Baixar todos os arquivos e adicionar ao ZIP
                                                                                for (const file of item.files!) {
                                                                                    const params = new URLSearchParams();
                                                                                    params.set('orderId', order.id);
                                                                                    params.set('itemId', item.id);
                                                                                    params.set('fileId', file.id);

                                                                                    const res = await fetch(`/api/orders/download?${params.toString()}`);
                                                                                    if (!res.ok) continue;

                                                                                    const data = await res.json();
                                                                                    const downloadUrl = data?.downloadUrl || data?.signedUrl;
                                                                                    if (!downloadUrl) continue;

                                                                                    // Baixar o arquivo como blob
                                                                                    const fileResponse = await fetch(downloadUrl);
                                                                                    if (!fileResponse.ok) continue;

                                                                                    const blob = await fileResponse.blob();

                                                                                    // Adicionar ao ZIP
                                                                                    zip.file(file.name, blob);
                                                                                }

                                                                                // Gerar o arquivo ZIP
                                                                                const zipBlob = await zip.generateAsync({ type: 'blob' });

                                                                                // Fazer download do ZIP
                                                                                const zipUrl = URL.createObjectURL(zipBlob);
                                                                                const link = document.createElement('a');
                                                                                link.href = zipUrl;
                                                                                link.download = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_arquivos.zip`;
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                                URL.revokeObjectURL(zipUrl);

                                                                                setDownloadingItems(prev => {
                                                                                    const newSet = new Set(prev);
                                                                                    newSet.delete('all-' + item.id);
                                                                                    return newSet;
                                                                                });
                                                                            } catch (error) {
                                                                                console.error('Erro ao criar ZIP:', error);
                                                                                setDownloadingItems(prev => {
                                                                                    const newSet = new Set(prev);
                                                                                    newSet.delete('all-' + item.id);
                                                                                    return newSet;
                                                                                });
                                                                            }
                                                                        }}
                                                                        disabled={downloadingItems.has('all-' + item.id)}
                                                                    >
                                                                        {downloadingItems.has('all-' + item.id) ? (
                                                                            <>
                                                                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                                                <span>{t('orderDetails.creatingZip')}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <FileDown className="w-4 h-4 mr-2" />
                                                                                <span>{t('orderDetails.downloadAll', { count: item.files!.length })}</span>
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                )}

                                                                {/* Accordion com downloads individuais */}
                                                                {item.files.length > 1 && (
                                                                    <Accordion type="single" collapsible className="w-full">
                                                                        <AccordionItem value="downloads" className="border-none">
                                                                            <AccordionTrigger className="w-full h-10 px-4 py-2 bg-[#FED466] hover:bg-[#FED466]/90 text-black font-medium rounded-md flex items-center justify-center hover:no-underline [&[data-state=open]>svg]:rotate-180 cursor-pointer">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Download className="w-4 h-4 flex-shrink-0" />
                                                                                    <span>{t('orderDetails.downloadIndividually')}</span>
                                                                                </div>
                                                                            </AccordionTrigger>
                                                                            <AccordionContent className="space-y-2 pt-2">
                                                                                {item.files.map((file, fileIndex) => (
                                                                                    <Button
                                                                                        key={file.id}
                                                                                        variant="outline"
                                                                                        className="w-full justify-start hover:bg-[#FED466]/20 hover:border-[#FED466] border-gray-300 transition-all duration-200 cursor-pointer group"
                                                                                        onClick={async () => {
                                                                                            try {
                                                                                                setDownloadingItems(prev => new Set(prev).add(file.id));
                                                                                                const params = new URLSearchParams();
                                                                                                params.set('orderId', order.id);
                                                                                                params.set('itemId', item.id);
                                                                                                params.set('fileId', file.id);

                                                                                                const res = await fetch(`/api/orders/download?${params.toString()}`);
                                                                                                if (!res.ok) {
                                                                                                    setDownloadingItems(prev => {
                                                                                                        const newSet = new Set(prev);
                                                                                                        newSet.delete(file.id);
                                                                                                        return newSet;
                                                                                                    });
                                                                                                    return;
                                                                                                }

                                                                                                const data = await res.json();
                                                                                                const downloadUrl = data?.downloadUrl || data?.signedUrl;
                                                                                                if (!downloadUrl) {
                                                                                                    setDownloadingItems(prev => {
                                                                                                        const newSet = new Set(prev);
                                                                                                        newSet.delete(file.id);
                                                                                                        return newSet;
                                                                                                    });
                                                                                                    return;
                                                                                                }

                                                                                                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                                                                                if (isMobile) {
                                                                                                    const link = document.createElement('a');
                                                                                                    link.href = downloadUrl;
                                                                                                    link.download = file.name || 'download.pdf';
                                                                                                    link.target = '_blank';
                                                                                                    link.rel = 'noopener noreferrer';
                                                                                                    document.body.appendChild(link);
                                                                                                    link.click();
                                                                                                    document.body.removeChild(link);
                                                                                                } else {
                                                                                                    window.open(downloadUrl, '_blank');
                                                                                                }

                                                                                                setDownloadingItems(prev => {
                                                                                                    const newSet = new Set(prev);
                                                                                                    newSet.delete(file.id);
                                                                                                    return newSet;
                                                                                                });
                                                                                            } catch {
                                                                                                setDownloadingItems(prev => {
                                                                                                    const newSet = new Set(prev);
                                                                                                    newSet.delete(file.id);
                                                                                                    return newSet;
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                        disabled={downloadingItems.has(file.id)}
                                                                                    >
                                                                                        {downloadingItems.has(file.id) ? (
                                                                                            <>
                                                                                                <Clock className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                                                                                                <span className="truncate">{t('orderDetails.generating')}</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Download className="w-4 h-4 mr-2 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                                                                                <span className="truncate">
                                                                                                    {t('orderDetails.file', { number: fileIndex + 1 })}: {file.name}
                                                                                                </span>
                                                                                            </>
                                                                                        )}
                                                                                    </Button>
                                                                                ))}
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    </Accordion>
                                                                )}

                                                                {/* Se tiver apenas 1 arquivo, mostrar botão direto */}
                                                                {item.files.length === 1 && (
                                                                    <Button
                                                                        className="w-full bg-[#FED466] hover:bg-[#FED466]/90 text-black font-medium cursor-pointer"
                                                                        onClick={async () => {
                                                                            try {
                                                                                const file = item.files![0];
                                                                                setDownloadingItems(prev => new Set(prev).add(file.id));
                                                                                const params = new URLSearchParams();
                                                                                params.set('orderId', order.id);
                                                                                params.set('itemId', item.id);
                                                                                params.set('fileId', file.id);

                                                                                const res = await fetch(`/api/orders/download?${params.toString()}`);
                                                                                if (!res.ok) {
                                                                                    setDownloadingItems(prev => {
                                                                                        const newSet = new Set(prev);
                                                                                        newSet.delete(file.id);
                                                                                        return newSet;
                                                                                    });
                                                                                    return;
                                                                                }

                                                                                const data = await res.json();
                                                                                const downloadUrl = data?.downloadUrl || data?.signedUrl;
                                                                                if (!downloadUrl) {
                                                                                    setDownloadingItems(prev => {
                                                                                        const newSet = new Set(prev);
                                                                                        newSet.delete(file.id);
                                                                                        return newSet;
                                                                                    });
                                                                                    return;
                                                                                }

                                                                                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                                                                if (isMobile) {
                                                                                    const link = document.createElement('a');
                                                                                    link.href = downloadUrl;
                                                                                    link.download = file.name || 'download.pdf';
                                                                                    link.target = '_blank';
                                                                                    link.rel = 'noopener noreferrer';
                                                                                    document.body.appendChild(link);
                                                                                    link.click();
                                                                                    document.body.removeChild(link);
                                                                                } else {
                                                                                    window.open(downloadUrl, '_blank');
                                                                                }

                                                                                setDownloadingItems(prev => {
                                                                                    const newSet = new Set(prev);
                                                                                    newSet.delete(item.files![0].id);
                                                                                    return newSet;
                                                                                });
                                                                            } catch {
                                                                                setDownloadingItems(prev => {
                                                                                    const newSet = new Set(prev);
                                                                                    newSet.delete(item.files![0].id);
                                                                                    return newSet;
                                                                                });
                                                                            }
                                                                        }}
                                                                        disabled={downloadingItems.has(item.files![0].id)}
                                                                    >
                                                                        {downloadingItems.has(item.files![0].id) ? (
                                                                            <>
                                                                                <Clock className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                                                                                <span className="truncate">{t('orderDetails.generating')}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Download className="w-4 h-4 mr-2 flex-shrink-0" />
                                                                                <span className="truncate">{t('orderDetails.downloadFile', { name: item.files![0].name })}</span>
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleDownload(item.id)}
                                                                disabled={downloadingItems.has(item.id)}
                                                                size="lg"
                                                                className="w-full h-12 bg-[#FED466] hover:bg-[#FED466]/90 text-black font-medium cursor-pointer"
                                                            >
                                                                {downloadingItems.has(item.id) ? (
                                                                    <>
                                                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin flex-shrink-0" />
                                                                        <span className="truncate">{t('orderDetails.generatingLink')}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                                                                        <span className="truncate">{t('orderDetails.download')}</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}

                                                        {downloadMessages[item.id] && (
                                                            <Alert
                                                                variant={downloadMessages[item.id].type === 'error' ? 'destructive' : 'default'}
                                                                className="mt-2"
                                                            >
                                                                <AlertDescription>
                                                                    {downloadMessages[item.id].message}
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo do Pedido */}
                <Card className="mb-4 sm:mb-6">
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="text-base sm:text-lg">{t('orderDetails.orderSummary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm sm:text-base">
                                <span className="text-gray-600">{t('orderDetails.subtotal')}</span>
                                <span className="font-medium">{formatPrice(order.subtotal, order.currency)}</span>
                            </div>
                            {order.discountAmount && order.discountAmount > 0 && (
                                <div className="flex justify-between text-sm sm:text-base text-green-600">
                                    <span>
                                        {t('orderDetails.discount')}{order.couponCode ? ` (${order.couponCode})` : ''}
                                    </span>
                                    <span className="font-medium">-{formatPrice(order.discountAmount, order.currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                                <span>{t('orderDetails.totalPaid')}</span>
                                <span className="text-[#FD9555]">{formatPrice(order.total, order.currency)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Aviso sobre downloads */}
                {order.status === 'completed' && (
                    <Alert className="border-[#FED466] bg-yellow-50">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <AlertDescription className="text-xs sm:text-sm">
                            <strong>{t('orderDetails.important')}</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>{t('orderDetails.downloadInfo')}</li>
                                <li className="text-red-600 font-semibold">
                                    {t('orderDetails.downloadExpiry')}
                                </li>
                            </ul>
                            {order.paidAt && (
                                <p className="mt-3 text-xs sm:text-sm text-gray-700">
                                    {t('orderDetails.purchaseMadeOn')} <strong>{formatDate(order.paidAt)}</strong>
                                    <br />
                                    {(() => {
                                        const paidDate = new Date(order.paidAt);
                                        const accessDays = order.accessDays || 30;
                                        const expirationDate = new Date(paidDate.getTime() + accessDays * 24 * 60 * 60 * 1000);
                                        const now = new Date();
                                        const daysRemaining = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                                        if (daysRemaining === 0) {
                                            return (
                                                <span className="text-red-600 font-semibold text-xs sm:text-sm">
                                                    ⚠️ {t('orderDetails.expired')}
                                                </span>
                                            );
                                        } else if (daysRemaining <= 7) {
                                            return (
                                                <span className="text-orange-600 font-semibold text-xs sm:text-sm">
                                                    ⚠️ {t('orderDetails.expiresInDays', { days: daysRemaining, unit: daysRemaining === 1 ? t('orderDetails.day') : t('orderDetails.days') })}
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <span className="text-green-600 text-xs sm:text-sm">
                                                    ✅ {t('orderDetails.validForDays', { days: daysRemaining })}
                                                </span>
                                            );
                                        }
                                    })()}
                                </p>
                            )}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
