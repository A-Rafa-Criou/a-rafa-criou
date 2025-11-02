'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'

export type Currency = 'BRL' | 'USD' | 'EUR'

interface ExchangeRates {
  BRL: number
  USD: number
  EUR: number
  lastUpdated: number // timestamp
}

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  rates: ExchangeRates
  convertPrice: (priceInBRL: number, targetCurrency?: Currency) => number
  formatPrice: (price: number, targetCurrency?: Currency) => string
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

const COOKIE_NAME = 'preferred_currency'
const CACHE_KEY = 'exchange_rates'
const CACHE_DURATION = 1000 * 60 * 60 * 6 // 6 horas

// Taxas de fallback (caso API falhe)
const FALLBACK_RATES: ExchangeRates = {
  BRL: 1,
  USD: 0.20, // 1 BRL = 0.20 USD (aprox)
  EUR: 0.18, // 1 BRL = 0.18 EUR (aprox)
  lastUpdated: Date.now(),
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('BRL')
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar moeda preferida do cookie
  useEffect(() => {
    const savedCurrency = Cookies.get(COOKIE_NAME) as Currency | undefined
    if (savedCurrency && ['BRL', 'USD', 'EUR'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency)
    }

    // Carregar taxas de câmbio do cache
    const cachedRates = localStorage.getItem(CACHE_KEY)
    if (cachedRates) {
      try {
        const parsed = JSON.parse(cachedRates) as ExchangeRates
        const isCacheValid = Date.now() - parsed.lastUpdated < CACHE_DURATION
        if (isCacheValid) {
          setRates(parsed)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error('Erro ao carregar taxas do cache:', error)
      }
    }

    // Buscar taxas atualizadas da API
    fetchExchangeRates()
  }, [])

  const fetchExchangeRates = async () => {
    setIsLoading(true)
    try {
      // Usando ExchangeRate-API (grátis, 1500 requests/mês)
      // Base: BRL (produtos sempre em BRL no banco)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/BRL`
      )
      
      if (!response.ok) {
        throw new Error('Falha ao buscar taxas de câmbio')
      }

      const data = await response.json()
      
      const newRates: ExchangeRates = {
        BRL: 1, // Base
        USD: data.rates.USD || FALLBACK_RATES.USD,
        EUR: data.rates.EUR || FALLBACK_RATES.EUR,
        lastUpdated: Date.now(),
      }

      setRates(newRates)
      localStorage.setItem(CACHE_KEY, JSON.stringify(newRates))
      
      console.log('[Currency] Taxas atualizadas:', newRates)
    } catch (error) {
      console.error('[Currency] Erro ao buscar taxas, usando fallback:', error)
      setRates(FALLBACK_RATES)
    } finally {
      setIsLoading(false)
    }
  }

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency)
    Cookies.set(COOKIE_NAME, newCurrency, { expires: 365 }) // 1 ano
    console.log('[Currency] Moeda alterada para:', newCurrency)
  }

  // Converter preço de BRL (base do banco) para moeda alvo
  const convertPrice = (priceInBRL: number, targetCurrency?: Currency): number => {
    const target = targetCurrency || currency
    const rate = rates[target]
    return priceInBRL * rate
  }

  // Formatar preço com símbolo da moeda
  const formatPrice = (price: number, targetCurrency?: Currency): string => {
    const target = targetCurrency || currency
    
    const localeMap: Record<Currency, string> = {
      BRL: 'pt-BR',
      USD: 'en-US',
      EUR: 'de-DE',
    }

    return new Intl.NumberFormat(localeMap[target], {
      style: 'currency',
      currency: target,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        convertPrice,
        formatPrice,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency deve ser usado dentro de CurrencyProvider')
  }
  return context
}
