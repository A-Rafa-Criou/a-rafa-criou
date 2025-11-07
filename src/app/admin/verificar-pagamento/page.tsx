'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface VerificationResult {
  success: boolean
  updated: boolean
  mercadoPago?: {
    id: string
    status: string
    status_detail: string
  }
  database?: {
    orderId: string
    status: string
    paymentStatus: string
  }
}

export default function VerificarPagamentoPage() {
  const [paymentId, setPaymentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verificar = async () => {
    if (!paymentId) {
      setError('Digite o Payment ID')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/mercado-pago/check-payment?paymentId=${paymentId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao verificar pagamento')
        return
      }

      setResult(data)
    } catch (err) {
      setError((err as Error).message || 'Erro ao verificar pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Verificar Pagamento Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Payment ID (Mercado Pago)</label>
            <Input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Ex: 132829616314"
              className="mb-2"
            />
            <p className="text-xs text-gray-500">
              Encontre o Payment ID nos logs do servidor ou na URL do Mercado Pago
            </p>
          </div>

          <Button
            onClick={verificar}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Pagamento'
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Verificação Concluída</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Status Mercado Pago:</span>
                  <span className="font-medium">{result.mercadoPago?.status}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Status Detalhe:</span>
                  <span className="font-medium">{result.mercadoPago?.status_detail}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Status no Banco:</span>
                  <span className="font-medium">{result.database?.status}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-600">Status Pagamento:</span>
                  <span className="font-medium">{result.database?.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Atualizado:</span>
                  <span className="font-medium">{result.updated ? 'Sim ✅' : 'Não (já estava atualizado)'}</span>
                </div>
              </div>

              {result.updated && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-green-700">
                    ✅ Pedido atualizado com sucesso! Acesse <Link href="/conta/pedidos" className="underline font-medium">Meus Pedidos</Link> para fazer o download.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Payment IDs recentes dos logs:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• 132829616314</li>
              <li>• 132829556790</li>
              <li>• 132826942242</li>
              <li>• 132825965116</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              Tente cada um para encontrar seu pagamento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
