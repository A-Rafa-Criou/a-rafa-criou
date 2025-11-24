'use client'

import { useEffect, useState } from 'react'
import { useFavorites } from '@/contexts/favorites-context'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'
import { PromotionalPrice, PriceRange } from '@/components/ui/promotional-price'

interface ProductVariation {
    id: string
    price: number
    originalPrice?: number
    hasPromotion?: boolean
    promotion?: {
        name: string
        discountType: 'percentage' | 'fixed'
        discountValue: number
    }
}

interface EnhancedFavoriteProduct {
    id: string
    slug: string
    name: string
    price: number
    originalPrice?: number
    hasPromotion?: boolean
    image: string
    addedAt: number
    variations?: ProductVariation[]
}

export default function FavoritosPage() {
    const { t } = useTranslation('common')
    const { favorites, clearFavorites } = useFavorites()
    const [enhancedFavorites, setEnhancedFavorites] = useState<EnhancedFavoriteProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        document.title = `${t('favorites.title', 'Meus Favoritos')} | A Rafa Criou`
    }, [t])

    // Buscar dados completos dos produtos favoritados (incluindo variações)
    useEffect(() => {
        const fetchProductsData = async () => {
            if (favorites.length === 0) {
                setEnhancedFavorites([])
                setIsLoading(false)
                return
            }

            try {
                // Buscar dados de todos os produtos favoritados
                const productsData = await Promise.all(
                    favorites.map(async (fav) => {
                        try {
                            const response = await fetch(`/api/products?slug=${fav.slug}`)
                            if (!response.ok) throw new Error('Failed to fetch product')
                            const data = await response.json()

                            if (data.products && data.products.length > 0) {
                                const product = data.products[0]
                                return {
                                    ...fav,
                                    variations: product.variations || []
                                }
                            }
                            return fav
                        } catch (error) {
                            console.error(`Error fetching product ${fav.slug}:`, error)
                            return fav
                        }
                    })
                )

                setEnhancedFavorites(productsData)
            } catch (error) {
                console.error('Error fetching products data:', error)
                setEnhancedFavorites(favorites)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProductsData()
    }, [favorites])

    if (favorites.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#F4F4F4] to-white py-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <div className="mb-6">
                            <Heart className="w-24 h-24 mx-auto text-gray-300" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4  ">
                            {t('favorites.empty', 'Nenhum favorito ainda')}
                        </h1>
                        <p className="text-gray-600 mb-8">
                            {t('favorites.emptyDescription', 'Explore nossos produtos e adicione seus favoritos clicando no coração ❤️')}
                        </p>
                        <Button asChild size="lg" className="bg-[#FED466] hover:bg-[#FD9555] text-black font-bold">
                            <Link href="/">
                                {t('favorites.browseProducts', 'Ver Produtos')}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <p className="text-center text-gray-600">Carregando favoritos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 lg:py-8">
            <div className="container mx-auto px-4">
                {/* Header - Melhorado */}
                <div className="mb-8 sm:mb-12">
                    <div className="bg-[#8FBC8F] -mx-4 sm:mx-0 sm:rounded-2xl flex items-center justify-center py-4 sm:py-6 shadow-lg">
                        <h1 className="flex text-center gap-2 font-Scripter text-white font-bold uppercase  leading-none text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                            <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white fill-current drop-shadow-lg" />
                            {t('favorites.title', 'Meus Favoritos')}
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                        <p className="text-gray-700 text-base sm:text-lg font-medium">
                            {favorites.length} {t('favorites.productsCount', 'produto(s) favoritado(s)')}
                        </p>

                        {favorites.length > 0 && (
                            <Button
                                onClick={clearFavorites}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('favorites.clearAll', 'Limpar Tudo')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Grid de produtos favoritos - IGUAL À HOME */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
                    {enhancedFavorites.map((product) => (
                        <div
                            key={product.id}
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col justify-between"
                        >
                            <div>
                                <Link href={`/produtos/${product.slug}`} className="block group focus:outline-none focus:ring-2 focus:ring-primary">
                                    <div className="p-2 sm:p-3 md:p-4">
                                        <div className="aspect-square bg-gray-100 relative overflow-hidden group rounded-lg">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105 rounded-lg bg-[#F4F4F4]"
                                            />

                                            {/* Botão de Favorito - SOBRE A IMAGEM, canto superior esquerdo */}
                                            <div className="absolute top-2 left-2 z-10">
                                                <FavoriteButton
                                                    productId={product.id}
                                                    productSlug={product.slug}
                                                    productName={product.name}
                                                    productPrice={product.price}
                                                    productImage={product.image}
                                                    size="sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nome do produto - título principal */}
                                    <div className="px-2 sm:px-3 md:px-4 flex flex-col">
                                        <div className="flex-grow-0 mb-1.5 sm:mb-2">
                                            <h2 className="font-bold text-gray-900 uppercase text-xs sm:text-sm md:text-base leading-tight text-center min-h-[1.75rem] sm:min-h-[2rem] md:min-h-[2.25rem] flex items-center justify-center line-clamp-2">
                                                {product.name}
                                            </h2>
                                        </div>

                                        {/* Preço destacado - COM INTERVALO SE TIVER VARIAÇÕES */}
                                        <div className="flex-grow-0 mb-2 sm:mb-2.5 text-center">
                                            {product.variations && product.variations.length > 1 ? (
                                                <PriceRange
                                                    minPrice={Math.min(...product.variations.map(v => v.price))}
                                                    maxPrice={Math.max(...product.variations.map(v => v.price))}
                                                    minOriginalPrice={Math.min(...product.variations.map(v => v.originalPrice || v.price))}
                                                    maxOriginalPrice={Math.max(...product.variations.map(v => v.originalPrice || v.price))}
                                                    hasPromotion={product.hasPromotion}
                                                    promotionName={product.variations.find(v => v.hasPromotion)?.promotion?.name}
                                                    size="md"
                                                    showBadge={true}
                                                />
                                            ) : (
                                                <PromotionalPrice
                                                    price={product.price}
                                                    originalPrice={product.originalPrice}
                                                    hasPromotion={product.hasPromotion}
                                                    promotionName={product.variations?.[0]?.promotion?.name}
                                                    size="md"
                                                    showBadge={true}
                                                    showDiscountBadge={false}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            {/* Botão full-width sempre alinhado na base */}
                            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 mt-auto">
                                <Button
                                    asChild
                                    className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-bold py-2 text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 hover:shadow-lg rounded-lg cursor-pointer"
                                >
                                    <Link href={`/produtos/${product.slug}`}>
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        <span className="sm:hidden">{t('product.viewDetails', 'VER')}</span>
                                        <span className="hidden sm:inline">{t('product.viewDetails', 'VER DETALHES')}</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
