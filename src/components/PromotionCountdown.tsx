'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromotionCountdownProps {
    endDate: Date
    className?: string
}

interface TimeRemaining {
    days: number
    hours: number
    minutes: number
    seconds: number
    total: number
}

export function PromotionCountdown({ endDate, className }: PromotionCountdownProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
    })

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime()
            const end = new Date(endDate).getTime()
            const difference = end - now

            if (difference <= 0) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    total: 0,
                })
                return
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((difference % (1000 * 60)) / 1000)

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                total: difference,
            })
        }

        // Calcular imediatamente
        calculateTimeRemaining()

        // Atualizar a cada segundo
        const interval = setInterval(calculateTimeRemaining, 1000)

        return () => clearInterval(interval)
    }, [endDate])

    // Não mostrar se a promoção expirou
    if (timeRemaining.total <= 0) {
        return null
    }

    return (
        <div
            className={cn(
                'flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-200',
                className
            )}
        >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white">
                <Clock className="w-4 h-4" />
            </div>

            <div className="flex-1">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                    Promoção termina em:
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    {timeRemaining.days > 0 && (
                        <>
                            <div className="flex flex-col items-center bg-white rounded px-2 py-1 shadow-sm">
                                <span className="text-lg leading-none">{timeRemaining.days}</span>
                                <span className="text-[10px] text-gray-600 uppercase">
                                    {timeRemaining.days === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <span className="text-gray-400">:</span>
                        </>
                    )}

                    <div className="flex flex-col items-center bg-white rounded px-2 py-1 shadow-sm">
                        <span className="text-lg leading-none">{String(timeRemaining.hours).padStart(2, '0')}</span>
                        <span className="text-[10px] text-gray-600 uppercase">hrs</span>
                    </div>

                    <span className="text-gray-400">:</span>

                    <div className="flex flex-col items-center bg-white rounded px-2 py-1 shadow-sm">
                        <span className="text-lg leading-none">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                        <span className="text-[10px] text-gray-600 uppercase">min</span>
                    </div>

                    <span className="text-gray-400">:</span>

                    <div className="flex flex-col items-center bg-white rounded px-2 py-1 shadow-sm">
                        <span className="text-lg leading-none">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                        <span className="text-[10px] text-gray-600 uppercase">seg</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
