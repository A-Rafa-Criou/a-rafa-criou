import { Suspense } from 'react';
import { XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PagamentoFalhouPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Pagamento Não Aprovado
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-center text-gray-600 mb-8">
            Infelizmente, não foi possível processar seu pagamento.
          </p>

          {/* Info Card */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">
                  Possíveis motivos:
                </h2>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Saldo insuficiente no cartão</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Dados do cartão incorretos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Cartão vencido ou bloqueado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Limite de crédito excedido</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Recusa pela operadora do cartão</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">O que fazer agora?</h3>
                    <p className="text-sm text-blue-800">
                      Verifique os dados do seu cartão, entre em contato com seu banco se necessário, 
                      ou tente usar outro método de pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/carrinho"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-medium rounded-lg transition-colors"
            >
              Tentar Novamente
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg border border-gray-300 transition-colors"
            >
              Voltar para a Página Inicial
            </Link>
          </div>

          {/* Help */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              Precisa de ajuda?{' '}
              <Link href="/contato" className="text-[#FD9555] hover:underline font-medium">
                Entre em contato conosco
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
