'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/cart-context'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'

interface MercadoPagoCardCheckoutProps {
    appliedCoupon: {
        code: string
        discount: number
        type: string
        value: string
    } | null
    finalTotal: number
}

export function MercadoPagoCardCheckout({
    appliedCoupon,
    finalTotal,
}: MercadoPagoCardCheckoutProps) {
    const { items, clearCart } = useCart()
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)

    const handleMercadoPagoCardCheckout = async () => {
        // ✅ Verificar se está autenticado
        if (!session) {
            // Salvar o carrinho no localStorage antes de redirecionar
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('redirectAfterLogin', '/carrinho')
            }
            // Redirecionar para login
            window.location.href = '/auth/login?callbackUrl=/carrinho'
            return
        }

        if (finalTotal <= 0) {
            alert('O total do carrinho é inválido.')
            return
        }

        if (items.length === 0) {
            alert('Seu carrinho está vazio')
            return
        }

        setIsLoading(true)

        try {
            console.log('[Mercado Pago Card] 🚀 Iniciando pagamento...')
            console.log('[Mercado Pago Card] Items:', items.length)
            console.log('[Mercado Pago Card] Total:', finalTotal)
            
            // 1. Criar preferência de pagamento no Mercado Pago
            const response = await fetch('/api/mercado-pago/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        productId: item.productId,
                        variationId: item.variationId || null,
                        quantity: item.quantity,
                    })),
                    userId: (session?.user as { id?: string })?.id || null,
                    email: (session?.user?.email as string) || '',
                    couponCode: appliedCoupon?.code || null,
                    discount: appliedCoupon?.discount || 0,
                }),
            })

            console.log('[Mercado Pago Card] Response status:', response.status)

            if (!response.ok) {
                const error = await response.json()
                console.error('[Mercado Pago Card] ❌ Erro na resposta:', error)
                throw new Error(error.error || 'Erro ao criar preferência de pagamento')
            }

            const data = await response.json()
            console.log('[Mercado Pago Card] ✅ Preferência criada:', data)

            const { preferenceId, orderId } = data

            if (!preferenceId) {
                throw new Error('PreferenceId não retornado pela API')
            }

            console.log('[Mercado Pago Card] 📦 Order ID no banco:', orderId)
            console.log('[Mercado Pago Card] 🔗 Preference ID:', preferenceId)

            // 2. Redirecionar para Mercado Pago
            const mpUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`
            
            console.log('[Mercado Pago Card] 🌐 Redirecionando para:', mpUrl)

            // Limpar carrinho e redirecionar
            clearCart()
            window.location.href = mpUrl
        } catch (error) {
            console.error('[Mercado Pago Card] Erro:', error)
            alert(
                error instanceof Error
                    ? error.message
                    : 'Erro ao processar pagamento com Mercado Pago'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handleMercadoPagoCardCheckout}
            disabled={isLoading || items.length === 0 || finalTotal <= 0}
            className="w-full h-12 bg-[#009EE3] hover:bg-[#0084C2] text-white font-semibold border-2 border-[#009EE3] hover:border-[#0084C2] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                </>
            ) : (
                <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar com Cartão (Mercado Pago)
                </>
            )}
        </Button>
    )
}
