'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Eye,
    Trash2,
    FileText,
    Loader2,
    Package,
    Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import EditProductDialog from '@/components/admin/EditProductDialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface FileData {
    id: string
    originalName: string
    size: number
    mimeType: string
    cloudflareId?: string
}

interface ImageData {
    id: string
    data?: string
    url?: string
    cloudinaryId?: string
    mimeType?: string
    alt?: string
    isMain?: boolean
}

interface VariationData {
    id: string
    productId: string
    name: string
    slug: string
    price: number
    isActive: boolean
    files?: FileData[]
    images?: ImageData[]
}

interface ProductData {
    id: string
    name: string
    slug: string
    price: number
    isActive: boolean
    isFeatured: boolean
    categoryId?: string
    files?: FileData[]
    variations?: VariationData[]
    images?: ImageData[]
}

interface ProductsTableProps {
    search?: string
    category?: string
    page?: number
    onRefresh?: () => void
    refreshTrigger?: number
}

export default function ProductsCardsView({
    search = '',
    category = '',
    page = 1,
    onRefresh,
    refreshTrigger = 0
}: ProductsTableProps) {
    const [products, setProducts] = useState<ProductData[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [deletingProduct, setDeletingProduct] = useState<string | null>(null)
    const [editingProduct, setEditingProduct] = useState<ProductData | null>(null)
    const [cardsError, setCardsError] = useState<string | null>(null)
    const observerTarget = useRef<HTMLDivElement>(null)

    // Fetch products from API (primeira página)
    useEffect(() => {
        async function fetchProducts() {
            try {
                setLoading(true)
                setCurrentPage(1)
                setHasMore(true)
                const params = new URLSearchParams()
                if (search) params.append('search', search)
                if (category) params.append('category', category)
                params.append('page', '1')
                params.append('limit', '15') // 15 produtos por página
                params.append('include', 'variations,files')

                const queryString = params.toString()
                const url = `/api/admin/products${queryString ? `?${queryString}` : ''}`

                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error('Erro ao buscar produtos')
                }
                const data = await response.json()
                const newProducts = data.products || data
                setProducts(newProducts)
                setHasMore(newProducts.length === 15) // Se retornou 15, pode ter mais
            } catch {
                setProducts([])
                setHasMore(false)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [search, category, refreshTrigger])

    // Carregar mais produtos (scroll infinito)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return

        try {
            setLoadingMore(true)
            const nextPage = currentPage + 1
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (category) params.append('category', category)
            params.append('page', nextPage.toString())
            params.append('limit', '15')
            params.append('include', 'variations,files')

            const queryString = params.toString()
            const url = `/api/admin/products${queryString ? `?${queryString}` : ''}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Erro ao carregar mais produtos')

            const data = await response.json()
            const newProducts = data.products || data

            if (newProducts.length === 0) {
                setHasMore(false)
            } else {
                setProducts(prev => [...prev, ...newProducts])
                setCurrentPage(nextPage)
                setHasMore(newProducts.length === 15)
            }
        } catch (error) {
            console.error('Erro ao carregar mais produtos:', error)
            setHasMore(false)
        } finally {
            setLoadingMore(false)
        }
    }, [loadingMore, hasMore, currentPage, search, category])

    // Intersection Observer para scroll infinito
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore()
                }
            },
            { threshold: 0.1 }
        )

        const currentTarget = observerTarget.current
        if (currentTarget) {
            observer.observe(currentTarget)
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget)
            }
        }
    }, [hasMore, loadingMore, loadMore])

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price)
    }

    // Função para calcular o preço correto do produto (menor preço entre variações ou preço base)
    const getProductPrice = (product: ProductData) => {
        // Se tem variações, pegar o menor preço
        if (product.variations && product.variations.length > 0) {
            const prices = product.variations.map(v => Number(v.price))
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)

            // Se todos os preços são iguais, retorna só o preço
            if (minPrice === maxPrice) {
                return { min: minPrice, max: null, hasRange: false }
            }

            // Se tem faixa de preço, retorna o range
            return { min: minPrice, max: maxPrice, hasRange: true }
        }

        // Se não tem variações, retorna o preço base do produto
        return { min: Number(product.price), max: null, hasRange: false }
    }

    const formatProductPrice = (product: ProductData) => {
        const priceData = getProductPrice(product)

        if (priceData.hasRange && priceData.max) {
            return `${formatPrice(priceData.min)} - ${formatPrice(priceData.max)}`
        }

        return formatPrice(priceData.min)
    }

    const refreshProducts = async () => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (category) params.append('category', category)
        if (page > 1) params.append('page', page.toString())
        params.append('include', 'variations,files')
        params.append('_t', Date.now().toString()) // 🔄 Cache buster

        const queryString = params.toString()
        const url = `/api/admin/products${queryString ? `?${queryString}` : ''}`

        try {
            const response = await fetch(url, {
                cache: 'no-store', // 🔄 Força dados atualizados
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            })
            if (response.ok) {
                const data = await response.json()
                setProducts(data.products || data)
                console.log('✅ [PRODUCTS] Lista atualizada:', data.products?.length || 0)
            }
        } catch (error) {
            console.error('❌ [PRODUCTS] Erro ao atualizar:', error)
            // Failed to refresh products
        }
    }

    const handleDelete = async (productId: string, isActive: boolean) => {
        // 🚨 CONFIRMAÇÃO DIFERENTE: Soft delete vs Hard delete
        if (isActive) {
            // Produto ATIVO: Soft delete (desativar)
            const confirmDeactivate = confirm(
                '⚠️ DESATIVAR PRODUTO\n\n' +
                'O produto será DESATIVADO e não aparecerá mais na loja.\n' +
                'Os arquivos serão DELETADOS do Cloudflare R2.\n\n' +
                'O produto permanecerá no banco de dados e poderá ser reativado.\n\n' +
                'Confirma a DESATIVAÇÃO?'
            )
            if (!confirmDeactivate) return
        } else {
            // Produto INATIVO: Hard delete (exclusão permanente)
            const confirmPermanentDelete = confirm(
                '🔴 EXCLUSÃO PERMANENTE\n\n' +
                'ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n' +
                'Este produto está INATIVO.\n' +
                'Confirmar irá EXCLUIR PERMANENTEMENTE do banco de dados!\n\n' +
                'Todos os dados serão perdidos para sempre:\n' +
                '- Produto e variações\n' +
                '- Imagens e traduções\n' +
                '- Metadados e relacionamentos\n\n' +
                'Esta ação NÃO PODE SER DESFEITA.\n\n' +
                'Tem certeza que deseja EXCLUIR PERMANENTEMENTE?'
            )
            if (!confirmPermanentDelete) return
        }

        try {
            setDeletingProduct(productId)

            // Se produto INATIVO, adicionar ?permanent=true
            const endpoint = isActive
                ? `/api/admin/products/${productId}`
                : `/api/admin/products/${productId}?permanent=true`

            console.log('🗑️ Delete request:', { productId, isActive, endpoint })

            const response = await fetch(endpoint, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao excluir produto')
            }

            const result = await response.json()

            // Mensagem diferente dependendo do tipo de exclusão
            if (result.permanentlyDeleted) {
                console.log('✅ Produto excluído permanentemente')
            } else {
                console.log('✅ Produto desativado (soft delete)')
            }

            await refreshProducts()
            onRefresh?.()
        } catch (error) {
            setCardsError(error instanceof Error ? error.message : 'Erro ao excluir produto. Tente novamente.')
        } finally {
            setDeletingProduct(null)
        }
    }

    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!products || products.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="flex flex-col items-center space-y-4">
                    <div className="rounded-full bg-gray-100 p-6">
                        <Package className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {search || category ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                        </h3>
                        <p className="text-gray-500 max-w-md">
                            {search || category
                                ? 'Tente ajustar os filtros para encontrar produtos.'
                                : 'Comece criando seu primeiro produto digital.'
                            }
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {cardsError && (
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{cardsError}</AlertDescription>
                </Alert>
            )}
            {/* Grid de Cards - Mobile/Tablet: lista, Desktop: grid */}
            <div className="space-y-3 md:space-y-0 md:grid md:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => {
                    // Buscar primeira imagem de capa do produto (mesma da home)
                    const getProductImage = () => {
                        if (product.images && product.images.length > 0) {
                            // Buscar imagem principal (isMain) ou primeira com URL válida
                            const mainImage = product.images.find(img => img.url || img.data)
                            if (mainImage) {
                                // Se tem URL do Cloudinary, usar direto
                                if (mainImage.url) {
                                    return mainImage.url
                                }
                                // Fallback: se ainda tiver base64 (imagens antigas)
                                if (mainImage.data) {
                                    // Verificar se já é uma URL (http/https) ou data URI
                                    if (mainImage.data.startsWith('http') || mainImage.data.startsWith('data:')) {
                                        return mainImage.data
                                    }
                                    // Se for base64 puro, montar data URI
                                    const mimeType = mainImage.mimeType || 'image/jpeg'
                                    return `data:${mimeType};base64,${mainImage.data}`
                                }
                            }
                        }
                        return null
                    }

                    const productImage = getProductImage()
                    return (
                        <Card key={product.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-[#FED466] overflow-hidden">
                            {/* Layout Mobile/Tablet - Lista Horizontal */}
                            <div className="md:hidden flex items-center gap-3 p-3">
                                <Link href={`/admin/produtos/${product.id}`} className="flex-shrink-0">
                                    <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden ring-1 ring-gray-200 hover:ring-[#FED466] transition-all">
                                        {productImage ? (
                                            <Image src={productImage} alt={product.name} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <Link href={`/admin/produtos/${product.id}`} className="block">
                                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight hover:text-[#FD9555] transition-colors">
                                            {product.name}
                                        </h3>
                                    </Link>

                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-xs font-medium ${product.isActive ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                                            {product.isActive ? "● Ativo" : "○ Inativo"}
                                        </Badge>
                                        {product.variations && product.variations.length > 0 && (
                                            <Badge variant="outline" className="text-xs font-medium border-blue-200 bg-blue-50 text-blue-700">
                                                {product.variations.length} var.
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="text-lg font-bold text-[#FD9555]">{formatProductPrice(product)}</div>

                                    <div className="flex items-center gap-1.5">
                                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" asChild>
                                            <Link href={`/admin/produtos/${product.id}`}>
                                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                <span>Ver</span>
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium bg-[#FED466] text-gray-900 border-[#FD9555] hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" onClick={() => setEditingProduct(product)}>
                                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                            <span>Editar</span>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium bg-red-50 text-red-700 border-red-200 hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" disabled={deletingProduct === product.id}>
                                                    {deletingProduct === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" /><span>Excluir</span></>}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>
                                                        {product.isActive ? 'Confirmar desativação' : '🔴 Confirmar exclusão permanente'}
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {product.isActive
                                                            ? `Tem certeza que deseja DESATIVAR o produto "${product.name}"? Os arquivos serão deletados, mas o produto permanecerá no banco.`
                                                            : `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL! O produto "${product.name}" será EXCLUÍDO PERMANENTEMENTE do banco de dados. Esta ação NÃO PODE SER DESFEITA.`
                                                        }
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(product.id, product.isActive)} className="bg-red-600 hover:bg-red-700 cursor-pointer">
                                                        {product.isActive ? 'Desativar' : 'Excluir Permanentemente'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>

                            {/* Layout Desktop - Card Vertical */}
                            <div className="hidden md:block">
                                <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                                    {productImage ? (
                                        <Image src={productImage} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-200" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FileText className="h-10 w-10 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-1.5 right-1.5">
                                        <Badge className={`text-xs shadow-sm ${product.isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
                                            {product.isActive ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </div>
                                </div>

                                <CardHeader className="px-2">
                                    <CardTitle className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{product.name}</CardTitle>
                                </CardHeader>

                                <CardContent className="px-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="text-base font-bold text-[#FD9555]">{formatProductPrice(product)}</div>
                                        {product.variations && product.variations.length > 0 && (
                                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                {product.variations.length} var.
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" asChild>
                                            <Link href={`/admin/produtos/${product.id}`}>
                                                <Eye className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-medium bg-[#FED466] text-gray-900 border-[#FD9555] hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" onClick={() => setEditingProduct(product)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-red-50 text-red-700 border-red-200 hover:border-[#FED466] hover:shadow-md cursor-pointer transition-all duration-200" disabled={deletingProduct === product.id}>
                                                    {deletingProduct === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>
                                                        {product.isActive ? 'Confirmar desativação' : '🔴 Confirmar exclusão permanente'}
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {product.isActive
                                                            ? `Tem certeza que deseja DESATIVAR o produto "${product.name}"? Os arquivos serão deletados, mas o produto permanecerá no banco.`
                                                            : `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL! O produto "${product.name}" será EXCLUÍDO PERMANENTEMENTE do banco de dados. Esta ação NÃO PODE SER DESFEITA.`
                                                        }
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(product.id, product.isActive)} className="bg-red-600 hover:bg-red-700 cursor-pointer">
                                                        {product.isActive ? 'Desativar' : 'Excluir Permanentemente'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Área de paginação - Botão "Carregar mais" + Scroll infinito */}
            {hasMore && (
                <div className="w-full flex flex-col items-center justify-center gap-2 pt-8 pb-6 border-t border-gray-200">
                    <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        size="lg"
                        className="w-full max-w-md bg-[#FED466] hover:bg-[#FD9555] text-gray-900 font-semibold px-8 py-6 shadow-md hover:shadow-lg transition-all rounded-lg cursor-pointer"
                    >
                        {loadingMore ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Carregando produtos...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span>Carregar mais produtos</span>
                                <span className="text-sm opacity-70">(15 por vez)</span>
                            </div>
                        )}
                    </Button>
                    <p className="text-xs text-gray-500 font-medium mt-0">
                        Exibindo {products.length} de muitos produtos · Página {currentPage}
                    </p>
                </div>
            )}

            {/* Trigger invisível para scroll infinito automático */}
            <div ref={observerTarget} className="h-4" />

            {!hasMore && products.length > 0 && (
                <div className="w-full text-center py-8 border-t border-gray-200">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-50 border border-green-200">
                        <span className="text-green-600 font-medium">✓</span>
                        <p className="text-sm text-green-700 font-medium">
                            Todos os {products.length} produtos foram carregados
                        </p>
                    </div>
                </div>
            )}

            {/* EditProductDialog - Movido para fora do loop */}
            {editingProduct && (
                <EditProductDialog
                    product={editingProduct}
                    open={!!editingProduct}
                    onOpenChange={(open) => !open && setEditingProduct(null)}
                    onSuccess={() => {
                        setEditingProduct(null)
                        refreshProducts()
                    }}
                />
            )}
        </div>
    )
}