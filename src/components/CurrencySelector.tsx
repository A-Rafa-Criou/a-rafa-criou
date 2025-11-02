'use client'

import { useCurrency, Currency } from '@/contexts/currency-context'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Loader2 } from 'lucide-react'

const CURRENCY_OPTIONS: Array<{
    code: Currency
    name: string
    symbol: string
    flag: string
}> = [
        { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', flag: '🇧🇷' },
        { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
        { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    ]

export function CurrencySelector() {
    const { currency, setCurrency, isLoading } = useCurrency()

    const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === currency)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-2 border-2 border-gray-200 hover:border-[#FD9555] transition-colors"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Carregando...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-lg">{selectedCurrency?.flag}</span>
                            <span className="text-sm font-semibold">{selectedCurrency?.code}</span>
                            <span className="text-xs text-gray-600">({selectedCurrency?.symbol})</span>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {CURRENCY_OPTIONS.map(option => (
                    <DropdownMenuItem
                        key={option.code}
                        onClick={() => setCurrency(option.code)}
                        className={`flex items-center gap-3 cursor-pointer ${currency === option.code ? 'bg-[#FED466]/20 font-semibold' : ''
                            }`}
                    >
                        <span className="text-2xl">{option.flag}</span>
                        <div className="flex-1">
                            <div className="font-medium">{option.code}</div>
                            <div className="text-xs text-gray-500">{option.name}</div>
                        </div>
                        <span className="text-sm font-bold text-[#FD9555]">{option.symbol}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
