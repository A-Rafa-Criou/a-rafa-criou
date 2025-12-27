'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPreviewSrc } from '@/lib/r2-utils';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/cart-context';
import { useCurrency } from '@/contexts/currency-context';
import { AddToCartSheet } from '@/components/sections/AddToCartSheet';
import { FavoriteButton } from '@/components/FavoriteButton';

// Cache de pre-fetch para evitar requisições duplicadas
const preFetchCache = new Set<string>();

interface ProductVariation {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number; // Preço original antes da promoção
    hasPromotion?: boolean; // Se tem promoção ativa
    discount?: number; // Valor do desconto
    promotion?: {
        id: string;
        name: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
    }; // Dados da promoção ativa
    isActive: boolean;
    sortOrder: number;
    attributeValues?: {
        attributeId: string;
        attributeName: string | null;
        valueId: string;
        value: string | null;
    }[];
}

interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    price: number;
    originalPrice?: number; // Preço original antes da promoção
    hasPromotion?: boolean; // Se tem promoção ativa
    priceDisplay: string;
    categoryId: string | null;
    category: {
        id: string;
        name: string;
        slug: string;
    } | null;
    isFeatured: boolean;
    createdAt: Date | string;
    variations: ProductVariation[];
    mainImage: {
        data: string;
        alt: string | null;
    } | null;
}

interface FeaturedProductsProps {
    showViewAll?: boolean;
}

interface ApiResponse {
    products: Product[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export default function FeaturedProducts({
    showViewAll = true
}: FeaturedProductsProps) {
    const { t, i18n } = useTranslation('common')
    const { openCartSheet } = useCart();
    const { formatPrice, convertPrice } = useCurrency();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showAddToCart, setShowAddToCart] = useState(false);

    // Limite fixo para evitar problemas de hidratação
    const initialLimit = 12;
    const loadMoreLimit = 12;

    // Estado de offset - sempre começa do zero
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        // Limpar URL se houver parâmetro 'loaded'
        const params = new URLSearchParams(window.location.search);
        if (params.has('loaded')) {
            params.delete('loaded');
            const newUrl = params.toString() ? `?${params}` : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        const fetchProducts = async () => {
            setLoading(true);
            try {
                // 🔄 CACHE BUSTING: Adicionar timestamp para forçar dados atualizados
                const cacheBuster = Date.now();

                // Buscar produtos com locale atual - SEMPRE do início
                const response = await fetch(
                    `/api/products?limit=${initialLimit}&offset=0&locale=${i18n.language}&_t=${cacheBuster}`,
                    {
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache',
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }

                const data: ApiResponse = await response.json();

                setProducts(data.products || []);
                setHasMore(data.pagination?.hasMore || false);
                setOffset(initialLimit);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [i18n.language, initialLimit]);

    const handleLoadMore = async () => {
        if (loading || !hasMore) return;

        setLoading(true);

        try {
            const cacheBuster = Date.now();
            const url = `/api/products?limit=${loadMoreLimit}&offset=${offset}&locale=${i18n.language}&_t=${cacheBuster}`;

            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch more products');
            }

            const data: ApiResponse = await response.json();

            // Adicionar novos produtos aos existentes (sem duplicatas)
            const existingIds = new Set(products.map(p => p.id));
            const newProducts = (data.products || []).filter(p => !existingIds.has(p.id));

            setProducts(prev => [...prev, ...newProducts]);
            setHasMore(data.pagination?.hasMore || false);
            setOffset(offset + loadMoreLimit);
        } catch (error) {
            console.error('Error loading more products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (product: Product) => {
        // Se o produto já tem variações carregadas, usar diretamente
        if (product.variations && product.variations.length > 0) {
            setSelectedProduct(product)
            setShowAddToCart(true)
            return
        }

        // Caso contrário, buscar produto completo da API
        try {
            const response = await fetch(`/api/products/by-slug?slug=${product.slug}&locale=${i18n.language}`)
            if (!response.ok) throw new Error('Erro ao buscar produto')

            const fullProduct = await response.json()

            // Transformar para o formato esperado
            const productWithVariations = {
                ...product,
                variations: fullProduct.variations?.map((v: {
                    id: string;
                    name: string;
                    description?: string;
                    price: number;
                    originalPrice?: number;
                    hasPromotion?: boolean;
                    discount?: number;
                    promotion?: { id: string; name: string; discountType: string; discountValue: number };
                    attributeValues?: Array<{ attributeId: string; attributeName: string | null; valueId: string; value: string | null }>;
                    images?: string[];
                }) => ({
                    id: v.id,
                    productId: product.id,
                    name: v.name,
                    slug: v.description || v.name,
                    price: v.price,
                    originalPrice: v.originalPrice,
                    hasPromotion: v.hasPromotion,
                    discount: v.discount,
                    promotion: v.promotion,
                    isActive: true,
                    sortOrder: 0,
                    attributeValues: v.attributeValues,
                    images: v.images
                })) || []
            }

            setSelectedProduct(productWithVariations)
            setShowAddToCart(true)
        } catch (error) {
            console.error('Erro ao carregar variações do produto:', error)
            // Tentar abrir mesmo sem variações
            setSelectedProduct(product)
            setShowAddToCart(true)
        }
    };

    // Pre-fetch do produto ao passar mouse (reduz tempo de carregamento)
    const handleProductHover = (slug: string) => {
        if (preFetchCache.has(slug)) return; // Já fez pre-fetch

        preFetchCache.add(slug);

        // Pre-fetch da API do produto
        fetch(`/api/products/by-slug?slug=${slug}&locale=${i18n.language}`, {
            priority: 'low'
        } as RequestInit).catch(() => {
            // Ignora erros de pre-fetch
            preFetchCache.delete(slug);
        });
    };

    // Remover duplicatas
    const displayProducts = products.filter((product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    // Loading skeleton para evitar flash
    if (loading && products.length === 0) {
        return (
            <section className="py-8 bg-gray-50">
                <div className="bg-[#8FBC8F] mb-12 flex items-center justify-center m-0 p-2">
                    <h1
                        className="font-Scripter text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-[4rem] 2xl:text-[5rem] font-bold m-3 sm:m-4 md:m-5 lg:m-5 xl:m-6 uppercase text-center leading-none text-white text-[clamp(2rem,6vw,4rem)]"
                    >
                        {t('featured.allFiles', 'TODOS OS ARQUIVOS')}
                    </h1>
                </div>
                <div className="container mx-auto px-4 mb-16">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                                <div className="p-2 sm:p-3 md:p-4">
                                    <div className="aspect-square bg-gray-200 rounded-lg"></div>
                                </div>
                                <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4">
                                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded mb-3"></div>
                                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-gray-50 pb-8">
            <div className="bg-[#8FBC8F] mb-12 flex items-center justify-center">
                <h1
                    className="font-Scripter text-4xl md:text-5xl lg:text-4xl xl:text-[3rem] 2xl:text-[4rem] font-bold m-3 sm:m-4 md:m-5 lg:m-5 xl:m-6 uppercase text-center leading-none text-white"
                >
                    {t('featured.allFiles', 'TODOS OS ARQUIVOS')}
                </h1>
            </div>
            <div className="container mx-auto px-4 ">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
                    {displayProducts.map((product, index) => (
                        <div
                            key={product.id}
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
                            onMouseEnter={() => handleProductHover(product.slug)}
                        >
                            <Link href={`/produtos/${product.slug}`} prefetch={true} className="block group focus:outline-none focus:ring-2 focus:ring-primary flex-1 flex flex-col min-h-0">
                                <div className="p-2 sm:p-3 md:p-4">
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden group rounded-lg">
                                        {product.mainImage && product.mainImage.data ? (
                                            <Image
                                                src={getPreviewSrc(product.mainImage.data)}
                                                alt={product.mainImage.alt || product.name}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg bg-[#F4F4F4]"
                                                loading="lazy"
                                                quality={50}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full rounded-lg bg-[#F4F4F4]">
                                                <span className="text-gray-400 text-sm">{t('product.noImage', 'Sem imagem')}</span>
                                            </div>
                                        )}

                                        {/* Botão de Favorito - SOBRE A IMAGEM, canto superior esquerdo */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <FavoriteButton
                                                productId={product.id}
                                                productSlug={product.slug}
                                                productName={product.name}
                                                productPrice={product.price}
                                                productImage={product.mainImage?.data || '/file.svg'}
                                                size="sm"
                                            />
                                        </div>

                                        {/* Badge para os 2 produtos mais recentes */}
                                        {index < 2 && (
                                            <div className="absolute top-1.5 right-1.5 bg-[#FED466] text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                                {t('product.new', 'NOVO')}
                                            </div>
                                        )}

                                        {/* Badge de Promoção - SOBRE A IMAGEM, centro inferior */}
                                        {(() => {
                                            const activeVariations = product.variations?.filter(v => v.isActive !== false) || [];
                                            const hasAnyPromotion = product.hasPromotion || activeVariations.some(v => v.hasPromotion);
                                            const firstPromotion = activeVariations.find(v => v.hasPromotion)?.promotion;
                                            const promotionName = firstPromotion?.name;
                                            if (!hasAnyPromotion || !promotionName) return null;

                                            return (
                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
                                                    <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                        {promotionName}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* Nome do produto - título principal */}
                                <div className="px-2 sm:px-3 md:px-4 flex flex-col flex-grow">
                                    <div className="mb-2 sm:mb-2.5 min-h-[2.5rem] sm:min-h-[2.75rem] md:min-h-[3rem] flex items-start justify-center">
                                        <h2 className="font-bold text-gray-900 uppercase text-xs sm:text-sm md:text-base leading-tight text-center line-clamp-2">
                                            {product.name}
                                        </h2>
                                    </div>
                                    {/* Preço destacado - LADO A LADO - sempre próximo ao botão */}
                                    <div className="mt-auto mb-2 sm:mb-2.5 text-center">
                                        {(() => {
                                            // Verificar se tem múltiplas variações ATIVAS com preços DIFERENTES
                                            if (!product.variations || product.variations.length === 0) {
                                                const hasPromo = product.hasPromotion;
                                                const finalPrice = product.price;
                                                const origPrice = product.originalPrice;

                                                return (
                                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                                        {hasPromo && origPrice && (
                                                            <span className="text-gray-500 line-through text-xs sm:text-sm">
                                                                {formatPrice(convertPrice(origPrice))}
                                                            </span>
                                                        )}
                                                        <span className={`font-bold text-base sm:text-lg ${hasPromo ? 'text-red-600' : 'text-[#FD9555]'}`}>
                                                            {formatPrice(convertPrice(finalPrice))}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            const activeVariations = product.variations.filter(v => v.isActive !== false);

                                            if (activeVariations.length === 0) {
                                                const hasPromo = product.hasPromotion;
                                                const finalPrice = product.price;
                                                const origPrice = product.originalPrice;

                                                return (
                                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                                        {hasPromo && origPrice && (
                                                            <span className="text-gray-500 line-through text-xs sm:text-sm">
                                                                {formatPrice(convertPrice(origPrice))}
                                                            </span>
                                                        )}
                                                        <span className={`font-bold text-base sm:text-lg ${hasPromo ? 'text-red-600' : 'text-[#FD9555]'}`}>
                                                            {formatPrice(convertPrice(finalPrice))}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            const activePrices = activeVariations.map(v => v.price);
                                            const minPrice = Math.min(...activePrices);
                                            const maxPrice = Math.max(...activePrices);
                                            const hasPriceRange = activeVariations.length > 1 && minPrice !== maxPrice;

                                            if (hasPriceRange) {
                                                const minOriginalPrice = Math.min(...activeVariations.map(v => v.originalPrice || v.price));
                                                const maxOriginalPrice = Math.max(...activeVariations.map(v => v.originalPrice || v.price));
                                                const hasPromo = activeVariations.some(v => v.hasPromotion);

                                                return (
                                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                                        {hasPromo && (minOriginalPrice !== minPrice || maxOriginalPrice !== maxPrice) && (
                                                            <span className="text-gray-500 line-through text-xs sm:text-sm">
                                                                {formatPrice(convertPrice(minOriginalPrice))} - {formatPrice(convertPrice(maxOriginalPrice))}
                                                            </span>
                                                        )}
                                                        <span className={`font-bold text-base sm:text-lg ${hasPromo ? 'text-red-600' : 'text-[#FD9555]'}`}>
                                                            {formatPrice(convertPrice(minPrice))} - {formatPrice(convertPrice(maxPrice))}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            const hasPromo = product.hasPromotion;
                                            const finalPrice = product.price;
                                            const origPrice = product.originalPrice;

                                            return (
                                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    {hasPromo && origPrice && (
                                                        <span className="text-gray-500 line-through text-xs sm:text-sm">
                                                            {formatPrice(convertPrice(origPrice))}
                                                        </span>
                                                    )}
                                                    <span className={`font-bold text-base sm:text-lg ${hasPromo ? 'text-red-600' : 'text-[#FD9555]'}`}>
                                                        {formatPrice(convertPrice(finalPrice))}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </Link>
                            {/* Botão full-width sempre alinhado na base, fora do link */}
                            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 flex-shrink-0">
                                <Button
                                    className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-bold py-2 text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 hover:shadow-lg rounded-lg cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddToCart(product);
                                    }}
                                >
                                    <span className="sm:hidden">{t('product.addToCartMobile', 'ADD AO CARRINHO')}</span>
                                    <span className="hidden sm:inline">{t('product.addToCart', 'ADICIONAR AO CARRINHO')}</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {showViewAll && hasMore && (
                    <div className="mt-8 sm:mt-10">
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="bg-[#8FBC8F] flex items-center justify-center p-2 sm:p-3 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto rounded-full gap-2 sm:gap-3 hover:bg-[#7DAB7D] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Image
                                src="/arrow.png"
                                alt={t('a11y.leftArrow')}
                                width={32}
                                height={32}
                                className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-transform duration-300 group-hover:animate-pulse"
                            />
                            <div
                                className="font-Scripter uppercase text-center leading-none text-base sm:text-lg md:text-xl lg:text-2xl font-bold transition-all duration-300 hover:text-yellow-100 px-2 sm:px-3 text-white"
                            >
                                {loading ? t('featured.loading', 'CARREGANDO...') : t('featured.viewMore', 'CLIQUE PARA VER MAIS ARQUIVOS')}
                            </div>
                            <Image
                                src="/arrow.png"
                                alt={t('a11y.rightArrow')}
                                width={32}
                                height={32}
                                className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-transform duration-300 group-hover:animate-pulse"
                            />
                        </button>
                    </div>
                )}

                {showViewAll && !hasMore && !loading && products.length > 0 && (
                    <div className="mt-8 sm:mt-10 text-center">
                        <div className="font-Scripter bg-gray-200 inline-block px-4 sm:px-6 py-2 sm:py-3 rounded-full">
                            <span className="text-gray-600 font-medium text-sm sm:text-base">
                                {t('featured.endMessage', 'Todos os arquivos foram exibidos!')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Sheet de seleção de atributos */}
            {selectedProduct && (
                <AddToCartSheet
                    open={showAddToCart}
                    onOpenChange={setShowAddToCart}
                    product={{
                        id: selectedProduct.id,
                        name: selectedProduct.name,
                        slug: selectedProduct.slug,
                        price: selectedProduct.price,
                        mainImage: selectedProduct.mainImage ? {
                            data: selectedProduct.mainImage.data,
                            alt: selectedProduct.mainImage.alt || selectedProduct.name
                        } : null,
                        variations: selectedProduct.variations
                    }}
                    onAddedToCart={() => {
                        setShowAddToCart(false);
                        openCartSheet();
                    }}
                />
            )}
        </section>
    );
}