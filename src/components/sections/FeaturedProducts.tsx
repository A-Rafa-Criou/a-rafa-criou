'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getPreviewSrc } from '@/lib/r2-utils';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/cart-context';
import { AddToCartSheet } from '@/components/sections/AddToCartSheet';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PriceRange, PromotionalPrice } from '@/components/ui/promotional-price';

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openCartSheet } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showAddToCart, setShowAddToCart] = useState(false);

    // Limite fixo para evitar problemas de hidratação
    const initialLimit = 12;
    const loadMoreLimit = 12;

    // Lê offset da URL para persistir estado entre mudanças de idioma
    const urlOffset = parseInt(searchParams.get('loaded') || '0');
    const [offset, setOffset] = useState(urlOffset || 0);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Se há offset na URL, carregar todos os produtos até esse ponto
                const loadUpTo = urlOffset > 0 ? urlOffset : initialLimit;

                // Buscar produtos com locale atual
                const response = await fetch(`/api/products?limit=${loadUpTo}&offset=0&locale=${i18n.language}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }

                const data: ApiResponse = await response.json();

                setProducts(Array.isArray(data.products) ? data.products : []);
                setHasMore(Boolean(data.pagination.hasMore));
                setOffset(loadUpTo);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [i18n.language, initialLimit, urlOffset]);

    const handleLoadMore = async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            const newOffset = offset + loadMoreLimit;

            // Criar AbortController para cancelar requisição se necessário
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            // Buscar mais produtos com locale atual
            const response = await fetch(`/api/products?limit=${loadMoreLimit}&offset=${offset}&locale=${i18n.language}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }

            const data: ApiResponse = await response.json();

            setProducts(prev => [...prev, ...(Array.isArray(data.products) ? data.products : [])]);
            setHasMore(Boolean(data.pagination.hasMore));
            setOffset(newOffset);

            // Atualiza URL com novo offset para persistir estado
            const params = new URLSearchParams(window.location.search);
            params.set('loaded', newOffset.toString());
            router.push(`?${params.toString()}`, { scroll: false });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Requisição cancelada pelo usuário');
            } else {
                console.error('Error loading more products:', error);
            }
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

    // Produtos fallback simples - remover duplicatas
    const displayProducts = products.length > 0
        ? products.filter((product, index, self) =>
            index === self.findIndex((p) => p.id === product.id)
        )
        : [];

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
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col justify-between"
                            onMouseEnter={() => handleProductHover(product.slug)}
                        >
                            <div>
                                <Link href={`/produtos/${product.slug}`} prefetch={true} className="block group focus:outline-none focus:ring-2 focus:ring-primary">
                                    <div className="p-2 sm:p-3 md:p-4">
                                        <div className="aspect-square bg-gray-100 relative overflow-hidden group rounded-lg">
                                            {product.mainImage && product.mainImage.data ? (
                                                <Image
                                                    src={getPreviewSrc(product.mainImage.data)}
                                                    alt={product.mainImage.alt || product.name}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, 25vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg bg-[#F4F4F4]"
                                                    loading="lazy"
                                                    quality={75}
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
                                        </div>
                                    </div>
                                    {/* Nome do produto - título principal */}
                                    <div className="px-2 sm:px-3 md:px-4 flex flex-col">
                                        <div className="flex-grow-0 mb-2 sm:mb-2.5">
                                            <h3 className="font-bold text-gray-900 uppercase text-xs sm:text-sm md:text-base leading-tight text-center min-h-[1.75rem] sm:min-h-[2rem] md:min-h-[2.25rem] flex items-center justify-center line-clamp-2">
                                                {t(`productNames.${product.slug}`, { defaultValue: product.name })}
                                            </h3>
                                        </div>
                                        {/* Preço destacado */}
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
                                                    discount={product.variations?.[0]?.discount}
                                                    discountType={product.variations?.[0]?.promotion?.discountType}
                                                    size="md"
                                                    showBadge={true}
                                                    showDiscountBadge={false}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            {/* Botão full-width sempre alinhado na base, fora do link */}
                            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 mt-auto">
                                <Button
                                    className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-bold py-2 text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 hover:shadow-lg rounded-lg cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddToCart(product);
                                    }}
                                >
                                    <span className="sm:hidden">{t('nav.cart', 'CARRINHO')}</span>
                                    <span className="hidden sm:inline">{t('product.addToCart', 'ADICIONAR AO CARRINHO')}</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {showViewAll && hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="bg-[#8FBC8F] mt-8 sm:mt-10 flex items-center justify-center p-2 sm:p-3 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto rounded-full gap-2 sm:gap-3 hover:bg-[#7DAB7D] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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