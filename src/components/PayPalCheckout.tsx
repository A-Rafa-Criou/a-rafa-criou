'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/cart-context'
import { useCurrency } from '@/contexts/currency-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
// Image removed from button to keep only text; Image import left in case other sections need it in the future.
// Keeping the import suppressed to avoid lilnt errors if not used - we will remove if truly unnecessary globally.
// Removed Image import since the PayPal button no longer displays the image
import { useTranslation } from 'react-i18next'

interface PayPalCheckoutProps {
    appliedCoupon: {
        code: string
        discount: number
    } | null
    finalTotal: number
}

type PayPalCheckResponse = {
    order?: { status?: string; paymentStatus?: string };
    paypal?: { status?: string };
    captureError?: { status?: number; message?: string; details?: string; error?: string } | string | null;
};

export function PayPalCheckout({ appliedCoupon }: PayPalCheckoutProps) {
    const router = useRouter()
    const { t } = useTranslation('common')
    const { data: session } = useSession()
    const { items, clearCart } = useCart()
    const { currency } = useCurrency()
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const [errorDetails, setErrorDetails] = useState<string | null>(null)
    const [createdDbOrderId, setCreatedDbOrderId] = useState<string | null>(null)

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
                // Special-case when currency is not accepted by the merchant
                if (data && data.error === 'CURRENCY_NOT_ACCEPTED') {
                    setError('O vendedor não aceita pagamentos na moeda selecionada. Escolha outro método de pagamento ou altere a moeda.');
                    setErrorDetails(data.details || data.message || '')
                    setIsProcessing(false)
                    return
                }
                throw new Error(data.error || 'Erro ao criar ordem PayPal')
            }

            const { orderId, dbOrderId } = data
            setCreatedDbOrderId(dbOrderId || null)

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
                        localStorage.removeItem('appliedCoupon')
                        router.push(`/obrigado?order_id=${dbOrderId}`)
                        return
                    }

                    // Se ainda está pending, tentar consultar PayPal diretamente
                    if (statusData.status === 'pending' && pollAttempts % 3 === 0) {
                        // A cada 3 tentativas (9 segundos), consultar PayPal API
                        const paypalCheckResponse = await fetch(`/api/paypal/check-order?orderId=${dbOrderId}`)
                        // Try to parse JSON regardless of status — server may return structured data even on 500
                        const responseText = await paypalCheckResponse.text().catch(() => '')
                        let paypalData: unknown = null
                        try {
                            paypalData = responseText ? JSON.parse(responseText) : null
                        } catch (e) {
                            console.warn('[PayPal] check-order response not valid JSON:', e, responseText)
                        }
                        if (paypalData) {
                            // Narrow type for safer access
                            const pd = paypalData as PayPalCheckResponse;
                            // Normalize captureError for logging (avoid printing empty {})
                            const _rawCe = pd.captureError;
                            const _ceDebug = _rawCe && (typeof _rawCe === 'string' ? _rawCe : (_rawCe.message || _rawCe.error || _rawCe.details || JSON.stringify(_rawCe)));
                            console.log('[PayPal] Status no PayPal:', pd.paypal?.status, 'captureError:', _ceDebug)
                            if (pd.captureError) {
                                // Capture failed; show error to user and stop polling
                                clearInterval(checkPaymentStatus)
                                clearInterval(checkWindowClosed)
                                // Special-cases: currency not accepted or merchant requires manual action
                                const ceObj = typeof pd.captureError === 'object' ? (pd.captureError as unknown as Record<string, unknown>) : null
                                if (ceObj?.error === 'CURRENCY_NOT_ACCEPTED') {
                                    setError('O vendedor não aceita pagamentos na moeda selecionada. Escolha outro método de pagamento ou mude para R$ para pagar por PayPal.')
                                    // Normalize details to string
                                    const normalizedDetails = typeof ceObj?.details === 'string' ? ceObj.details : typeof ceObj?.message === 'string' ? ceObj.message : JSON.stringify(ceObj?.details || ceObj?.message || '').slice(0, 1000)
                                    setErrorDetails(normalizedDetails || null)
                                } else if (ceObj?.pendingReason === 'RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION' || (typeof ceObj?.details === 'string' && ceObj.details.includes('RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION'))) {
                                    setError('Pagamento recebido pelo PayPal, aguardando liberação manual do vendedor. Você receberá um e-mail quando o pagamento for concluído.')
                                    const normalizedDetails2 = typeof ceObj?.details === 'string' ? ceObj.details : typeof ceObj?.message === 'string' ? ceObj.message : JSON.stringify(ceObj?.details || ceObj?.message || '').slice(0, 1000)
                                    setErrorDetails(normalizedDetails2 || null)
                                } else {
                                    setError('Erro ao confirmar pagamento. Por favor contate o suporte se o valor foi debitado.')
                                }
                                setIsProcessing(false)
                                // Normalize captureError message
                                try {
                                    const ce = pd.captureError;
                                    let message = 'Erro ao capturar pagamento';
                                    if (!ce) {
                                        message = 'Erro ao capturar pagamento (detalhes indisponíveis)';
                                    } else if (typeof ce === 'object' && ce.details && typeof ce.details === 'string' && ce.details.length > 0 && !ce.details.includes('Erro interno do servidor')) {
                                        // Prefer details if it's present and more specific than a generic message
                                        message = ce.details;
                                    } else if (typeof ce === 'string') {
                                        message = ce;
                                    } else if (typeof ce === 'object') {
                                    } else if (typeof ce === 'string') {
                                        message = ce;
                                    } else if (typeof ce === 'object' && ce !== null) {
                                        const ceObj = ce as { message?: unknown; error?: unknown; details?: unknown };
                                        if (typeof ceObj.message === 'string' && ceObj.message.length > 0) {
                                            message = ceObj.message;
                                        } else if (typeof ceObj.error === 'string' && ceObj.error.length > 0) {
                                            message = ceObj.error;
                                        } else if (typeof ceObj.details === 'string' && ceObj.details.length > 0) {
                                            message = ceObj.details;
                                        } else if (Object.keys(ceObj).length === 0) {
                                            message = 'Erro ao capturar pagamento (detalhes indisponíveis)';
                                        } else {
                                            // Last resort: stringify object
                                            try {
                                                message = JSON.stringify(ceObj);
                                            } catch {
                                                message = 'Erro ao capturar pagamento (não foi possível serializar o erro)';
                                            }
                                        }
                                    }
                                    setErrorDetails(message);
                                    // Log a concise, helpful message only (avoid printing empty objects in the console)
                                    const debugMsg = ce && typeof ce === 'object' ? (ce.message || ce.error || ce.details || JSON.stringify(ce)) : message;
                                    console.error('[PayPal] captureError (normalized):', debugMsg);
                                } catch (err) {
                                    console.warn('[PayPal] Erro ao normalizar captureError:', err)
                                    setErrorDetails('Erro ao confirmar pagamento')
                                }
                                // Keep a single place for the final log; since we logged a normalized message above, avoid duplicate logging
                                return
                            }

                            if (pd.order?.status === 'completed' && pd.order?.paymentStatus === 'paid') {
                                clearInterval(checkPaymentStatus)
                                console.log('[PayPal] ✅ Pagamento aprovado via PayPal API! Fechando popup...')
                                paypalWindow.close()
                                clearCart()
                                localStorage.removeItem('appliedCoupon')
                                router.push(`/obrigado?order_id=${dbOrderId}`)
                                return
                            }
                        } else {
                            // If check-order did not return structured JSON, log text and proceed
                            console.error('[PayPal] check-order response not OK or no JSON structure:', paypalCheckResponse.status, responseText)
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
                            localStorage.removeItem('appliedCoupon')
                            router.push(`/obrigado?order_id=${dbOrderId}`)
                        } else if (statusData.status === 'pending') {

                            const paypalCheckResponse = await fetch(`/api/paypal/check-order?orderId=${dbOrderId}`)
                            const responseText = await paypalCheckResponse.text().catch(() => '')
                            let paypalData: unknown = null
                            try {
                                paypalData = responseText ? JSON.parse(responseText) : null
                            } catch (e) {
                                console.warn('[PayPal] check-order (window-close) response not valid JSON:', e, responseText)
                            }

                            if (paypalData) {
                                const pd2 = paypalData as PayPalCheckResponse;
                                if (pd2.captureError) {
                                    const ce = pd2.captureError;
                                    const debugMsg = ce && typeof ce === 'object' ? (ce.message || ce.error || ce.details || JSON.stringify(ce)) : ce;
                                    console.error('[PayPal] captureError on window-close (normalized):', debugMsg)
                                    setError('Erro ao confirmar pagamento. Por favor contate o suporte se o valor foi debitado.')
                                    setIsProcessing(false)
                                    return
                                }

                                if (pd2.order?.status === 'completed' && pd2.order?.paymentStatus === 'paid') {
                                    clearCart()
                                    localStorage.removeItem('appliedCoupon')
                                    router.push(`/obrigado?order_id=${dbOrderId}`)
                                    return
                                }
                            }

                            // Se ainda está pending, avisar usuário
                            console.log('[PayPal] ⚠️ Pedido ainda pendente - usuário pode ter cancelado')
                            setError('Pagamento não foi completado. Se você aprovou, aguarde alguns segundos e verifique seus pedidos.')
                            setIsProcessing(false)
                            setErrorDetails(null)
                        } else {
                            // ❌ Cancelado ou erro
                            setError('Pagamento cancelado ou não foi completado')
                            setIsProcessing(false)
                            setErrorDetails(null)
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
                className="w-full h-12 bg-[#0070ba] hover:bg-[#003087] text-white font-semibold transition-all duration-200 flex items-center justify-center"
                size="lg"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('checkout.processing', 'Processando...')}
                    </>
                ) : (
                    <>
                        <span className="text-center w-full">{t('cart.payWithPayPal', 'Pagar com PayPal')}</span>
                    </>
                )}
            </Button>

            {error && (
                <div className="space-y-2">
                    <p className="text-sm text-red-600 text-center font-medium">{error}</p>
                    {errorDetails && (
                        <p className="text-xs text-gray-500 text-center">{errorDetails}</p>
                    )}
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            onClick={() => {
                                setError('')
                                setErrorDetails(null)
                                if (createdDbOrderId) {
                                    // Retry check-order that will attempt capture again
                                    fetch(`/api/paypal/check-order?orderId=${createdDbOrderId}`).then(res => res.json()).then(json => console.log('Retry check order result', json)).catch(e => console.error(e))
                                } else {
                                    handlePayPalCheckout()
                                }
                            }}
                            className="bg-[#FED466] text-black border-2 border-[#FD9555]"
                            size="sm"
                        >
                            {t('common.retry', 'Tentar novamente')}
                        </Button>
                        <Button
                            onClick={() => {
                                // Scroll to International / Stripe section
                                try {
                                    window.location.hash = '#international-checkout'
                                    const target = document.getElementById('international-checkout')
                                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                } catch (e) {
                                    console.warn('Não foi possível rolar para o checkout internacional', e)
                                }
                            }}
                            className="bg-[#0ea5e9] text-white"
                            size="sm"
                        >
                            {t('cart.payWithCard', 'Pagar com Cartão (Stripe)')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Quick 'report' — open new mail with details prefilled
                                const subject = encodeURIComponent('Erro PayPal: create-order/capture')
                                const body = encodeURIComponent(`User: ${session?.user?.email}\nItems: ${JSON.stringify(items)}\nError: ${error}\nDetails: ${errorDetails || ''}`)
                                window.open(`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'suporte@arafa.com.br'}?subject=${subject}&body=${body}`)
                            }}
                            size="sm"
                        >
                            {t('common.report', 'Reportar')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
