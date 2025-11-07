import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'Trocas, Devoluções e Reembolsos - A Rafa Criou',
    description: 'Política de trocas, devoluções e reembolsos para produtos digitais.',
}

export default function TrocasDevolucoesPage() {
    return (
        <div className="min-h-screen bg-[#F4F4F4]">
            {/* Banner com margem e border-radius */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
                <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FFE5A0] to-[#F8D882]">
                    <Image
                        src="/banner_Direitos-Autorais_Trocas_e_Devolucao.webp"
                        alt="Banner Trocas, Reembolsos e Devoluções"
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* Título sobre o banner */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <h1
                            className="font-scripter font-bold uppercase text-center leading-none"
                            style={{
                                color: '#FFFFFF',
                                fontSize: 'clamp(1.5rem, 4vw, 3.5rem)',
                                fontFamily: 'Scripter, sans-serif',
                            }}
                        >
                            TROCAS, REEMBOLSOS <br /> E DEVOLUÇÕES
                        </h1>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-6 md:py-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12">

                    {/* Aviso Principal */}
                    <div className="bg-gradient-to-r from-[#FD9555] to-[#FED466] rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-8 sm:mb-10">
                        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                            <div className="text-4xl sm:text-5xl md:text-6xl">⚠️</div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                                IMPORTANTE
                            </h2>
                            <p className="text-white text-sm sm:text-base md:text-lg leading-relaxed font-medium max-w-3xl">
                                Após a compra e confirmação de pagamento, <strong>NÃO É POSSÍVEL CANCELAMENTO COM REEMBOLSO.</strong>
                            </p>
                        </div>
                    </div>

                    {/* Informação sobre Direito de Arrependimento */}
                    <div className="mb-8 sm:mb-10 space-y-4 sm:space-y-6">
                        <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                            O <strong>Prazo de Reflexão</strong>, conhecido também como <strong>Direito de Arrependimento</strong>, previsto no <strong>Artigo 49 da Lei 8.078/1990 (CDC)</strong> e no <strong>Decreto Presidencial 7.962/2013</strong>, <span className="text-[#FD9555] font-bold">não se aplica a produtos digitais</span> bem como o mesmo cabe a compras feitas por engano.
                        </p>

                        <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                            <strong>Não é feito o reembolso de produtos digitais</strong>, pois, não existe a devolução real do produto. O mesmo é equivalente para trocas.
                        </p>
                    </div>

                    {/* Observação Final */}
                    <div className="bg-gradient-to-br from-[#FED466] to-[#FED466]/80 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 mb-8 sm:mb-10 border-2 border-[#FD9555]/20">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <span className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">📋</span>
                            <p className="text-gray-900 text-sm sm:text-base md:text-lg leading-relaxed">
                                <strong>Observação:</strong> Nós da <strong>A Rafa Criou</strong> nos damos o direito de recusar qualquer serviço ou pedido dependendo de situações ou circunstâncias.
                            </p>
                        </div>
                    </div>

                    {/* Contato */}
                    <div className="bg-gradient-to-r from-[#FD9555] to-[#FED466] rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center">
                        <div className="flex flex-col items-center space-y-4 sm:space-y-5">
                            <div className="text-4xl sm:text-5xl">💬</div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                                Dúvidas?
                            </h3>
                            <p className="text-white text-sm sm:text-base md:text-lg font-medium">
                                Entre em contato conosco
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mt-4">
                                <a
                                    href="https://wa.me/5511998274504"
                                    className="w-full sm:w-auto bg-white text-[#FD9555] hover:bg-gray-100 font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-full transition-all transform hover:scale-105 text-sm sm:text-base shadow-lg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    📱 WhatsApp: (11) 99827-4504
                                </a>

                                <a
                                    href="mailto:arafacriou@gmail.com"
                                    className="w-full sm:w-auto bg-white text-[#FD9555] hover:bg-gray-100 font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-full transition-all transform hover:scale-105 text-sm sm:text-base shadow-lg"
                                >
                                    📧 arafacriou@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
