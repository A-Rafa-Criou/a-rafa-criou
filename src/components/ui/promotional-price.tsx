'use client';

import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/currency-context';

interface PromotionalPriceProps {
    price: number;
    originalPrice?: number;
    hasPromotion?: boolean;
    promotionName?: string;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showBadge?: boolean;
    showDiscountBadge?: boolean;
    className?: string;
}

/**
 * Componente reutilizável para exibir preços com promoções
 * Mostra badge da promoção, preço original riscado e preço promocional em destaque
 */
export function PromotionalPrice({
    price,
    originalPrice,
    hasPromotion = false,
    promotionName,
    discount,
    discountType = 'percentage',
    size = 'md',
    showBadge = true,
    showDiscountBadge = true,
    className = '',
}: PromotionalPriceProps) {
    const { convertPrice, formatPrice } = useCurrency();

    // Helper para limpar nome da promoção (remover data/hora do final)
    const cleanPromotionName = (name: string) => {
        return name.replace(/\s*[-–—]\s*\d{1,2}\/\d{1,2}.*$/i, '').trim();
    };

    // Tamanhos de texto baseados no size prop
    const sizeClasses = {
        sm: {
            badge: 'text-xs px-1.5 py-0.5',
            original: 'text-xs',
            promo: 'text-base font-bold',
            normal: 'text-sm font-bold',
            discountBadge: 'text-xs px-1.5 py-0.5',
        },
        md: {
            badge: 'text-xs px-2 py-0.5',
            original: 'text-sm',
            promo: 'text-lg sm:text-xl font-bold',
            normal: 'text-base sm:text-lg font-bold',
            discountBadge: 'text-xs px-2 py-0.5',
        },
        lg: {
            badge: 'text-sm px-2 py-1',
            original: 'text-base sm:text-lg',
            promo: 'text-xl sm:text-2xl md:text-3xl font-bold',
            normal: 'text-lg sm:text-xl md:text-2xl font-bold',
            discountBadge: 'text-sm px-2 py-1',
        },
        xl: {
            badge: 'text-sm sm:text-base px-2.5 py-1',
            original: 'text-lg sm:text-xl lg:text-2xl',
            promo: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
            normal: 'text-xl sm:text-2xl lg:text-3xl font-bold',
            discountBadge: 'text-sm px-2.5 py-1',
        },
    };

    const sizes = sizeClasses[size];

    if (!hasPromotion) {
        return (
            <div className={`text-[#FD9555] ${sizes.normal} ${className}`}>
                {formatPrice(convertPrice(price))}
            </div>
        );
    }

    return (
        <div className={`space-y-1 ${className}`}>
            {/* Badge de promoção */}
            {showBadge && promotionName && (
                <div>
                    <Badge className={`bg-red-500 hover:bg-red-600 text-white ${sizes.badge}`}>
                        {cleanPromotionName(promotionName)}
                    </Badge>
                </div>
            )}

            {/* Preço original riscado */}
            {originalPrice && (
                <div className={`text-gray-500 line-through ${sizes.original}`}>
                    {formatPrice(convertPrice(originalPrice))}
                </div>
            )}

            {/* Preço promocional em destaque */}
            <div className={`text-red-600 ${sizes.promo}`}>
                {formatPrice(convertPrice(price))}
            </div>

            {/* Badge de desconto percentual */}
            {showDiscountBadge && discount && discountType === 'percentage' && (
                <div>
                    <Badge className={`bg-green-500 text-white ${sizes.discountBadge}`}>
                        -{discount}% OFF
                    </Badge>
                </div>
            )}
        </div>
    );
}

interface PriceRangeProps {
    minPrice: number;
    maxPrice: number;
    minOriginalPrice?: number;
    maxOriginalPrice?: number;
    hasPromotion?: boolean;
    promotionName?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showBadge?: boolean;
    className?: string;
}

/**
 * Componente para exibir faixa de preços (quando há variações com preços diferentes)
 */
export function PriceRange({
    minPrice,
    maxPrice,
    minOriginalPrice,
    maxOriginalPrice,
    hasPromotion = false,
    promotionName,
    size = 'md',
    showBadge = true,
    className = '',
}: PriceRangeProps) {
    const { convertPrice, formatPrice } = useCurrency();

    // Helper para limpar nome da promoção (remover data/hora do final)
    const cleanPromotionName = (name: string) => {
        return name.replace(/\s*[-–—:]\s*\d{1,2}\/\d{1,2}[\s\S]*$/i, '').trim();
    };

    const sizeClasses = {
        sm: {
            badge: 'text-xs px-1.5 py-0.5',
            original: 'text-xs',
            promo: 'text-base font-bold',
            normal: 'text-sm font-bold',
        },
        md: {
            badge: 'text-xs px-2 py-0.5',
            original: 'text-sm',
            promo: 'text-lg sm:text-xl font-bold',
            normal: 'text-base sm:text-lg font-bold',
        },
        lg: {
            badge: 'text-sm px-2 py-1',
            original: 'text-base sm:text-lg',
            promo: 'text-xl sm:text-2xl md:text-3xl font-bold',
            normal: 'text-lg sm:text-xl md:text-2xl font-bold',
        },
        xl: {
            badge: 'text-sm sm:text-base px-2.5 py-1',
            original: 'text-lg sm:text-xl lg:text-2xl',
            promo: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
            normal: 'text-xl sm:text-2xl lg:text-3xl font-bold',
        },
    };

    const sizes = sizeClasses[size];
    const minConverted = convertPrice(minPrice);
    const maxConverted = convertPrice(maxPrice);
    const isSamePrice = minPrice === maxPrice;

    if (!hasPromotion) {
        return (
            <div className={`text-[#FD9555] ${sizes.normal} ${className}`}>
                {isSamePrice
                    ? formatPrice(minConverted)
                    : `${formatPrice(minConverted)} - ${formatPrice(maxConverted)}`}
            </div>
        );
    }

    return (
        <div className={`space-y-1 ${className}`}>
            {/* Badge de promoção */}
            {showBadge && promotionName && (
                <div>
                    <Badge className={`bg-red-500 hover:bg-red-600 text-white ${sizes.badge}`}>
                        {cleanPromotionName(promotionName)}
                    </Badge>
                </div>
            )}

            {/* Preço original riscado */}
            {minOriginalPrice && maxOriginalPrice && (
                <div className={`text-gray-500 line-through ${sizes.original}`}>
                    {minOriginalPrice === maxOriginalPrice
                        ? formatPrice(convertPrice(minOriginalPrice))
                        : `${formatPrice(convertPrice(minOriginalPrice))} - ${formatPrice(convertPrice(maxOriginalPrice))}`}
                </div>
            )}

            {/* Preço promocional em destaque */}
            <div className={`text-red-600 ${sizes.promo}`}>
                {isSamePrice
                    ? formatPrice(minConverted)
                    : `${formatPrice(minConverted)} - ${formatPrice(maxConverted)}`}
            </div>
        </div>
    );
}
