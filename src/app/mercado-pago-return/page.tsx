'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function MercadoPagoReturnPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [countdown, setCountdown] = useState(3)
    const [isChecking, setIsChecking] = useState(false)
    const [currentStatus, setCurrentStatus] = useState<string | null>(null)

    const status = searchParams.get('collection_status') || searchParams.get('status')
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
    const externalReference = searchParams.get('external_reference')

    // ✅ MELHORADO: Verificar status do pagamento E do pedido a cada 4 segundos
    useEffect(() => {
        if (!paymentId && !externalReference) {
            console.error('[MercadoPago Return] Nem paymentId nem externalReference encontrados')
            return
        }

        const checkPaymentStatus = async () => {
            if (isChecking) return // Evitar chamadas simultâneas

            setIsChecking(true)
            try {
                // Tentar verificar por payment_id primeiro
                if (paymentId) {
                    const response = await fetch(`/api/mercado-pago/check-payment?paymentId=${paymentId}`)
                    if (response.ok) {
                        const data = await response.json()
                        console.log('[MercadoPago Return] Status do pagamento:', data.mercadoPago?.status)

                        // Atualizar status atual se mudou
                        if (data.mercadoPago?.status) {
                            setCurrentStatus(data.mercadoPago.status)

                            // Se foi aprovado ou pago, redirecionar imediatamente
                            if (data.mercadoPago.status === 'approved' || data.mercadoPago.status === 'paid') {
                                console.log('[MercadoPago Return] ✅ Pagamento aprovado! Redirecionando...')
                                router.push(`/obrigado?payment_id=${paymentId}`)
                                return
                            }
                        }
                    }
                }

                // Se não funcionou com payment_id, tentar buscar pedido por external_reference
                if (externalReference && !currentStatus) {
                    const orderResponse = await fetch(`/api/orders/status?orderId=${externalReference}`)
                    if (orderResponse.ok) {
                        const orderData = await orderResponse.json()
                        console.log('[MercadoPago Return] Status do pedido:', orderData.status, '/', orderData.paymentStatus)

                        // Se pedido está completed com pagamento pago, redirecionar
                        if (orderData.status === 'completed' && orderData.paymentStatus === 'paid') {
                            console.log('[MercadoPago Return] ✅ Pedido completado! Redirecionando...')
                            router.push(`/obrigado?order_id=${externalReference}`)
                            return
                        }

                        // Atualizar status atual baseado no pedido
                        if (orderData.paymentStatus) {
                            setCurrentStatus(orderData.paymentStatus)
                        }
                    }
                }
            } catch (error) {
                console.error('[MercadoPago Return] Erro ao verificar status:', error)
            } finally {
                setIsChecking(false)
            }
        }

        // Verificar imediatamente
        checkPaymentStatus()

        // Depois verificar a cada 4 segundos
        const interval = setInterval(checkPaymentStatus, 4000)

        return () => clearInterval(interval)
    }, [paymentId, externalReference, router, isChecking, currentStatus])

    useEffect(() => {
        // Determinar para onde redirecionar baseado no status
        let redirectUrl = '/conta/pedidos'

        if (status === 'approved' || status === 'paid') {
            redirectUrl = `/obrigado?payment_id=${paymentId}`
        } else if (status === 'pending' || status === 'in_process') {
            redirectUrl = `/conta/pedidos`
        } else if (status === 'rejected' || status === 'cancelled') {
            redirectUrl = '/carrinho?error=payment_failed'
        }

        // Countdown e redirect - CORRIGIDO
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                const newValue = prev - 1
                if (newValue <= 0) {
                    clearInterval(countdownInterval)
                    // Usar setTimeout para evitar setState durante render
                    setTimeout(() => router.push(redirectUrl), 0)
                    return 0
                }
                return newValue
            })
        }, 1000)

        return () => clearInterval(countdownInterval)
    }, [status, paymentId, router])

    // Determinar ícone e mensagem baseado no status
    const getStatusInfo = () => {
        // Usar currentStatus se disponível (do polling), senão usar status da URL
        const effectiveStatus = currentStatus || status

        if (effectiveStatus === 'approved' || effectiveStatus === 'paid') {
            return {
                icon: <CheckCircle className="w-16 h-16 text-green-500" />,
                title: 'Pagamento Aprovado!',
                message: 'Seu pagamento foi processado com sucesso.',
                redirectText: 'Redirecionando para seus produtos...',
                color: 'text-green-600'
            }
        } else if (effectiveStatus === 'pending' || effectiveStatus === 'in_process') {
            return {
                icon: <Clock className="w-16 h-16 text-amber-500" />,
                title: 'Pagamento Pendente',
                message: 'Seu pagamento está sendo processado. Você receberá um e-mail quando for confirmado.',
                redirectText: 'Redirecionando para seus pedidos...',
                color: 'text-amber-600'
            }
        } else {
            return {
                icon: <XCircle className="w-16 h-16 text-red-500" />,
                title: 'Pagamento Não Aprovado',
                message: 'Seu pagamento não foi aprovado. Tente novamente com outro meio de pagamento.',
                redirectText: 'Redirecionando para o carrinho...',
                color: 'text-red-600'
            }
        }
    }

    const statusInfo = getStatusInfo()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Ícone */}
                    <div className="flex justify-center mb-6">
                        {statusInfo.icon}
                    </div>

                    {/* Título */}
                    <h1 className={`text-2xl font-bold mb-4 ${statusInfo.color}`}>
                        {statusInfo.title}
                    </h1>

                    {/* Mensagem */}
                    <p className="text-gray-600 mb-6">
                        {statusInfo.message}
                    </p>

                    {/* Payment ID */}
                    {paymentId && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-6">
                            <p className="text-xs text-gray-500 mb-1">ID do Pagamento</p>
                            <p className="text-sm font-mono text-gray-700">{paymentId}</p>
                        </div>
                    )}

                    {/* Countdown */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Loader2 className="w-5 h-5 text-[#FED466] animate-spin" />
                        <p className="text-gray-600">
                            {statusInfo.redirectText}
                        </p>
                    </div>

                    <div className="text-3xl font-bold text-[#FD9555] mb-6">
                        {countdown}
                    </div>

                    {/* ✅ NOVO: Indicador de verificação automática */}
                    {isChecking && (currentStatus === 'pending' || status === 'pending') && (
                        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Verificando status automaticamente a cada 4 segundos...</span>
                        </div>
                    )}

                    {/* Botões de ação manual */}
                    <div className="space-y-3">
                        {status === 'approved' || status === 'paid' ? (
                            <Link href={`/obrigado?payment_id=${paymentId}`}>
                                <Button className="w-full bg-[#FED466] hover:bg-[#FED466]/90 text-black">
                                    Ir para Meus Produtos Agora
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/conta/pedidos">
                                <Button className="w-full bg-[#FED466] hover:bg-[#FED466]/90 text-black">
                                    Ver Meus Pedidos Agora
                                </Button>
                            </Link>
                        )}

                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                Voltar para a Página Inicial
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Debug info (apenas em dev) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
                        <p className="font-bold mb-2">Debug Info:</p>
                        <p>Status URL: {status}</p>
                        <p>Status Atual (polling): {currentStatus || 'Não verificado ainda'}</p>
                        <p>Payment ID: {paymentId}</p>
                        <p>External Ref: {externalReference}</p>
                        <p>Verificando: {isChecking ? 'Sim' : 'Não'}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
