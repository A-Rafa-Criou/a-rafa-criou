'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

/**
 * Página de redirecionamento automático após pagamento
 * Acesse: /pago para ver seu último pedido
 */
export default function PagoRedirectPage() {
    const router = useRouter()
    const { status } = useSession()

    useEffect(() => {
        if (status === 'loading') return

        if (status === 'unauthenticated') {
            // Não autenticado - redirecionar para login
            router.push('/auth/login?callbackUrl=/pago')
            return
        }

        // Autenticado - buscar último pedido do usuário
        const fetchLastOrder = async () => {
            try {
                const response = await fetch('/api/orders/my-orders?limit=1')
                if (response.ok) {
                    const orders = await response.json()

                    if (orders.length > 0) {
                        const lastOrder = orders[0]

                        // Se tem payment ID, redireciona para /obrigado
                        if (lastOrder.paymentId) {
                            router.push(`/obrigado?payment_id=${lastOrder.paymentId}`)
                        } else {
                            // Senão, vai para a página do pedido
                            router.push(`/conta/pedidos/${lastOrder.id}`)
                        }
                    } else {
                        // Sem pedidos, vai para a home
                        router.push('/')
                    }
                } else {
                    // Erro ao buscar pedidos, vai para meus pedidos
                    router.push('/conta/pedidos')
                }
            } catch (error) {
                console.error('Erro ao buscar último pedido:', error)
                router.push('/conta/pedidos')
            }
        }

        fetchLastOrder()
    }, [status, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#FED466] mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {status === 'loading' ? 'Carregando...' : 'Buscando seu pedido...'}
                </h2>
                <p className="text-gray-600 text-sm">
                    Aguarde enquanto redirecionamos você
                </p>
            </div>
        </div>
    )
}
