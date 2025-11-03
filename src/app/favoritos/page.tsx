'use client'

import { useEffect } from 'react'
import { useFavorites } from '@/contexts/favorites-context'
import { useCurrency } from '@/contexts/currency-context'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { FavoriteButton } from '@/components/FavoriteButton'

export default function FavoritosPage() {
    const { t } = useTranslation('common')
    const { favorites, clearFavorites } = useFavorites()
    const { convertPrice, formatPrice } = useCurrency()

    useEffect(() => {
        document.title = `${t('favorites.title', 'Meus Favoritos')} | A Rafa Criou`
    }, [t])

    if (favorites.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#F4F4F4] to-white py-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center py-16">
                        <div className="mb-6">
                            <Heart className="w-24 h-24 mx-auto text-gray-300" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F4F4F4] to-white py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                            <Heart className="w-8 h-8 text-red-500 fill-current" />
                            {t('favorites.title', 'Meus Favoritos')}
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {favorites.length} {t('favorites.productsCount', 'produto(s) favoritado(s)')}
                        </p>
                    </div>
                    
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

                {/* Grid de produtos favoritos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {favorites.map((product) => (
                        <Card key={product.id} className="group h-full transition-all hover:shadow-lg">
                            <CardHeader className="pb-2">
                                {/* Imagem do produto */}
                                <div className="relative aspect-square w-full overflow-hidden rounded-lg mb-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    
                                    {/* Botão de Favorito - SOBRE A IMAGEM, canto superior esquerdo */}
                                    <div className="absolute top-2 left-2 z-10">
                                        <FavoriteButton
                                            productId={product.id}
                                            productSlug={product.slug}
                                            productName={product.name}
                                            productPrice={product.price}
                                            productImage={product.image}
                                            size="md"
                                        />
                                    </div>
                                </div>

                                <Badge className="mb-2 w-fit bg-red-500 text-white text-xs">
                                    <Heart className="w-3 h-3 mr-1 fill-current" />
                                    {t('favorites.badge', 'Favorito')}
                                </Badge>
                                
                                <CardTitle className="line-clamp-2 text-base sm:text-lg group-hover:text-primary">
                                    <Link href={`/produtos/${product.slug}`} className="hover:underline">
                                        {product.name}
                                    </Link>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex flex-col justify-between gap-2 pt-0">
                                <div className="mb-1">
                                    <div className="mb-2 text-lg sm:text-xl font-bold text-primary">
                                        {formatPrice(convertPrice(product.price))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        asChild
                                        className="w-full bg-[#FED466] hover:bg-[#FD9555] text-black font-bold text-sm h-10"
                                    >
                                        <Link href={`/produtos/${product.slug}`}>
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            {t('product.viewDetails', 'Ver detalhes')}
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
