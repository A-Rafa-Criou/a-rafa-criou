'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Home, Search, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FED466]/20 via-[#F4F4F4] to-[#FD9555]/20 flex items-center justify-center px-4 py-12">
            <div className="max-w-4xl w-full">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        {/* Lado Esquerdo - Imagem/Ilustração */}
                        <div className="relative h-64 md:h-full min-h-[400px] bg-gradient-to-br from-[#FED466] to-[#FD9555] flex items-center justify-center p-8">
                            <div className="text-center space-y-4">
                                {/* Mascote ou Número 404 */}
                                <div className="relative w-48 h-48 mx-auto">
                                    <Image
                                        src="/mascote_raquel2.webp"
                                        alt="Mascote A Rafa Criou"
                                        fill
                                        className="object-contain drop-shadow-2xl"
                                        priority
                                    />
                                </div>

                                {/* Número 404 estilizado */}
                                <div className="text-white">
                                    <h1 className="text-8xl md:text-9xl font-bold opacity-90 drop-shadow-lg">
                                        404
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {/* Lado Direito - Conteúdo */}
                        <div className="p-8 md:p-12 space-y-6">
                            <div className="space-y-3">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                                    Ops! Página não encontrada
                                </h2>
                                <p className="text-gray-600 text-lg leading-relaxed">
                                    A página que você está procurando não existe ou foi movida.
                                    Mas não se preocupe, temos muitas outras coisas incríveis para você!
                                </p>
                            </div>

                            {/* Sugestões de ações */}
                            <div className="space-y-3 pt-4">
                                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    O que você pode fazer:
                                </p>

                                <div className="grid gap-3">
                                    <Link href="/">
                                        <Button
                                            className="w-full bg-gradient-to-r from-[#FD9555] to-[#FED466] hover:from-[#FD9555]/90 hover:to-[#FED466]/90 text-white font-bold py-6 text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                        >
                                            <Home className="w-5 h-5 mr-2" />
                                            Voltar para a Página Inicial
                                        </Button>
                                    </Link>

                                    <Link href="/produtos">
                                        <Button
                                            variant="outline"
                                            className="w-full border-2 bg-amber-300 border-[#FD9555] text-[#FD9555] hover:bg-[#FD9555]  font-bold py-6 text-base transition-all cursor-pointer"
                                        >
                                            <ShoppingBag className="w-5 h-5 mr-2" />
                                            Ver Todos os Produtos
                                        </Button>
                                    </Link>

                                    <Link href="/contato">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-gray-700 hover:text-[#FD9555] hover:bg-[#FED466]/10 font-bold py-6 text-base transition-all cursor-pointer"
                                        >
                                            <Search className="w-5 h-5 mr-2" />
                                            Precisa de Ajuda? Entre em Contato
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Link "Voltar" */}
                            <div className="pt-6 border-t">
                                <button
                                    onClick={() => window.history.back()}
                                    className="flex items-center gap-2 text-gray-600 hover:text-[#FD9555] transition-colors font-medium cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar para a página anterior
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mensagem adicional */}
                <div className="text-center mt-8 px-4">
                    <p className="text-gray-600 text-sm">
                        Se você acredita que isso é um erro, por favor{' '}
                        <Link href="/contato" className="text-[#FD9555] hover:underline font-semibold">
                            entre em contato conosco
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    )
}
