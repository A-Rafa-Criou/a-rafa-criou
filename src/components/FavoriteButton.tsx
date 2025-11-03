'use client'

import { Heart } from 'lucide-react'
import { useFavorites } from '@/contexts/favorites-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
    productId: string
    productSlug: string
    productName: string
    productPrice: number
    productImage: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'icon' | 'with-text'
    className?: string
}

export function FavoriteButton({
    productId,
    productSlug,
    productName,
    productPrice,
    productImage,
    size = 'md',
    variant = 'icon',
    className,
}: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites()
    const isFav = isFavorite(productId)

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        toggleFavorite({
            id: productId,
            slug: productSlug,
            name: productName,
            price: productPrice,
            image: productImage,
        })
    }

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    }

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }

    if (variant === 'with-text') {
        return (
            <Button
                onClick={handleClick}
                variant={isFav ? 'default' : 'outline'}
                size="sm"
                className={cn(
                    'flex items-center gap-2 transition-all duration-200',
                    isFav
                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                        : 'border-gray-300 hover:border-red-400 hover:text-red-500',
                    className
                )}
            >
                <Heart
                    className={cn(
                        iconSizes[size],
                        'transition-all duration-200',
                        isFav && 'fill-current'
                    )}
                />
                <span className="text-xs sm:text-sm font-medium">
                    {isFav ? 'Favoritado' : 'Favoritar'}
                </span>
            </Button>
        )
    }

    return (
        <button
            onClick={handleClick}
            aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            type="button"
            className={cn(
                sizeClasses[size],
                'rounded-full flex items-center justify-center transition-all duration-300',
                'hover:scale-125 active:scale-95 cursor-pointer',
                'shadow-lg hover:shadow-xl',
                isFav
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white/95 hover:bg-white text-gray-600 hover:text-red-500',
                className
            )}
        >
            <Heart
                className={cn(
                    iconSizes[size],
                    'transition-all duration-300',
                    isFav ? 'fill-current' : 'fill-none'
                )}
                strokeWidth={2.5}
            />
        </button>
    )
}
