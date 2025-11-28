import { Suspense } from 'react';
import { Clock, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function PagamentoPendenteContent({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; order_id?: string }>;
}) {
  const params = await searchParams;
  // Aceitar tanto orderId quanto order_id (compatibilidade)
  const orderId = params.orderId || params.order_id;

  // Se tiver orderId, verificar o status
  if (orderId) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    // Se o pedido foi aprovado, redirecionar para /obrigado
    if (order && order.status === 'completed') {
      redirect(`/obrigado?order_id=${orderId}`);
    }

    // Se o pedido foi cancelado/rejeitado, redirecionar para página de erro
    if (order && (order.status === 'cancelled' || order.paymentStatus === 'cancelled')) {
      redirect(`/pagamento-falhou?orderId=${orderId}`);
    }
  }

  return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
                    Pagamento Pendente
                </h1>

                {/* Subtitle */}
                <p className="text-lg text-center text-gray-600 mb-8">
                    Seu pedido foi criado com sucesso! Estamos aguardando a confirmação do pagamento.
                </p>

                {/* Info Card */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
                    <div className="flex items-start gap-3 mb-6">
                        <Mail className="w-5 h-5 text-[#FD9555] mt-0.5 flex-shrink-0" />
                        <div>
                            <h2 className="font-semibold text-gray-900 mb-2">
                                Você receberá um e-mail de confirmação
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Assim que o pagamento for confirmado, você receberá um e-mail com:
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#FED466] rounded-full"></span>
                                    Confirmação do pedido
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#FED466] rounded-full"></span>
                                    Links para download dos seus PDFs
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#FED466] rounded-full"></span>
                                    Instruções de acesso
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                            <strong>Importante:</strong> Dependendo do método de pagamento escolhido, a confirmação pode levar alguns minutos.
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
                    <h2 className="font-semibold text-gray-900 mb-6">O que acontece agora?</h2>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-semibold text-sm">
                                    ✓
                                </div>
                                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                            </div>
                            <div className="pb-6">
                                <h3 className="font-medium text-gray-900 mb-1">Pedido criado</h3>
                                <p className="text-sm text-gray-600">
                                    Seu pedido foi registrado com sucesso em nosso sistema.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-semibold text-sm">
                                    2
                                </div>
                                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                            </div>
                            <div className="pb-6">
                                <h3 className="font-medium text-gray-900 mb-1">Aguardando confirmação</h3>
                                <p className="text-sm text-gray-600">
                                    Estamos aguardando a confirmação do pagamento pela operadora.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-semibold text-sm">
                                    3
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 mb-1">Pagamento confirmado</h3>
                                <p className="text-sm text-gray-600">
                                    Você receberá um e-mail com os links para download dos seus PDFs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href={orderId ? `/pagamento-pendente?orderId=${orderId}` : '/pagamento-pendente'}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-medium rounded-lg transition-colors"
                    >
                        Verificar Status
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg border border-gray-300 transition-colors"
                    >
                        Voltar para a Página Inicial
                    </Link>
                </div>

                {/* Secondary Actions */}
                <div className="flex justify-center mt-4">
                    <Link
                        href="/produtos"
                        className="text-sm text-gray-600 hover:text-[#FD9555] transition-colors"
                    >
                        Ver Outros Produtos
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
    );
}

export default async function PagamentoPendentePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PagamentoPendenteContent searchParams={searchParams} />
    </Suspense>
  );
}