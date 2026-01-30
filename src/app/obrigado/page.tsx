'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { CheckCircle, Download, Mail, FileText, ArrowRight, Loader2, XCircle, FileDown } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/contexts/cart-context'
import Image from 'next/image'
import JSZip from 'jszip'
import { useTranslation } from 'react-i18next'

interface OrderItem {
    id: string
    productId: string
    variationId: string | null
    name: string
    price: string
    quantity: number
    total: string
    imageUrl?: string | null
    variation?: Record<string, string> | null
    files?: Array<{
        id: string
        name: string
        originalName: string
        path: string
        size: number
        mimeType: string
    }>
}

interface OrderData {
    order: {
        id: string
        email: string
        status: string
        paymentStatus: string | null
        subtotal: string
        discountAmount: string | null
        total: string
        currency: string
        paymentProvider: string | null
        paidAt: Date | null
        createdAt: Date
    }
    items: OrderItem[]
}

export default function ObrigadoPage() {
    const { t } = useTranslation('common');
    const searchParams = useSearchParams()
    const router = useRouter()
    const { status: sessionStatus } = useSession()
    const paymentIntent = searchParams.get('payment_intent') // Stripe
    const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId') // Pix/Mercado Pago (ambos formatos)
    const orderId = searchParams.get('order_id') || searchParams.get('orderId') // PayPal/Mercado Pago (ambos formatos)
    const collectionId = searchParams.get('collection_id') // Mercado Pago checkout
    // Status do Mercado Pago (não usado diretamente, mas disponível se necessário)
    // const collectionStatus = searchParams.get('collection_status')
    const externalReference = searchParams.get('external_reference') // Order ID do Mercado Pago
    const { clearCart } = useCart()

    const [orderData, setOrderData] = useState<OrderData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [downloadingItem, setDownloadingItem] = useState<string | null>(null)
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [checkingPayment, setCheckingPayment] = useState(false)

    // ✅ Limpar carrinho e cupom ao entrar na página de obrigado (APENAS UMA VEZ)
    useEffect(() => {
        clearCart();
        localStorage.removeItem('appliedCoupon');
        console.log('✅ [OBRIGADO] Carrinho e cupom limpos');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio = executa apenas uma vez

    // 🔒 Verificar autenticação antes de carregar pedido
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            // Não autenticado - redirecionar para login com callback
            const currentUrl = window.location.href;
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
        } else if (sessionStatus === 'authenticated') {
            // Autenticado - permitir carregar pedido
            setIsAuthorized(true);
        }
    }, [sessionStatus, router]);

    // ✅ NOVO: Verificar pagamento do Mercado Pago automaticamente quando chegar da página de checkout
    useEffect(() => {
        const checkMercadoPagoPayment = async () => {
            // Se veio do checkout do Mercado Pago (tem collection_id)
            if (collectionId && externalReference && isAuthorized) {
                setCheckingPayment(true);

                try {
                    // Aguardar 2 segundos antes de verificar (dar tempo pro webhook processar)
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Verificar o status do pagamento
                    const response = await fetch(`/api/mercado-pago/check-payment?paymentId=${collectionId}`);

                    if (response.ok) {
                        const data = await response.json();

                        // Se foi atualizado, recarregar os dados do pedido
                        if (data.updated) {
                            setTimeout(() => {
                                window.location.href = `/obrigado?payment_id=${collectionId}`;
                            }, 1000);
                        }
                    }
                } catch (error) {
                    console.error('[Obrigado] ❌ Erro ao verificar pagamento:', error);
                } finally {
                    setCheckingPayment(false);
                }
            }
        };

        checkMercadoPagoPayment();
    }, [collectionId, externalReference, isAuthorized]);

    useEffect(() => {
        // Só buscar pedido se estiver autenticado
        if (!isAuthorized) {
            return;
        }

        // Scroll to top when page loads
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0)
        }

        // Buscar dados do pedido com retry automático
        const fetchOrder = async (attempt = 1, maxRetries = 5) => {
            // ✅ Aceitar payment_intent (Stripe), payment_id (Pix) ou order_id (PayPal)
            if (!paymentIntent && !paymentId && !orderId) {
                setError('ID do pagamento não encontrado')
                setIsLoading(false)
                return
            }

            try {
                setRetryCount(attempt);

                console.log('🔍 [Obrigado] Fetching order, attempt:', attempt);

                // ✅ Construir URL baseado no tipo de pagamento
                let url = '/api/orders/by-payment-intent?'
                if (paymentIntent) {
                    url += `payment_intent=${paymentIntent}`
                } else if (paymentId) {
                    url += `payment_id=${paymentId}`
                } else if (orderId) {
                    url += `order_id=${orderId}`
                }

                const response = await fetch(url)

                if (response.status === 401) {
                    // Não autenticado - redirecionar
                    const currentUrl = window.location.href;
                    router.push(`/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
                    return;
                }

                if (response.status === 403) {
                    // Não autorizado - pedido não pertence a este usuário
                    setError('Você não tem permissão para acessar este pedido.');
                    setIsLoading(false);
                    return;
                }

                if (response.ok) {
                    const data = await response.json()
                    console.log('✅ [Obrigado] Order data received:', {
                        orderId: data.order?.id,
                        itemsCount: data.items?.length,
                        itemsWithFiles: data.items?.filter((i: any) => i.files?.length > 0).length,
                        items: data.items?.map((i: any) => ({
                            id: i.id,
                            name: i.name,
                            filesCount: i.files?.length || 0,
                        })),
                    });
                    setOrderData(data)
                    setIsLoading(false)
                    return // Sucesso!
                }

                // Se não encontrou e ainda tem tentativas
                if (attempt < maxRetries) {
                    // Aguardar 2 segundos e tentar novamente
                    setTimeout(() => {
                        fetchOrder(attempt + 1, maxRetries)
                    }, 2000)
                    return
                }

                // Esgotou todas tentativas
                throw new Error('Pedido ainda está sendo processado')

            } catch {
                if (attempt < maxRetries) {
                    // Ainda tem tentativas, aguardar e tentar novamente
                    setTimeout(() => {
                        fetchOrder(attempt + 1, maxRetries)
                    }, 2000)
                } else {
                    // Esgotou tentativas, mostrar erro
                    setError(
                        'Seu pedido está sendo processado. ' +
                        'Por favor, recarregue esta página em alguns segundos ou ' +
                        'verifique seu email para confirmação.'
                    )
                    setIsLoading(false)
                }
            }
        }

        fetchOrder()
    }, [paymentIntent, paymentId, orderId, isAuthorized, router])

    // If the order becomes approved, attempt to (re)send confirmation email via API once
    useEffect(() => {
        if (!orderData) return

        const order = orderData.order
        const paymentStatus = (order.paymentStatus || '').toLowerCase()
        const orderStatus = (order.status || '').toLowerCase()
        const isSuccess = orderStatus === 'completed' || paymentStatus === 'succeeded' || paymentStatus === 'paid'

        if (!isSuccess) return

        try {
            const key = `confirmationSent:${order.id}`
            if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
                // fire-and-forget; endpoint will return ok or error
                ; (async () => {
                    try {
                        const params = new URLSearchParams()
                        params.set('orderId', order.id)

                        const res = await fetch(`/api/orders/send-confirmation?${params.toString()}`)
                        if (res.ok) {
                            localStorage.setItem(key, '1')
                        }
                    } catch {
                        // Erro ao chamar send-confirmation
                    }
                })()
            }
        } catch {
            // Erro ao tentar enviar confirmação
        }
    }, [orderData])

    const formatPrice = (price: string | number, currency?: string) => {
        const parsed = typeof price === 'string' ? parseFloat(price) : price
        const numPrice = Number.isFinite(parsed) ? parsed : 0
        const curr = (currency || orderData?.order.currency || 'BRL').toUpperCase()

        // Map currency to locale for accurate formatting
        const localeMap: Record<string, string> = {
            'BRL': 'pt-BR',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'MXN': 'es-MX'
        }

        const locale = localeMap[curr] || 'pt-BR'

        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: curr, currencyDisplay: 'symbol' }).format(numPrice)
        } catch (err) {
            // Fallback to a safe string formatting in case Intl fails for any reason
            const fallbackSymbols: Record<string, string> = { 'BRL': 'R$', 'USD': '$', 'EUR': '€', 'MXN': 'MEX$' }
            const symbol = fallbackSymbols[curr] || 'R$'
            // Keep previous behavior for BRL
            if (curr === 'BRL') return `${symbol} ${numPrice.toFixed(2).replace('.', ',')}`
            if (curr === 'MXN') return `${symbol} ${numPrice.toFixed(2)}`
            return `${symbol}${numPrice.toFixed(2)}`
        }
    }

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // Estados de loading e erro
    if (sessionStatus === 'loading' || isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto text-center">
                    <Loader2 className="w-12 h-12 text-[#FED466] mx-auto mb-4 animate-spin" />
                    <h2 className="text-xl font-semibold mb-2">
                        {sessionStatus === 'loading'
                            ? t('thankYou.verifyingAuth')
                            : checkingPayment
                                ? t('thankYou.verifyingPayment')
                                : retryCount > 1
                                    ? t('thankYou.waitingConfirmation')
                                    : t('thankYou.loadingOrder')}
                    </h2>
                    {checkingPayment && (
                        <p className="text-gray-600 text-sm mb-2">
                            {t('thankYou.verifyingApproved')}
                        </p>
                    )}
                    {retryCount > 1 && sessionStatus !== 'loading' && !checkingPayment && (
                        <p className="text-gray-600 text-sm">
                            {t('thankYou.attempt', { count: retryCount })}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    if (error || !orderData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {error?.includes(t('thankYou.noPermission')) ? t('thankYou.accessDenied') : t('thankYou.orderNotFound')}
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {error || t('thankYou.couldNotLoad')}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/conta/pedidos">
                            <Button>
                                {t('thankYou.viewMyOrders')}
                            </Button>
                        </Link>
                        <Link href="/produtos">
                            <Button variant="outline">
                                {t('thankYou.backToProducts')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                {/* Status Message (dinâmico) */}
                {(() => {
                    const order = orderData.order
                    const paymentStatus = (order.paymentStatus || '').toLowerCase()
                    const orderStatus = (order.status || '').toLowerCase()

                    const isSuccess = orderStatus === 'completed' || paymentStatus === 'succeeded' || paymentStatus === 'paid'
                    const isPending = ['pending', 'processing', 'requires_action', 'requires_payment_method'].includes(orderStatus) || ['pending', 'processing', 'requires_action'].includes(paymentStatus)
                    const isFailed = ['failed', 'canceled', 'cancelled', 'refunded', 'voided'].includes(orderStatus) || ['failed', 'canceled', 'refunded'].includes(paymentStatus)

                    const Icon = isSuccess ? CheckCircle : isPending ? Loader2 : (isFailed ? XCircle : XCircle)
                    const iconClass = isSuccess ? 'text-green-600' : isPending ? 'text-amber-500 animate-spin' : (isFailed ? 'text-red-600' : 'text-gray-600')

                    const title = isSuccess
                        ? t('thankYou.success')
                        : isPending
                            ? t('thankYou.pendingTitle')
                            : t('thankYou.failedTitle')

                    const subtitle = isSuccess
                        ? t('thankYou.successMessage')
                        : isPending
                            ? t('thankYou.pendingMessage')
                            : t('thankYou.failedMessage')

                    return (
                        <div className="text-center mb-8">
                            <Icon className={`w-16 h-16 mx-auto mb-4 ${iconClass}`} />
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
                            <p className="text-gray-600">{subtitle}</p>
                        </div>
                    )
                })()}

                {/* Order Summary */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {t('thankYou.orderDetails')}
                            <Badge variant="outline">#{orderData.order.id.slice(0, 8).toUpperCase()}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">{t('thankYou.date')}:</span>
                                <div className="font-medium">
                                    {formatDate(orderData.order.createdAt)}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">{t('thankYou.payment')}:</span>
                                <div className="font-medium">
                                    {orderData.order.paymentProvider === 'stripe' ? t('thankYou.creditCard') : orderData.order.paymentProvider?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Resumo de valores com desconto */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('thankYou.subtotal')}:</span>
                                <span>{formatPrice(orderData.order.subtotal, orderData.order.currency)}</span>
                            </div>
                            {orderData.order.discountAmount && parseFloat(orderData.order.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>{t('thankYou.discountApplied')}:</span>
                                    <span>-{formatPrice(Math.abs(parseFloat(orderData.order.discountAmount)), orderData.order.currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-base border-t pt-2">
                                <span>{t('thankYou.totalPaid')}:</span>
                                <span className="text-[#FD9555]">{formatPrice(orderData.order.total, orderData.order.currency)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                            <div>
                                <span className="text-gray-600">{t('thankYou.status')}:</span>
                                {(() => {
                                    const s = (orderData.order.status || '').toLowerCase()
                                    const p = (orderData.order.paymentStatus || '').toLowerCase()
                                    const isSuccess = s === 'completed' || p === 'succeeded' || p === 'paid'
                                    const isPending = ['pending', 'processing', 'requires_action', 'requires_payment_method'].includes(s) || ['pending', 'processing', 'requires_action'].includes(p)
                                    const isFailed = ['failed', 'canceled', 'cancelled', 'refunded', 'voided'].includes(s) || ['failed', 'canceled', 'refunded'].includes(p)

                                    if (isSuccess) {
                                        return <Badge className="bg-green-100 text-green-800">{t('thankYou.approved')}</Badge>
                                    }

                                    if (isPending) {
                                        return <Badge className="bg-amber-100 text-amber-800">{t('thankYou.pending')}</Badge>
                                    }

                                    if (isFailed) {
                                        return <Badge className="bg-red-100 text-red-800">{t('thankYou.paymentNotApproved')}</Badge>
                                    }

                                    return <Badge className="bg-gray-100 text-gray-800">{orderData.order.status}</Badge>
                                })()}
                            </div>
                            <div></div> {/* Espaço vazio para manter grid */}
                        </div>

                        {/* ✅ NOVO: Botão para verificar pagamento manualmente se estiver pendente */}
                        {(() => {
                            const s = (orderData.order.status || '').toLowerCase()
                            const p = (orderData.order.paymentStatus || '').toLowerCase()
                            const isPending = ['pending', 'processing', 'requires_action', 'requires_payment_method'].includes(s) || ['pending', 'processing', 'requires_action'].includes(p)

                            // Só mostrar se estiver pendente E for Mercado Pago
                            if (isPending && orderData.order.paymentProvider === 'mercadopago' && (collectionId || paymentId)) {
                                return (
                                    <div className="border-t pt-4">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <p className="text-sm text-amber-900 mb-3">
                                                {t('thankYou.pendingConfirmation')}
                                            </p>
                                            <Button
                                                onClick={async () => {
                                                    setCheckingPayment(true)
                                                    try {
                                                        const payId = collectionId || paymentId
                                                        const response = await fetch(`/api/mercado-pago/check-payment?paymentId=${payId}`)
                                                        const data = await response.json()

                                                        if (response.ok && data.updated) {
                                                            // Recarregar a página para mostrar dados atualizados
                                                            window.location.reload()
                                                        } else if (response.ok && !data.updated) {
                                                            alert('Pagamento ainda está pendente. Aguarde alguns minutos e tente novamente.')
                                                        } else {
                                                            alert('Erro ao verificar pagamento. Tente novamente.')
                                                        }
                                                    } catch (error) {
                                                        console.error('Erro:', error)
                                                        alert('Erro ao verificar pagamento. Tente novamente.')
                                                    } finally {
                                                        setCheckingPayment(false)
                                                    }
                                                }}
                                                disabled={checkingPayment}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                            >
                                                {checkingPayment ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        {t('thankYou.verifying')}
                                                    </>
                                                ) : (
                                                    t('thankYou.checkPaymentStatus')
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        })()}
                    </CardContent>
                </Card>

                {/* Downloads */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            {t('thankYou.yourProducts')} ({orderData.items.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {orderData.items.map((item) => (
                            <div
                                key={item.id}
                                className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white"
                            >
                                <div className="flex gap-3 sm:gap-4 mb-3">
                                    {/* Imagem do Produto */}
                                    <div className="shrink-0">
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
                                                {formatPrice(item.total, orderData.order.currency)}
                                            </p>
                                        </div>

                                        {/* Variações em Badges */}
                                        {item.variation && (
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
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

                                {/* Botões de Download */}
                                {(orderData.order.status === 'completed' || orderData.order.paymentStatus === 'succeeded' || orderData.order.paymentStatus === 'paid') ? (
                                    <div className="space-y-2">
                                        {(() => {
                                            console.log('🔍 [Obrigado Render] Item files check:', {
                                                itemId: item.id,
                                                itemName: item.name,
                                                hasFiles: !!item.files,
                                                filesLength: item.files?.length || 0,
                                                files: item.files?.map(f => ({ id: f.id, name: f.name })),
                                            });
                                            return null;
                                        })()}
                                        {item.files && item.files.length > 0 ? (
                                            <>
                                                {/* Botão "Baixar Todos" se tiver mais de 1 arquivo */}
                                                {item.files.length > 1 && (
                                                    <Button
                                                        className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-medium cursor-pointer"
                                                        onClick={async () => {
                                                            try {
                                                                setDownloadingItem('all-' + item.id)

                                                                // Criar ZIP com todos os arquivos
                                                                const zip = new JSZip()

                                                                // Baixar todos os arquivos e adicionar ao ZIP
                                                                for (const file of item.files!) {
                                                                    const params = new URLSearchParams()
                                                                    if (paymentIntent) params.set('payment_intent', paymentIntent)
                                                                    if (paymentId) params.set('payment_id', paymentId)
                                                                    if (orderId) params.set('order_id', orderId)
                                                                    params.set('itemId', item.id)
                                                                    params.set('fileId', file.id)

                                                                    const res = await fetch(`/api/orders/download?${params.toString()}`)
                                                                    if (!res.ok) continue

                                                                    const data = await res.json()
                                                                    const downloadUrl = data?.downloadUrl || data?.signedUrl
                                                                    if (!downloadUrl) continue

                                                                    // Baixar o arquivo como blob
                                                                    const fileResponse = await fetch(downloadUrl)
                                                                    if (!fileResponse.ok) continue

                                                                    const blob = await fileResponse.blob()

                                                                    // Adicionar ao ZIP
                                                                    zip.file(file.name, blob)
                                                                }

                                                                // Gerar o arquivo ZIP
                                                                const zipBlob = await zip.generateAsync({ type: 'blob' })

                                                                // Fazer download do ZIP
                                                                const zipUrl = URL.createObjectURL(zipBlob)
                                                                const link = document.createElement('a')
                                                                link.href = zipUrl
                                                                link.download = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_arquivos.zip`
                                                                document.body.appendChild(link)
                                                                link.click()
                                                                document.body.removeChild(link)
                                                                URL.revokeObjectURL(zipUrl)

                                                                setDownloadingItem(null)
                                                            } catch (error) {
                                                                console.error('Erro ao criar ZIP:', error)
                                                                setError('Erro ao criar arquivo ZIP')
                                                                setDownloadingItem(null)
                                                            }
                                                        }}
                                                        disabled={!!downloadingItem}
                                                    >
                                                        {downloadingItem === 'all-' + item.id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                <span>{t('thankYou.creatingZip')}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FileDown className="w-4 h-4 mr-2" />
                                                                <span>{t('thankYou.downloadAll', { count: item.files!.length })}</span>
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
                                                                    <Download className="w-4 h-4 shrink-0" />
                                                                    <span>{t('thankYou.downloadIndividually')}</span>
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
                                                                                setDownloadingItem(file.id)
                                                                                const params = new URLSearchParams()
                                                                                if (paymentIntent) params.set('payment_intent', paymentIntent)
                                                                                if (paymentId) params.set('payment_id', paymentId)
                                                                                if (orderId) params.set('order_id', orderId)
                                                                                params.set('itemId', item.id)
                                                                                params.set('fileId', file.id)

                                                                                console.log('📥 [Download All] Fetching file:', {
                                                                                    itemId: item.id,
                                                                                    fileId: file.id,
                                                                                    fileName: file.name,
                                                                                });

                                                                                const res = await fetch(`/api/orders/download?${params.toString()}`)
                                                                                if (!res.ok) {
                                                                                    console.error('❌ [Download All] Fetch failed:', res.status, res.statusText);
                                                                                    setError('Erro ao iniciar download')
                                                                                    setDownloadingItem(null)
                                                                                    return
                                                                                }

                                                                                const data = await res.json()
                                                                                const downloadUrl = data?.downloadUrl || data?.signedUrl
                                                                                if (!downloadUrl) {
                                                                                    setError('URL de download não disponível')
                                                                                    setDownloadingItem(null)
                                                                                    return
                                                                                }

                                                                                // ✅ Safari: abrir em nova aba (download automático via R2 headers)
                                                                                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                                                                                if (isSafari) {
                                                                                    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                                                                                } else {
                                                                                    const link = document.createElement('a')
                                                                                    link.href = downloadUrl
                                                                                    link.download = file.name || 'download.pdf'
                                                                                    link.target = '_blank'
                                                                                    link.rel = 'noopener noreferrer'
                                                                                    document.body.appendChild(link)
                                                                                    link.click()
                                                                                    document.body.removeChild(link)
                                                                                }

                                                                                setDownloadingItem(null)
                                                                            } catch {
                                                                                setError('Erro ao iniciar download')
                                                                                setDownloadingItem(null)
                                                                            }
                                                                        }}
                                                                        disabled={!!downloadingItem}
                                                                    >
                                                                        {downloadingItem === file.id ? (
                                                                            <>
                                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                                                                                <span className="truncate">{t('thankYou.generating')}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Download className="w-4 h-4 mr-2 shrink-0 group-hover:scale-110 transition-transform" />
                                                                                <span className="truncate">
                                                                                    {t('thankYou.file', { number: fileIndex + 1 })}: {file.name}
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
                                                                const file = item.files![0]
                                                                setDownloadingItem(file.id)
                                                                const params = new URLSearchParams()
                                                                if (paymentIntent) params.set('payment_intent', paymentIntent)
                                                                if (paymentId) params.set('payment_id', paymentId)
                                                                if (orderId) params.set('order_id', orderId)
                                                                params.set('itemId', item.id)
                                                                params.set('fileId', file.id)

                                                                console.log('📥 [Download Single] Fetching file:', {
                                                                    itemId: item.id,
                                                                    fileId: file.id,
                                                                    fileName: file.name,
                                                                });

                                                                const res = await fetch(`/api/orders/download?${params.toString()}`)
                                                                if (!res.ok) {
                                                                    console.error('❌ [Download Single] Fetch failed:', res.status, res.statusText);
                                                                    setError('Erro ao iniciar download')
                                                                    setDownloadingItem(null)
                                                                    return
                                                                }

                                                                const data = await res.json()
                                                                const downloadUrl = data?.downloadUrl || data?.signedUrl
                                                                console.log('✅ [Download Single] URL received:', {
                                                                    hasUrl: !!downloadUrl,
                                                                    urlLength: downloadUrl?.length,
                                                                });
                                                                if (!downloadUrl) {
                                                                    console.error('❌ [Download Single] No download URL in response');
                                                                    setError('URL de download não disponível')
                                                                    setDownloadingItem(null)
                                                                    return
                                                                }

                                                                // ✅ Safari: abrir em nova aba (download automático via R2 headers)
                                                                // Chrome/Firefox: usar <a> download
                                                                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

                                                                if (isSafari) {
                                                                    // Safari: abrir URL diretamente
                                                                    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                                                                } else {
                                                                    // Outros navegadores: usar <a> download
                                                                    const link = document.createElement('a')
                                                                    link.href = downloadUrl
                                                                    link.download = file.name || 'download.pdf'
                                                                    link.target = '_blank'
                                                                    link.rel = 'noopener noreferrer'
                                                                    document.body.appendChild(link)
                                                                    link.click()
                                                                    document.body.removeChild(link)
                                                                }

                                                                setDownloadingItem(null)
                                                            } catch {
                                                                setError('Erro ao iniciar download')
                                                                setDownloadingItem(null)
                                                            }
                                                        }}
                                                        disabled={!!downloadingItem}
                                                    >
                                                        {downloadingItem === item.files![0].id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                                                                <span className="truncate">Gerando...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download className="w-4 h-4 mr-2 shrink-0" />
                                                                <span className="truncate">{t('thankYou.download')} {item.files![0].name}</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <Button
                                                className="w-full bg-[#FED466] hover:bg-[#FED466]/90 text-black cursor-pointer font-bold"
                                                onClick={async () => {
                                                    try {
                                                        setDownloadingItem(item.id)
                                                        // Call the secure download endpoint which validates order status and returns proxy URL
                                                        const params = new URLSearchParams()
                                                        if (paymentIntent) params.set('payment_intent', paymentIntent)
                                                        if (paymentId) params.set('payment_id', paymentId)
                                                        if (orderId) params.set('order_id', orderId)
                                                        params.set('itemId', item.id)

                                                        const res = await fetch(`/api/orders/download?${params.toString()}`)
                                                        if (!res.ok) {
                                                            setError('Erro ao iniciar download')
                                                            setDownloadingItem(null)
                                                            return
                                                        }

                                                        const data = await res.json()
                                                        const downloadUrl = data?.downloadUrl || data?.signedUrl
                                                        if (!downloadUrl) {
                                                            setError('URL de download não disponível')
                                                            setDownloadingItem(null)
                                                            return
                                                        }

                                                        // ✅ Detectar mobile e usar abordagem diferente
                                                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

                                                        if (isMobile) {
                                                            // Mobile: usar link direto para evitar bloqueio de popup
                                                            const link = document.createElement('a')
                                                            link.href = downloadUrl
                                                            link.download = item.name || 'download.pdf'
                                                            link.target = '_blank'
                                                            link.rel = 'noopener noreferrer'
                                                            document.body.appendChild(link)
                                                            link.click()
                                                            document.body.removeChild(link)
                                                        } else {
                                                            // Desktop: manter comportamento atual
                                                            window.open(downloadUrl, '_blank')
                                                        }

                                                        setDownloadingItem(null)
                                                    } catch {
                                                        setError('Erro ao iniciar download')
                                                        setDownloadingItem(null)
                                                    }
                                                }}
                                                disabled={!!downloadingItem}
                                            >
                                                {downloadingItem === item.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        <span>{t('thankYou.generating')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        <span>{t('thankYou.download')}</span>
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button disabled variant="ghost" className="w-full opacity-60 cursor-not-allowed">
                                        <Download className="w-4 h-4 mr-2" />
                                        {t('thankYou.pendingPayment')}
                                    </Button>
                                )}
                            </div>
                        ))}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-blue-900">
                                        Links enviados por e-mail
                                    </p>
                                    <p className="text-blue-700">
                                        Enviamos os links de download para <strong>{orderData.order.email}</strong>.
                                        Verifique sua caixa de entrada e spam.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Important Information (legal copyright notice) */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Informações Importantes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="text-gray-800 space-y-2">
                            <p>
                                A Rafa Criou está garantida por Lei Federal de Direitos Autorais (Lei nº 9.610, 02/1998). O que cobre a possibilidade de publicações de marcas, artes e qualquer material criado pela loja sem a necessidade de aviso prévio. Através da mesma lei, caracteriza-se como crime a cópia, e/ou divulgação total ou parcial de materiais elaborados pela loja sem a autorização para uso comercial.
                            </p>

                            <p>
                                - Não é permitido distribuir, doar, repassar, revender, sub-licenciar ou compartilhar qualquer nossos produtos originais ou alterados em forma digital.
                            </p>

                            <p className="text-sm text-gray-600">
                                - A Rafa Criou <b>NÃO UTILIZA</b> de forma alguma qualquer material da associação Watchtower (domínio <b className='text-red-600'>jw.org</b>). Nossos arquivos são principalmente imagens 100% autorais ou geradas/alteradas via IA quando aplicável.
                            </p>
                            <p className="text-sm text-gray-600">
                                Temos total ciência que utilizar qualquer material da associação é errado e um crime.
                            </p>
                            <p className="text-sm text-red-600">
                                Pirataria é crime e não concordamos com tais atos.
                            </p>
                            <p className="text-sm text-red-600">
                                No caso de acusações envolvendo crimes contra a associação Watchtower, sua mensagem pode e será usada como prova judicial para danos morais quando aplicável (calúnia, difamação ou injúria).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex justify-center items-center gap-2">O que fazer agora?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1">
                            <Button asChild variant="default" className="h-auto p-4 bg-[#FED466] text-black hover:bg-[#FD9555] border-2 border-[#FD9555] shadow-md">
                                <Link href="/produtos">
                                    <div className="text-left">
                                        <div className="font-medium flex items-center gap-2">
                                            <ArrowRight className="w-4 h-4" />
                                            Continuar Comprando
                                        </div>

                                    </div>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Message */}
                <div className="text-center text-gray-600">
                    <p className="text-sm">
                        {t('thankYou.thankYouMessage')} <strong>{t('thankYou.strong')}</strong>! 🎉
                    </p>
                    <p className="text-xs mt-2">
                        {t('thankYou.needHelp')} {t('thankYou.needHelpMessage')}: contato@arafacriou.com.br
                    </p>
                </div>
            </div>
        </div>
    )
}