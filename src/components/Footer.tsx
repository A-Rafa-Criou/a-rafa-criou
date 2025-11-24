'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { PaymentMethods } from '@/components/icons/PaymentIcon'
import { useTranslation } from 'react-i18next'

export function Footer() {
    const { t } = useTranslation('common')

    return (
        <footer className="bg-gradient-to-br from-[#FD9555] to-[#FED466] text-white mt-auto pb-5 lg:pb-0">
            <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8">
                    {/* Logo e Descrição */}
                    <div className="flex flex-col items-center lg:items-start">
                        <Link href="/" className="mb-4 lg:mb-6 w-full max-w-[280px] lg:max-w-[220px]">
                            <Image
                                src="/logo.webp"
                                alt={t('a11y.logoAlt')}
                                width={280}
                                height={93}
                                style={{ width: '100%', height: 'auto' }}
                                priority
                            />
                        </Link>
                        <p className="text-gray-700 text-sm text-center lg:text-left max-w-xs hidden lg:block">
                            {t('footer.description')}
                        </p>
                    </div>

                    {/* Mobile: Botões em Coluna única / Desktop: Grid 3 colunas */}
                    <div className="lg:hidden flex flex-col gap-3">
                        <h3 className='flex items-center justify-center font-bold text-lg mb-2 uppercase tracking-wide text-gray-900'>
                            {t('footer.institutional')}
                        </h3>
                        <Link
                            href="/sobre"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            {t('footer.about')}
                        </Link>
                        <Link
                            href="/direitos-autorais"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            {t('footer.copyrights')}
                        </Link>
                        <Link
                            href="/trocas-devolucoes"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            {t('footer.returns')}
                        </Link>
                        <Link
                            href="/contato"
                            className="w-full bg-white text-gray-900 hover:bg-white/90 transition-all py-4 px-6 rounded-full text-center font-bold text-base uppercase tracking-wide shadow-lg"
                        >
                            {t('footer.contact')}
                        </Link>
                    </div>

                    {/* Desktop: Links Importantes */}
                    <div className="hidden lg:flex flex-col items-start">
                        <h3 className="font-bold text-xl mb-4 uppercase tracking-wide text-gray-900">
                            {t('footer.institutional')}
                        </h3>
                        <nav className="flex flex-col space-y-2.5 text-left">
                            <Link
                                href="/sobre"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.about')}
                            </Link>
                            <Link
                                href="/direitos-autorais"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.copyrights')}
                            </Link>
                            <Link
                                href="/trocas-devolucoes"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.returns')}
                            </Link>
                            <Link
                                href="/contato"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.contact')}
                            </Link>
                            <Link
                                href="/privacidade"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.privacy')}
                            </Link>
                            <Link
                                href="/perguntas-frequentes"
                                className="text-gray-700 hover:text-gray-900 transition-colors text-base font-medium uppercase tracking-wide"
                            >
                                {t('footer.faq')}
                            </Link>
                        </nav>
                    </div>

                    {/* Desktop: Contato - REMOVIDO, agora está em Institucional */}

                    {/* Pagamentos e Segurança */}
                    <div className="flex flex-col items-center lg:items-start">
                        <h3 className="font-bold text-gray-900 text-xl lg:text-lg mb-2 uppercase tracking-wide">
                            {t('footer.securePayment')}
                        </h3>

                        {/* Métodos de Pagamento */}
                        <div className="mb-4 w-full">
                            <p className="text-sm text-gray-700 mb-3 text-center lg:text-left font-bold uppercase tracking-wide">
                                {t('footer.weAccept')}
                            </p>
                            <div className="flex flex-wrap justify-center gap-4 w-full max-w-[340px] mx-auto lg:mx-0">
                                <PaymentMethods
                                    className="flex gap-4 justify-center items-center w-full"
                                    iconSize="large"
                                />
                            </div>
                        </div>

                        {/* Selo de Segurança */}
                        <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-lg px-4 py-3.5 w-60 lg:w-auto border border-white/20 shadow-lg">
                            <Shield className="w-7 h-7 text-green-300 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">{t('footer.secureIcon')}</p>
                                <p className="text-xs text-gray-900">{t('footer.sslEncryption')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linha divisória */}
                <div className="border-t border-white/30 mt-8 lg:mt-10 pt-6">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 text-sm">
                        <p className="text-gray-900 text-center lg:text-left font-medium ">
                            © {new Date().getFullYear()} {t('footer.copyright')}
                        </p>
                        <a
                            href="https://dev-eduardo-phi.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-900  text-base lg:text-sm tracking-wide hover:scale-105 transition-all"
                        >
                            {t('footer.developedBy')} <span className="font-bold uppercase ">{t('footer.developer')}</span>
                        </a>

                    </div>
                </div>
            </div>
        </footer>
    )
}
