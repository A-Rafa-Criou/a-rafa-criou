'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Mail, Shield } from 'lucide-react'
import { PaymentMethods } from '@/components/icons/PaymentIcon'

export function Footer() {
    return (
        <footer className="bg-gradient-to-br from-[#FD9555] to-[#FED466] text-white mt-auto pb-5 lg:pb-0">
            <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-8">
                    {/* Logo e Descrição */}
                    <div className="flex flex-col items-center lg:items-start">
                        <Link href="/" className="mb-6 lg:mb-6 w-full max-w-[280px] lg:max-w-[220px]">
                            <Image
                                src="/logo.webp"
                                alt="A Rafa Criou"
                                width={280}
                                height={93}
                                className="h-auto w-full"
                                priority
                            />
                        </Link>
                        <p className="text-white/90 text-sm text-center lg:text-left max-w-xs hidden lg:block">
                            Produtos digitais criativos e exclusivos para você.
                        </p>
                    </div>

                    {/* Mobile: Botões em Coluna única / Desktop: Grid 3 colunas */}
                    <div className="lg:hidden flex flex-col gap-3">
                        <Link
                            href="/sobre"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            Sobre
                        </Link>
                        <Link
                            href="/direitos-autorais"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            Direitos Autorais
                        </Link>
                        <Link
                            href="/trocas-devolucoes"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            Troca, Devolução e Reembolso
                        </Link>
                        <Link
                            href="/contato"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            Contato
                        </Link>
                    </div>

                    {/* Desktop: Links Importantes */}
                    <div className="hidden lg:flex flex-col items-start">
                        <h3 className="font-bold text-lg mb-4 uppercase tracking-wide">Institucional</h3>
                        <nav className="flex flex-col space-y-2 text-left">
                            <Link
                                href="/sobre"
                                className="text-white/90 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide"
                            >
                                Sobre
                            </Link>
                            <Link
                                href="/direitos-autorais"
                                className="text-white/90 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide"
                            >
                                Direitos Autorais
                            </Link>
                            <Link
                                href="/trocas-devolucoes"
                                className="text-white/90 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide"
                            >
                                Trocas e Reembolsos
                            </Link>
                            <Link
                                href="/privacidade"
                                className="text-white/90 hover:text-white transition-colors text-sm font-medium uppercase tracking-wide"
                            >
                                Privacidade
                            </Link>
                        </nav>
                    </div>

                    {/* Desktop: Contato */}
                    <div className="hidden lg:flex flex-col items-start">
                        <h3 className="font-bold text-lg mb-4 uppercase tracking-wide">Contato</h3>
                        <Link
                            href="/contato"
                            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-6 py-3.5 transition-all hover:scale-105 border border-white/30 shadow-lg"
                        >
                            <Mail className="w-5 h-5" />
                            <span className="font-bold text-base uppercase tracking-wide">Fale Conosco</span>
                        </Link>
                    </div>

                    {/* Pagamentos e Segurança */}
                    <div className="flex flex-col items-center lg:items-start">
                        <h3 className="font-bold text-gray-900 text-xl lg:text-lg mb-2 uppercase tracking-wide">Pagamento Seguro</h3>

                        {/* Métodos de Pagamento */}
                        <div className="mb-4 w-full">
                            <p className="text-sm text-gray-700 mb-3 text-center lg:text-left font-bold uppercase tracking-wide">Aceitamos:</p>
                            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] lg:max-w-none mx-auto lg:mx-0">
                                <PaymentMethods
                                    className="contents"
                                    iconSize="large"
                                />
                            </div>
                        </div>

                        {/* Selo de Segurança */}
                        <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-lg px-4 py-3.5 w-60 lg:w-auto border border-white/20 shadow-lg">
                            <Shield className="w-7 h-7 text-green-300 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Site Seguro</p>
                                <p className="text-xs text-gray-900">Criptografia SSL 256-bit</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linha divisória */}
                <div className="border-t border-white/30 mt-8 lg:mt-10 pt-6">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 text-sm">
                        <p className="text-gray-900 text-center lg:text-left font-medium ">
                            © {new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.
                        </p>
                        <a
                            href="https://dev-eduardo-phi.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-900  text-base lg:text-sm tracking-wide hover:scale-105 transition-all"
                        >
                            Desenvolvido por <span className="font-bold uppercase ">Eduardo Sodré</span>
                        </a>

                    </div>
                </div>
            </div>
        </footer>
    )
}
