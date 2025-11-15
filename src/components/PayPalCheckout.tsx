'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/cart-context'
import { useCurrency } from '@/contexts/currency-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface PayPalCheckoutProps {
    appliedCoupon: {
        code: string
        discount: number
    } | null
    finalTotal: number
}

export function PayPalCheckout({ appliedCoupon }: PayPalCheckoutProps) {
    const router = useRouter()
    const { t } = useTranslation('common')
    const { data: session } = useSession()
    const { items, clearCart } = useCart()
    const { currency } = useCurrency()
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')

    const handlePayPalCheckout = async () => {
        if (!session?.user?.email) {
            // Salvar redirecionamento
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('redirectAfterLogin', '/carrinho')
            }
            // Redirecionar para login
            window.location.href = '/auth/login?callbackUrl=/carrinho'
            return
        }

        setIsProcessing(true)
        setError('')

        try {
            // 1. Criar ordem no backend
            const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        productId: item.productId,
                        variationId: item.variationId,
                        quantity: item.quantity,
                    })),
                    userId: (session.user as { id?: string }).id,
                    email: session.user.email,
                    couponCode: appliedCoupon?.code || null,
                    discount: appliedCoupon?.discount || 0, // ✅ Enviar em BRL, API converte
                    currency: currency,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar ordem PayPal')
            }

            const { orderId, dbOrderId } = data

            // 2. Abrir popup do PayPal
            const paypalWindow = window.open(
                `https://www.${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}paypal.com/checkoutnow?token=${orderId}`,
                'PayPal',
                'width=500,height=600'
            )

            if (!paypalWindow) {
                setError('Popup bloqueado. Por favor, permita popups para este site.')
                setIsProcessing(false)
                return
            }

            // 3. Polling para verificar status do pedido enquanto popup está aberto
            let pollAttempts = 0
            const maxPollAttempts = 120 // 120 tentativas x 3s = 6 minutos

            const checkPaymentStatus = setInterval(async () => {
                pollAttempts++

                // Se popup foi fechado manualmente, parar polling
                if (paypalWindow.closed) {
                    clearInterval(checkPaymentStatus)
                    return
                }

                // Verificar status do pedido usando ambos os endpoints
                try {
                    // Primeiro, verificar status no banco
                    const statusResponse = await fetch(`/api/orders/status?orderId=${dbOrderId}`)
                    const statusData = await statusResponse.json()

                    if (statusData.status === 'completed' && statusData.paymentStatus === 'paid') {
                        // ✅ PAGAMENTO APROVADO! Fechar popup automaticamente
                        clearInterval(checkPaymentStatus)
                        paypalWindow.close()
                        clearCart()
                        router.push(`/obrigado?order_id=${dbOrderId}`)
                        return
                    }

                    // Se ainda está pending, tentar consultar PayPal diretamente
                    if (statusData.status === 'pending' && pollAttempts % 3 === 0) {
                        // A cada 3 tentativas (9 segundos), consultar PayPal API
                        const paypalCheckResponse = await fetch(`/api/paypal/check-order?orderId=${dbOrderId}`)
                        if (paypalCheckResponse.ok) {
                            const paypalData = await paypalCheckResponse.json()
                            console.log('[PayPal] Status no PayPal:', paypalData.paypal?.status)

                            if (paypalData.order?.status === 'completed' && paypalData.order?.paymentStatus === 'paid') {
                                clearInterval(checkPaymentStatus)
                                console.log('[PayPal] ✅ Pagamento aprovado via PayPal API! Fechando popup...')
                                paypalWindow.close()
                                clearCart()
                                router.push(`/obrigado?order_id=${dbOrderId}`)
                                return
                            }
                        }
                    }

                    // Se atingiu máximo de tentativas, parar
                    if (pollAttempts >= maxPollAttempts) {
                        clearInterval(checkPaymentStatus)
                        console.log('[PayPal] ⏱️ Timeout do polling')
                    }
                } catch (err) {
                    console.error('[PayPal] Erro ao verificar status:', err)
                }
            }, 3000) // Verificar a cada 3 segundos

            // 4. Monitorar se a janela foi fechada MANUALMENTE
            const checkWindowClosed = setInterval(async () => {
                if (paypalWindow?.closed) {
                    clearInterval(checkWindowClosed)
                    clearInterval(checkPaymentStatus) // Parar polling também
                    console.log('[PayPal] Janela fechada manualmente, verificando status final...')

                    try {
                        // Consultar status final do pedido
                        const statusResponse = await fetch(`/api/orders/status?orderId=${dbOrderId}`)
                        const statusData = await statusResponse.json()

                        console.log('[PayPal] Status final do pedido:', statusData.status, '/', statusData.paymentStatus)

                        if (statusData.status === 'completed' && statusData.paymentStatus === 'paid') {
                            // ✅ Pagamento confirmado via webhook!
                            clearCart()
                            router.push(`/obrigado?order_id=${dbOrderId}`)
                        } else if (statusData.status === 'pending') {

                            const paypalCheckResponse = await fetch(`/api/paypal/check-order?orderId=${dbOrderId}`)
                            if (paypalCheckResponse.ok) {
                                const paypalData = await paypalCheckResponse.json()

                                if (paypalData.order?.status === 'completed' && paypalData.order?.paymentStatus === 'paid') {
                                    clearCart()
                                    router.push(`/obrigado?order_id=${dbOrderId}`)
                                    return
                                }
                            }

                            // Se ainda está pending, avisar usuário
                            console.log('[PayPal] ⚠️ Pedido ainda pendente - usuário pode ter cancelado')
                            setError('Pagamento não foi completado. Se você aprovou, aguarde alguns segundos e verifique seus pedidos.')
                            setIsProcessing(false)
                        } else {
                            // ❌ Cancelado ou erro
                            setError('Pagamento cancelado ou não foi completado')
                            setIsProcessing(false)
                        }
                    } catch (err) {
                        console.error('[PayPal] Erro ao verificar status:', err)
                        setError('Erro ao verificar pagamento. Verifique seus pedidos ou e-mail.')
                        setIsProcessing(false)
                    }
                }
            }, 1000)

            // 5. Timeout de 10 minutos para fechar popup se necessário
            setTimeout(() => {
                clearInterval(checkWindowClosed)
                clearInterval(checkPaymentStatus)
                if (!paypalWindow?.closed) {
                    console.log('[PayPal] ⏱️ Timeout de 10 minutos - fechando popup')
                    paypalWindow?.close()
                }
                setIsProcessing(false)
            }, 600000)
        } catch (err) {
            console.error('[PayPal] Erro:', err)
            setError(err instanceof Error ? err.message : 'Erro ao processar pagamento')
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-3">
            <Button
                onClick={handlePayPalCheckout}
                disabled={isProcessing}
                className="w-full h-12 bg-[#0070ba] hover:bg-[#003087] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                size="lg"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('checkout.processing', 'Processando...')}
                    </>
                ) : (
                    <>
                        <Image
                            src="/payments/paypal.svg"
                            alt={t('a11y.paypalAlt')}
                            width={80}
                            height={20}
                            className="h-5 w-auto"
                        />
                        <span>{t('cart.payWithPayPal', 'Pagar com PayPal')}</span>
                    </>
                )}
            </Button>

            {error && (
                <p className="text-sm text-red-600 text-center font-medium">{error}</p>
            )}

            <p className="text-xs text-gray-500 text-center">
                {currency === 'BRL' && t('cart.securePaymentPayPalBRL', 'Pagamento seguro via PayPal • Aceita BRL (R$)')}
                {currency === 'USD' && t('cart.securePaymentPayPalUSD', 'Secure payment via PayPal • Accepts USD ($)')}
                {currency === 'EUR' && t('cart.securePaymentPayPalEUR', 'Secure payment via PayPal • Accepts EUR (€)')}
            </p>
        </div>
    )
}
