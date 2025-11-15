'use client'

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/contexts/currency-context'
import Cookies from 'js-cookie'

// Mapeamento de países para idioma e moeda
const COUNTRY_TO_LOCALE: Record<string, { locale: string; currency: 'BRL' | 'USD' | 'EUR' | 'MXN' }> = {
    // Brasil
    'BR': { locale: 'pt', currency: 'BRL' },

    // Países de língua espanhola com Peso Mexicano
    'MX': { locale: 'es', currency: 'MXN' },

    // Países de língua espanhola com Euro
    'ES': { locale: 'es', currency: 'EUR' },
    'AR': { locale: 'es', currency: 'EUR' },
    'CL': { locale: 'es', currency: 'EUR' },
    'CO': { locale: 'es', currency: 'EUR' },
    'PE': { locale: 'es', currency: 'EUR' },
    'VE': { locale: 'es', currency: 'EUR' },

    // Países de língua inglesa
    'US': { locale: 'en', currency: 'USD' },
    'CA': { locale: 'en', currency: 'USD' },
    'GB': { locale: 'en', currency: 'EUR' },
    'AU': { locale: 'en', currency: 'USD' },
    'NZ': { locale: 'en', currency: 'USD' },

    // Países da Europa (Euro)
    'DE': { locale: 'en', currency: 'EUR' },
    'FR': { locale: 'en', currency: 'EUR' },
    'IT': { locale: 'en', currency: 'EUR' },
    'PT': { locale: 'pt', currency: 'EUR' },
    'NL': { locale: 'en', currency: 'EUR' },
    'BE': { locale: 'en', currency: 'EUR' },
    'AT': { locale: 'en', currency: 'EUR' },
    'IE': { locale: 'en', currency: 'EUR' },
}

export function AutoLocaleDetector() {
    const { i18n } = useTranslation()
    const { setCurrency } = useCurrency()
    const hasDetected = useRef(false)

    useEffect(() => {
        // Só executar uma vez
        if (hasDetected.current) return
        hasDetected.current = true

        // Verificar se já tem preferências salvas
        const savedLocale = Cookies.get('NEXT_LOCALE')
        const savedCurrency = Cookies.get('preferred_currency')

        // Se já tem preferências, respeitar
        if (savedLocale && savedCurrency) {
            console.log('✅ [AUTO-LOCALE] Preferências já salvas:', { locale: savedLocale, currency: savedCurrency })
            return
        }

        // Tentar detectar localização automaticamente
        detectUserLocation()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const detectUserLocation = async () => {
        try {
            // Método 1: Tentar pela API de geolocalização do navegador (mais preciso, mas requer permissão)
            if ('geolocation' in navigator) {
                // Não vamos pedir permissão de geolocalização para não assustar o usuário
                // Vamos usar apenas a API de timezone e idioma do navegador
            }

            // Método 2: Timezone do navegador (funciona sem permissão)
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            console.log('🌍 [AUTO-LOCALE] Timezone detectado:', timezone)

            // Método 3: Idioma do navegador
            const browserLang = navigator.language.split('-')[0] // 'pt-BR' -> 'pt'
            console.log('🌍 [AUTO-LOCALE] Idioma do navegador:', browserLang)

            // Método 4: API de geolocalização por IP (grátis, sem necessidade de chave)
            try {
                const response = await fetch('https://ipapi.co/json/', {
                    signal: AbortSignal.timeout(3000) // 3s timeout
                })

                if (response.ok) {
                    const data = await response.json()
                    const countryCode = data.country_code as string
                    console.log('🌍 [AUTO-LOCALE] País detectado:', countryCode, data.country_name)

                    const config = COUNTRY_TO_LOCALE[countryCode]
                    if (config) {
                        // Aplicar automaticamente
                        console.log('✅ [AUTO-LOCALE] Configurando automaticamente:', config)

                        // Salvar idioma
                        Cookies.set('NEXT_LOCALE', config.locale, { expires: 365 })
                        i18n.changeLanguage(config.locale)

                        // Salvar moeda
                        setCurrency(config.currency)

                        return
                    }
                }
            } catch (error) {
                console.log('⚠️ [AUTO-LOCALE] Erro ao detectar por IP, usando fallback:', error)
            }

            // Fallback: Usar idioma do navegador
            const fallbackConfig = getFallbackFromBrowserLang(browserLang)
            console.log('🔄 [AUTO-LOCALE] Usando fallback:', fallbackConfig)

            Cookies.set('NEXT_LOCALE', fallbackConfig.locale, { expires: 365 })
            i18n.changeLanguage(fallbackConfig.locale)
            setCurrency(fallbackConfig.currency)

        } catch (error) {
            console.error('❌ [AUTO-LOCALE] Erro na detecção:', error)
            // Manter valores padrão (pt-BR/BRL)
        }
    }

    const getFallbackFromBrowserLang = (lang: string): { locale: string; currency: 'BRL' | 'USD' | 'EUR' | 'MXN' } => {
        if (lang === 'pt') return { locale: 'pt', currency: 'BRL' }
        if (lang === 'es') return { locale: 'es', currency: 'MXN' }
        return { locale: 'en', currency: 'USD' }
    }

    // Este componente não renderiza nada
    return null
}
