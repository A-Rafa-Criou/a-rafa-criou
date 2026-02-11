'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Flame, Star, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CommissionMuralProps {
    /** Taxa de comissão atual do afiliado (ex: "20.00") */
    currentRate?: string;
    /** Se true, mostra versão compacta para dashboards */
    compact?: boolean;
}

/**
 * Mural de Comissões para Afiliados
 * 
 * Exibe a porcentagem de comissão de forma promocional e atrativa.
 * O admin pode aumentar a porcentagem para atrair mais afiliados.
 * Quando a taxa está acima de 20%, mostra banners de promoção.
 */
export default function CommissionMural({ currentRate, compact = false }: CommissionMuralProps) {
    const { t } = useTranslation('common');
    const [globalRate, setGlobalRate] = useState<string | null>(null);
    const [loading, setLoading] = useState(!currentRate);

    const rate = currentRate || globalRate || '20.00';
    const rateNum = parseFloat(rate);
    const isPromotion = rateNum > 20;
    const isHighPromotion = rateNum >= 30;

    useEffect(() => {
        if (!currentRate) {
            fetchGlobalRate();
        }
    }, [currentRate]);

    const fetchGlobalRate = async () => {
        try {
            const response = await fetch('/api/affiliates/commission-rate');
            if (response.ok) {
                const data = await response.json();
                setGlobalRate(data.rate || '20.00');
            }
        } catch {
            setGlobalRate('20.00');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    if (compact) {
        return (
            <Card className={`relative overflow-hidden border-2 ${isHighPromotion
                ? 'border-red-400 bg-linear-to-r from-red-50 to-orange-50'
                : isPromotion
                    ? 'border-[#FD9555] bg-linear-to-r from-orange-50 to-yellow-50'
                    : 'border-[#FED466] bg-linear-to-r from-yellow-50 to-amber-50'
                }`}>
                {isPromotion && (
                    <div className="absolute top-0 right-0">
                        <Badge className={`rounded-none rounded-bl-lg text-xs font-bold px-3 py-1 ${isHighPromotion ? 'bg-red-500' : 'bg-[#FD9555]'
                            }`}>
                            <Flame className="h-3 w-3 mr-1" />
                            {t('commissionMural.promotion')}
                        </Badge>
                    </div>
                )}
                <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isHighPromotion
                            ? 'bg-red-100'
                            : isPromotion
                                ? 'bg-orange-100'
                                : 'bg-yellow-100'
                            }`}>
                            {isPromotion ? (
                                <Zap className={`h-6 w-6 ${isHighPromotion ? 'text-red-600' : 'text-[#FD9555]'}`} />
                            ) : (
                                <TrendingUp className="h-6 w-6 text-[#FD9555]" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {t('commissionMural.yourCommission')}
                            </p>
                            <p className={`text-3xl font-extrabold ${isHighPromotion
                                ? 'text-red-600'
                                : isPromotion
                                    ? 'text-[#FD9555]'
                                    : 'text-gray-900'
                                }`}>
                                {rateNum.toFixed(0)}%
                            </p>
                        </div>
                        {isPromotion && (
                            <p className="text-xs text-muted-foreground ml-auto max-w-30 text-right">
                                {t('commissionMural.promotionalTip')}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`relative overflow-hidden border-2 ${isHighPromotion
            ? 'border-red-400 bg-linear-to-br from-red-50 via-orange-50 to-yellow-50'
            : isPromotion
                ? 'border-[#FD9555] bg-linear-to-br from-orange-50 via-yellow-50 to-amber-50'
                : 'border-[#FED466] bg-linear-to-br from-yellow-50 via-amber-50 to-orange-50'
            }`}>
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#FED466]/20" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-[#FD9555]/15" />

            {isPromotion && (
                <div className="absolute top-0 right-0">
                    <Badge className={`rounded-none rounded-bl-xl text-sm font-bold px-4 py-2 animate-pulse ${isHighPromotion ? 'bg-red-500 text-white' : 'bg-[#FD9555] text-white'
                        }`}>
                        <Flame className="h-4 w-4 mr-1.5" />
                        {isHighPromotion ? t('commissionMural.superPromotion') : t('commissionMural.promotion')}
                    </Badge>
                </div>
            )}

            <CardContent className="pt-6 pb-6 relative">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-lg ${isHighPromotion
                        ? 'bg-linear-to-br from-red-400 to-orange-500'
                        : isPromotion
                            ? 'bg-linear-to-br from-[#FD9555] to-[#FED466]'
                            : 'bg-linear-to-br from-[#FED466] to-[#FD9555]'
                        }`}>
                        {isHighPromotion ? (
                            <Flame className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                        ) : isPromotion ? (
                            <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                        ) : (
                            <Star className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="text-center sm:text-left flex-1">
                        <p className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                            {isPromotion ? t('commissionMural.promotionalRate') : t('commissionMural.yourCommissionRate')}
                        </p>
                        <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                            <span className={`text-5xl sm:text-6xl font-black ${isHighPromotion
                                ? 'text-red-600'
                                : isPromotion
                                    ? 'text-[#FD9555]'
                                    : 'text-gray-900'
                                }`}>
                                {rateNum.toFixed(0)}%
                            </span>
                            <span className="text-sm text-muted-foreground">{t('commissionMural.perSale')}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md">
                            {isHighPromotion
                                ? t('commissionMural.highPromotionDesc')
                                : isPromotion
                                    ? t('commissionMural.promotionDesc')
                                    : t('commissionMural.normalDesc')
                            }
                        </p>
                    </div>

                    {/* Right side stats */}
                    <div className={`hidden lg:flex flex-col items-center gap-1 px-6 py-3 rounded-xl ${isPromotion ? 'bg-white/60' : 'bg-white/50'
                        }`}>
                        <span className="text-xs text-muted-foreground font-medium">{t('commissionMural.example')}</span>
                        <span className="text-xs text-muted-foreground">{t('commissionMural.saleOf100')}</span>
                        <span className={`text-2xl font-bold ${isHighPromotion ? 'text-red-600' : isPromotion ? 'text-[#FD9555]' : 'text-green-600'
                            }`}>
                            R$ {rateNum.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted-foreground">{t('commissionMural.forYou')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
