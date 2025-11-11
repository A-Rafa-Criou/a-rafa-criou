'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'

export default function DireitosAutoraisPage() {
    const { t } = useTranslation('common')

    return (
        <div className="min-h-screen bg-[#F4F4F4]">
            {/* Banner com margem e border-radius */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
                <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FFE5A0] to-[#F8D882]">
                    <Image
                        src="/banner_Direitos-Autorais_Trocas_e_Devolucao.webp"
                        alt={t('copyright.bannerAlt', 'Banner Direitos Autorais')}
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* Título sobre o banner */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <h1 className="font-Scripter text-white font-bold uppercase text-center leading-none text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                            {t('copyright.title', 'Direitos Autorais')}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-6 md:py-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12">

                    {/* Aviso Legal */}
                    <div className="space-y-6 sm:space-y-8">

                        {/* Lei Federal */}
                        <div className="bg-gradient-to-r from-[#FD9555] to-[#FED466] rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">⚖️</span>
                                <div>
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
                                        {t('copyright.federalLaw.title', 'Lei Federal de Direitos Autorais')}
                                    </h2>
                                    <p className="text-white text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('copyright.federalLaw.description', 'A Rafa Criou está garantida por Lei Federal de Direitos Autorais (Lei nº 9.610, 02/1998). O que cobre a possibilidade de publicações de marcas, artes e qualquer material criado pela loja sem a necessidade de aviso prévio. Através da mesma lei, caracteriza-se como crime a cópia, e/ou divulgação total ou parcial de materiais elaborados pela loja sem a autorização para uso comercial.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Uso Proibido */}
                        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">🚫</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-red-900 mb-3">
                                        {t('copyright.prohibited.title', 'Uso Proibido')}
                                    </h3>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('copyright.prohibited.description', 'Não é permitido distribuir, doar, repassar, revender, sub-licenciar ou compartilhar qualquer nossos produtos originais ou alterados em forma digital.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Declaração sobre JW.ORG */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">ℹ️</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 mb-3">
                                        {t('copyright.declaration.title', 'Declaração Importante')}
                                    </h3>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed mb-4">
                                        {t('copyright.declaration.description1', 'A Rafa Criou NÃO UTILIZA de forma alguma qualquer material da associação Watchtower, que possui seu domínio JW.ORG sendo nossos arquivos principalmente imagens 100% autorais ou utilizadas IA para obtê-las.')}
                                    </p>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('copyright.declaration.description2', 'Temos total ciência que utilizar qualquer material da associação é errado e um crime.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pirataria é Crime */}
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                            <div className="flex flex-col items-center space-y-4">
                                <span className="text-4xl sm:text-5xl">⚠️</span>
                                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                                    {t('copyright.piracy.title', 'Pirataria é Crime!')}
                                </h3>
                                <p className="text-gray-200 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl">
                                    {t('copyright.piracy.description', 'E não concordamos com tais atos.')}
                                </p>
                            </div>
                        </div>

                        {/* Aviso Legal Final */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">⚖️</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-amber-900 mb-3">
                                        {t('copyright.legal.title', 'Aviso Legal')}
                                    </h3>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('copyright.legal.description', 'No caso de acusação a loja no cometimento de crimes contra a associação Watchtower, sua mensagem pode e será usada como prova judicial para danos morais que envolverão a lei de crimes contra honra: calúnia, difamação ou injúria.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    )
}
