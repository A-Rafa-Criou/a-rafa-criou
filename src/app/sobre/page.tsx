'use client'

import { useTranslation } from 'react-i18next'
// import Image from 'next/image' // Descomentar quando receber o banner

export default function SobrePage() {
    const { t } = useTranslation('common')

    return (
        <div className="min-h-screen bg-[#F4F4F4]">
            {/* Banner com margem e border-radius */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto pt-6 md:pt-8">
                <div className="relative w-full aspect-[16/6] md:aspect-[16/5] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#FFE5A0] to-[#F8D882]">
                    {/* Placeholder para banner - substituir quando receber a imagem */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FED466] to-[#FD9555]">
                        {/* Quando receber o banner, substituir por:
                        <Image
                            src="/banner_sobre.webp"
                            alt={t('about.bannerAlt', 'Banner Sobre A Rafa Criou')}
                            fill
                            className="object-cover"
                            priority
                        />
                        */}
                    </div>

                    {/* Título sobre o banner */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <h1 className="font-Scripter text-white font-bold uppercase text-center leading-none text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                            {t('about.title', 'SOBRE NÓS')}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="w-full px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto py-6 md:py-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12">

                    <div className="space-y-6 sm:space-y-8">

                        {/* Quem Somos */}
                        <div className="bg-gradient-to-r from-[#FED466] to-[#FD9555] rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">🏪</span>
                                <div>
                                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                                        {t('about.whoWeAre.title', 'Quem Somos')}
                                    </h2>
                                    <p className="text-white text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('about.whoWeAre.description', 'Somos uma loja 100% online que desenvolve arquivos digitais teocráticos para serem impressos e usados para uso particular.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Nosso Objetivo */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">🎯</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 mb-4">
                                        {t('about.objective.title', 'Nosso Objetivo')}
                                    </h3>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('about.objective.description', 'Nosso objetivo é proporcionar arquivos de qualidade para você presentear aos parentes, irmãos e amigos e com muito amor com arquivos de base bíblica.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Nossa História */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">📖</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 mb-4">
                                        {t('about.story.title', 'Nossa História')}
                                    </h3>
                                    <div className="space-y-4">
                                        <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                            {t('about.story.description1', 'Em outubro de 2023, começamos a fazer nossos primeiros arquivos digitais. A ideia veio como um hobbie e sem nenhuma experiência e aos poucos nosso trabalho foi evoluindo.')}
                                        </p>
                                        <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                            {t('about.story.description2', 'Estudamos formas de melhorar e hoje já trabalhamos de maneira profissional.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Nossos Produtos */}
                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <span className="text-3xl sm:text-4xl flex-shrink-0">🎁</span>
                                <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-pink-900 mb-4">
                                        {t('about.products.title', 'Nossos Produtos')}
                                    </h3>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed mb-4">
                                        {t('about.products.description1', 'Temos arquivos para várias ocasiões.')}
                                    </p>
                                    <p className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed">
                                        {t('about.products.description2', 'Com muito amor fazemos nosso trabalho para presentear em qualquer ocasião e queremos que nossas lembrancinhas sejam recebidas e guardadas com muito amor, tanto por quem recebeu quanto por quem presenteou.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Assinatura */}
                        <div className="bg-gradient-to-r from-[#FD9555] to-[#FED466] rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                            <div className="flex flex-col items-center space-y-4">
                                <span className="text-4xl sm:text-5xl">💐</span>
                                <div>
                                    <p className="text-white text-base sm:text-lg md:text-xl mb-2 italic">
                                        {t('about.signature.regards', 'Atenciosamente,')}
                                    </p>
                                    <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold font-Scripter">
                                        {t('about.signature.name', 'Rafaela Pereira')}
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
