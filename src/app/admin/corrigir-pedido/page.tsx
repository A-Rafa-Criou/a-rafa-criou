'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OrderAnalysis {
    orderId: string
    email: string
    orderDate: string
    totalPaid: number
    totalCorrect: number
    refundAmount: number
    currency: string
    items: Array<{
        name: string
        quantity: number
        pricePaid: number
        priceCorrect: number
        totalDifference: number
        promotion?: { name: string; discount: string }
    }>
}

export default function FixOrderPricePage() {
    const [orderId, setOrderId] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<OrderAnalysis | null>(null)
    const [error, setError] = useState('')

    const analyzeOrder = async () => {
        setLoading(true)
        setError('')
        setResult(null)

        try {
            const response = await fetch('/api/admin/fix-order-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action: 'calculate' })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao analisar pedido')
                return
            }

            setResult(data)
        } catch (err) {
            setError('Erro de conexão: ' + err)
        } finally {
            setLoading(false)
        }
    }

    const addCredit = async () => {
        if (!confirm('Confirma adicionar crédito para este cliente?')) return

        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/admin/fix-order-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action: 'credit' })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Erro ao adicionar crédito')
                return
            }

            alert(data.message)
            setResult(data)
        } catch (err) {
            setError('Erro de conexão: ' + err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <Card>
                <CardHeader>
                    <CardTitle>🔧 Corrigir Preços de Pedidos</CardTitle>
                    <CardDescription>
                        Ferramenta para corrigir pedidos que foram cobrados sem promoção
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="ID do Pedido"
                            value={orderId}
                            onChange={e => setOrderId(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={analyzeOrder} disabled={loading || !orderId}>
                            {loading ? 'Analisando...' : 'Analisar'}
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {result && (
                        <div className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>📊 Resultado da Análise</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Email</p>
                                            <p className="font-medium">{result.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Data</p>
                                            <p className="font-medium">
                                                {new Date(result.orderDate).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Total Pago</p>
                                            <p className="font-medium">
                                                {result.currency} {result.totalPaid.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Total Correto</p>
                                            <p className="font-medium text-green-600">
                                                {result.currency} {result.totalCorrect.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {result.refundAmount > 0.01 && (
                                        <Alert>
                                            <AlertDescription className="text-lg font-bold">
                                                💰 Reembolso necessário: {result.currency}{' '}
                                                {result.refundAmount.toFixed(2)}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {result.refundAmount <= 0.01 && (
                                        <Alert>
                                            <AlertDescription>
                                                ✅ Preço correto! Nenhum reembolso necessário.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2">Itens do Pedido:</h4>
                                        <div className="space-y-2">
                                            {result.items.map((item, i: number) => (
                                                <div
                                                    key={i}
                                                    className="p-3 border rounded-lg bg-gray-50"
                                                >
                                                    <p className="font-medium">{item.name}</p>
                                                    <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                                                        <p>
                                                            Qtd: {item.quantity} | Pago:{' '}
                                                            {item.pricePaid.toFixed(2)}
                                                        </p>
                                                        <p>
                                                            Correto: {item.priceCorrect.toFixed(2)}
                                                        </p>
                                                        {item.totalDifference > 0.01 && (
                                                            <p className="col-span-2 text-red-600 font-medium">
                                                                Diferença: {result.currency}{' '}
                                                                {item.totalDifference.toFixed(2)}
                                                            </p>
                                                        )}
                                                        {item.promotion && (
                                                            <p className="col-span-2 text-blue-600 text-xs">
                                                                Promoção: {item.promotion.name} (-
                                                                {item.promotion.discount})
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {result.refundAmount > 0.01 && (
                                        <div className="flex gap-2 mt-4">
                                            <Button onClick={addCredit} disabled={loading}>
                                                💳 Adicionar Crédito
                                            </Button>
                                            <Button variant="outline" disabled>
                                                ↩️ Reembolso PayPal (Manual)
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
