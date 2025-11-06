'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, PackageSearch } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getPreviewSrc } from '@/lib/r2-utils';
import { useCart } from '@/contexts/cart-context';
import { useCurrency } from '@/contexts/currency-context';
import { AddToCartSheet } from '@/components/sections/AddToCartSheet';
import { FavoriteButton } from '@/components/FavoriteButton';
import { useTranslation } from 'react-i18next';

interface ProductVariation {
    id: string;
    name: string;
    slug: string;
    price: number;
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

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function ProductsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { convertPrice, formatPrice } = useCurrency();
    const { openCartSheet } = useCart();
    const { t } = useTranslation('common');

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showAddToCart, setShowAddToCart] = useState(false);

    // Filtros
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoria') || 'todas');
    const [sortBy, setSortBy] = useState(searchParams.get('ordem') || 'recentes');
    const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
    const [page, setPage] = useState(parseInt(searchParams.get('pagina') || '1'));

    const ITEMS_PER_PAGE = 12;

    // Carregar categorias
    useEffect(() => {
        async function loadCategories() {
            try {
                const response = await fetch('/api/categories');
                if (response.ok) {
                    const data = await response.json();
                    setCategories(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
            }
        }
        loadCategories();
    }, []);

    // Carregar produtos
    useEffect(() => {
        async function loadProducts() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                // Pega busca da URL (vinda do header)
                const searchParam = searchParams.get('q') || searchParams.get('query') || '';
                if (searchParam) params.set('q', searchParam);
                if (categoryFilter && categoryFilter !== 'todas') params.set('categoria', categoryFilter);
                if (sortBy) params.set('ordem', sortBy);
                if (minPrice) params.set('min', minPrice);
                if (maxPrice) params.set('max', maxPrice);
                params.set('pagina', page.toString());
                params.set('limite', ITEMS_PER_PAGE.toString());

                const response = await fetch(`/api/products?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data.products || []);
                    setTotalProducts(data.total || 0);
                }
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProducts();
    }, [searchParams, categoryFilter, sortBy, minPrice, maxPrice, page]);

    // Atualizar URL quando filtros mudarem
    useEffect(() => {
        const params = new URLSearchParams();
        // Preserva busca da URL (vinda do header)
        const searchParam = searchParams.get('q') || searchParams.get('query') || '';
        if (searchParam) params.set('q', searchParam);
        if (categoryFilter && categoryFilter !== 'todas') params.set('categoria', categoryFilter);
        if (sortBy && sortBy !== 'recentes') params.set('ordem', sortBy);
        if (minPrice) params.set('min', minPrice);
        if (maxPrice) params.set('max', maxPrice);
        if (page > 1) params.set('pagina', page.toString());

        const queryString = params.toString();
        router.push(`/produtos${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, [searchParams, categoryFilter, sortBy, minPrice, maxPrice, page, router]);

    const handleClearFilters = () => {
        setCategoryFilter('todas');
        setSortBy('recentes');
        setMinPrice('');
        setMaxPrice('');
        setPage(1);
        router.push('/produtos', { scroll: false });
    };

    const handleAddToCart = (product: Product) => {
        setSelectedProduct(product);
        setShowAddToCart(true);
    };

    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-[#F4F4F4] py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Breadcrumbs */}
                <Breadcrumbs items={[{ label: 'Produtos' }]} />

                {/* Barra de Filtros */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    {/* Filtros Desktop - Tudo em uma linha */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Ordenação */}
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('catalog.sortBy', 'Ordenar por')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recentes">{t('catalog.mostRecent', 'Mais Recentes')}</SelectItem>
                                <SelectItem value="antigos">{t('catalog.oldest', 'Mais Antigos')}</SelectItem>
                                <SelectItem value="preco-asc">{t('catalog.lowestPrice', 'Menor Preço')}</SelectItem>
                                <SelectItem value="preco-desc">{t('catalog.highestPrice', 'Maior Preço')}</SelectItem>
                                <SelectItem value="nome-asc">{t('catalog.nameAZ', 'Nome (A-Z)')}</SelectItem>
                                <SelectItem value="nome-desc">{t('catalog.nameZA', 'Nome (Z-A)')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Categoria */}
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('catalog.category', 'Categoria')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">{t('catalog.allCategories', 'Todas Categorias')}</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.slug}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Faixa de Preço */}
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder={t('catalog.priceMin', 'Preço mín (R$)')}
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-[140px]"
                                min="0"
                                step="0.01"
                            />
                            <span className="text-gray-500 text-sm">{t('catalog.to', 'até')}</span>
                            <Input
                                type="number"
                                placeholder={t('catalog.priceMax', 'Preço máx (R$)')}
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-[140px]"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Limpar Filtros */}
                        {(categoryFilter !== 'todas' || sortBy !== 'recentes' || minPrice || maxPrice || searchParams.get('q')) && (
                            <Button
                                variant="ghost"
                                onClick={handleClearFilters}
                                className="ml-auto"
                            >
                                {t('catalog.clearFilters', 'Limpar Filtros')}
                            </Button>
                        )}
                    </div>

                    {/* Botão Filtros Mobile */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="md:hidden w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white border-none">
                                <SlidersHorizontal className="w-4 h-4 mr-2" />
                                {t('catalog.filters', 'Filtros')}
                            </Button>
                        </SheetTrigger>
                            <SheetContent side="left" className="w-80 bg-[#F4F4F4] px-6">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="text-[#FD9555] text-xl font-bold">{t('catalog.filters', 'Filtros')}</SheetTitle>
                                    <SheetDescription className="text-gray-600">
                                        {t('catalog.refineSearch', 'Refine sua busca por categoria e preço')}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="space-y-6">
                                    {/* Ordenação Mobile */}
                                    <div>
                                        <label className="text-sm font-bold mb-2 block text-gray-700">
                                            {t('catalog.sortBy', 'Ordenar por')}
                                        </label>
                                        <Select value={sortBy} onValueChange={setSortBy}>
                                            <SelectTrigger className="bg-white border-gray-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recentes">{t('catalog.mostRecent', 'Mais Recentes')}</SelectItem>
                                                <SelectItem value="antigos">{t('catalog.oldest', 'Mais Antigos')}</SelectItem>
                                                <SelectItem value="preco-asc">{t('catalog.lowestPrice', 'Menor Preço')}</SelectItem>
                                                <SelectItem value="preco-desc">{t('catalog.highestPrice', 'Maior Preço')}</SelectItem>
                                                <SelectItem value="nome-asc">{t('catalog.nameAZ', 'Nome (A-Z)')}</SelectItem>
                                                <SelectItem value="nome-desc">{t('catalog.nameZA', 'Nome (Z-A)')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Categoria Mobile */}
                                    <div>
                                        <label className="text-sm font-bold mb-2 block text-gray-700">
                                            {t('catalog.category', 'Categoria')}
                                        </label>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger className="bg-white border-gray-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todas">{t('catalog.all', 'Todas')}</SelectItem>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.slug}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Faixa de Preço Mobile */}
                                    <div>
                                        <label className="text-sm font-bold mb-2 block text-gray-700">
                                            {t('catalog.priceRange', 'Faixa de Preço (R$)')}
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder={t('catalog.min', 'Mín')}
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className="bg-white border-gray-200"
                                            />
                                            <Input
                                                type="number"
                                                placeholder={t('catalog.max', 'Máx')}
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className="bg-white border-gray-200"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                                        onClick={handleClearFilters}
                                    >
                                        {t('catalog.clearFilters', 'Limpar Filtros')}
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                </div>

                {/* Grid de Produtos */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                        {[...Array(8)].map((_, i) => (
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
                ) : products.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <PackageSearch className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {t('catalog.noProductsFound', 'Nenhum produto encontrado')}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {t('catalog.adjustFilters', 'Tente ajustar os filtros ou fazer uma nova busca')}
                        </p>
                        <Button onClick={handleClearFilters}>
                            {t('catalog.clearFilters', 'Limpar Filtros')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                            {products.map((product, index) => (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex flex-col justify-between"
                                >
                                    <div>
                                        <Link href={`/produtos/${product.slug}`} className="block group focus:outline-none focus:ring-2 focus:ring-primary">
                                            <div className="p-2 sm:p-3 md:p-4">
                                                <div className="aspect-square bg-gray-100 relative overflow-hidden group rounded-lg">
                                                    {product.mainImage && product.mainImage.data ? (
                                                        <Image
                                                            src={getPreviewSrc(product.mainImage.data)}
                                                            alt={product.mainImage.alt || product.name}
                                                            fill
                                                            sizes="(max-width: 768px) 50vw, 25vw"
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg bg-[#F4F4F4]"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full rounded-lg bg-[#F4F4F4]">
                                                            <span className="text-gray-400 text-sm">{t('catalog.noImage', 'Sem imagem')}</span>
                                                        </div>
                                                    )}

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

                                                    {index < 2 && page === 1 && (
                                                        <div className="absolute top-1.5 right-1.5 bg-[#FED466] text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                                            {t('catalog.new', 'NOVO')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-2 sm:px-3 md:px-4 flex flex-col">
                                                <div className="flex-grow-0 mb-1.5 sm:mb-2">
                                                    <h3 className="font-bold text-gray-900 uppercase text-xs sm:text-sm md:text-base leading-tight text-center min-h-[1.75rem] sm:min-h-[2rem] md:min-h-[2.25rem] flex items-center justify-center line-clamp-2">
                                                        {product.name}
                                                    </h3>
                                                </div>
                                                <div className="flex-grow-0 mb-2 text-center">
                                                    {product.category && (
                                                        <span className="text-xs bg-orange-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                                                            {product.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-grow-0 mb-2 sm:mb-2.5 text-center">
                                                    <span className="text-base sm:text-lg md:text-xl font-bold text-[#FD9555] block">
                                                        {product.variations && product.variations.length > 1 ? (
                                                            (() => {
                                                                const prices = product.variations.map(v => v.price);
                                                                const min = Math.min(...prices);
                                                                const max = Math.max(...prices);
                                                                const minConverted = convertPrice(min);
                                                                const maxConverted = convertPrice(max);
                                                                return min !== max
                                                                    ? `${formatPrice(minConverted)} - ${formatPrice(maxConverted)}`
                                                                    : formatPrice(minConverted);
                                                            })()
                                                        ) : (
                                                            formatPrice(convertPrice(product.price))
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 mt-auto">
                                        <Button
                                            className="w-full bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-bold py-2 text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 hover:shadow-lg rounded-lg cursor-pointer"
                                            onClick={() => handleAddToCart(product)}
                                        >
                                            <span className="sm:hidden">{t('catalog.cart', 'CARRINHO')}</span>
                                            <span className="hidden sm:inline">{t('catalog.addToCart', 'ADICIONAR AO CARRINHO')}</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    {t('catalog.previous', 'Anterior')}
                                </Button>

                                <div className="flex gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }

                                        return (
                                            <Button
                                                key={i}
                                                variant={page === pageNum ? 'default' : 'outline'}
                                                onClick={() => setPage(pageNum)}
                                                className="w-10"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    {t('catalog.next', 'Próxima')}
                                </Button>
                            </div>
                        )}
                    </>
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
        </div>
    );
}
