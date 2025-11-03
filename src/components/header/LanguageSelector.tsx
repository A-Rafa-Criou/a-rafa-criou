"use client"

import { useCallback, useEffect } from 'react'
import { changeLanguage } from '@/lib/i18n'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/contexts/currency-context'

interface LanguageSelectorProps {
    selectedLanguage: string
    setSelectedLanguage: (language: string) => void
    isScrolled: boolean
}

// Map button labels to locale codes used in our locale files
const LOCALE_MAP: Record<string, string> = {
    Portuguese: 'pt',
    English: 'en',
    Spanish: 'es',
}

export function LanguageSelector({ selectedLanguage, setSelectedLanguage, isScrolled }: LanguageSelectorProps) {
    const { t } = useTranslation('common')
    const { syncCurrencyWithLocale } = useCurrency()

    useEffect(() => {
        // On mount, restore user locale from cookie or localStorage
        const getCookie = (name: string) => {
            if (typeof document === 'undefined') return null
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
            return match ? decodeURIComponent(match[2]) : null
        }

        const stored = getCookie('NEXT_LOCALE') ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('NEXT_LOCALE') : null) ||
            'pt'

        if (stored && ['pt', 'en', 'es'].includes(stored)) {
            changeLanguage(stored).catch(() => { })
            const label = Object.keys(LOCALE_MAP).find((k) => LOCALE_MAP[k] === stored)
            if (label) setSelectedLanguage(label)
        }
    }, [setSelectedLanguage])

    const changeLocale = useCallback(async (label: string) => {
        const locale = LOCALE_MAP[label] || 'pt'
        setSelectedLanguage(label)

        // Save preference
        try {
            localStorage.setItem('NEXT_LOCALE', locale)
            document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
        } catch { }

        // Sincronizar moeda com idioma (pt=BRL, en=USD, es=EUR)
        syncCurrencyWithLocale(locale)

        // Change language instantly (NO PAGE RELOAD)
        try {
            await changeLanguage(locale)

            // Optionally call the API to set server-side cookie
            fetch('/api/set-locale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ locale })
            }).catch(() => { }) // Silent fail, cookie already set client-side
        } catch (error) {
            console.error('[LanguageSelector] Failed to change language:', error)
        }
    }, [setSelectedLanguage, syncCurrencyWithLocale])

    return (
        <div className={`bg-[#FED466] transition-all duration-500 ease-in-out overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
            <div className="container mx-auto px-2 sm:px-4 flex justify-center items-center py-2 sm:py-3">
                <span className="text-black font-medium mr-3 sm:mr-4 text-xs sm:text-sm">{t('selectLanguage', 'Selecione seu idioma')}</span>
                <div className="flex bg-white/30 rounded-full p-1 backdrop-blur-sm border border-white/20 shadow-sm">
                    <button
                        onClick={() => changeLocale('Portuguese')}
                        className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 min-w-[56px] sm:min-w-[64px] cursor-pointer ${selectedLanguage === 'Portuguese'
                            ? 'bg-white text-[#FD9555] shadow-sm'
                            : 'text-black hover:bg-white/40'
                            }`}
                    >
                        Portuguese
                    </button>
                    <button
                        onClick={() => changeLocale('Spanish')}
                        className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 min-w-[56px] sm:min-w-[64px] cursor-pointer ${selectedLanguage === 'Spanish'
                            ? 'bg-white text-[#FD9555] shadow-sm'
                            : 'text-black hover:bg-white/40'
                            }`}
                    >
                        Spanish
                    </button>
                    <button
                        onClick={() => changeLocale('English')}
                        className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 min-w-[56px] sm:min-w-[64px] cursor-pointer ${selectedLanguage === 'English'
                            ? 'bg-white text-[#FD9555] shadow-sm'
                            : 'text-black hover:bg-white/40'
                            }`}
                    >
                        English
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LanguageSelector
