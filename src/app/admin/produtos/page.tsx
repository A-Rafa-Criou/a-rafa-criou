'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Plus,
    Search,
    Package,
    ShoppingBag,
    DollarSign,
    Trash2,
    RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import ProductsCards from '@/components/admin/ProductsCards'
import ProductForm from '@/components/admin/ProductForm'
import CategoryFilter from '@/components/admin/CategoryFilter'

interface Category {
    id: string
    name: string
    slug: string
    subcategories?: Category[]
}

interface ProductStats {
    total: number
    active: number
    inactive: number
    revenue: number
    productCount?: number
}

export default function ProductsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [debouncedSearch, setDebouncedSearch] = useState(search)
    const [category, setCategory] = useState(searchParams.get('category') || 'all')
    const [isNewProductOpen, setIsNewProductOpen] = useState(false)
    const [stats, setStats] = useState<ProductStats>({ total: 0, active: 0, inactive: 0, revenue: 0 })
    const [loading, setLoading] = useState(true)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [categories, setCategories] = useState<Category[]>([])
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Função auxiliar para buscar categoria recursivamente
    const findCategoryName = (categoryId: string, cats: Category[]): string | null => {
        for (const cat of cats) {
            if (cat.id === categoryId) return cat.name
            if (cat.subcategories) {
                const found = findCategoryName(categoryId, cat.subcategories)
                if (found) return found
            }
        }
        return null
    }

    // Debounce para pesquisa (aguarda 500ms após o usuário parar de digitar)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 500)

        return () => clearTimeout(timer)
    }, [search])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        setRefreshTrigger(prev => prev + 1)
        // Recarregar estatísticas
        try {
            const res = await fetch('/api/admin/products/stats')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } finally {
            setTimeout(() => setIsRefreshing(false), 500)
        }
    }

    // Carregar estatísticas e categorias
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, categoriesRes] = await Promise.all([
                    fetch('/api/admin/products/stats'),
                    fetch('/api/admin/categories')
                ])

                if (statsRes.ok) {
                    const data = await statsRes.json()
                    setStats(data)
                }

                if (categoriesRes.ok) {
                    const data = await categoriesRes.json()
                    console.log('📦 [PRODUTOS PAGE] Categorias carregadas:', data.length)
                    setCategories(data) // API retorna array direto, não objeto com .categories
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Auto-aplicar filtros quando mudarem (usando debouncedSearch)
    useEffect(() => {
        const params = new URLSearchParams()

        if (debouncedSearch) params.set('search', debouncedSearch)
        if (category && category !== 'all') params.set('category', category)

        const queryString = params.toString()
        const newURL = queryString ? `/admin/produtos?${queryString}` : '/admin/produtos'

        router.push(newURL, { scroll: false })
    }, [debouncedSearch, category, router])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-16 mb-2" />
                                <Skeleton className="h-8 w-12" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-linear-to-br from-[#FED466] to-[#FD9555] rounded-xl shadow-sm">
                        <Package className="w-7 h-7 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
                        <p className="text-gray-600 mt-1">Gerencie todo o catálogo da sua loja</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Atualizar dados"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen} modal={true}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#FED466] hover:bg-[#FD9555] text-gray-800 font-medium shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg"
                            onPointerDownOutside={(e) => {
                                // Permitir interação com Select dropdowns e outros popovers
                                const target = e.target as HTMLElement
                                if (target.closest('[role="listbox"]') ||
                                    target.closest('[role="dialog"]') ||
                                    target.closest('[data-radix-popper-content-wrapper]')) {
                                    e.preventDefault()
                                }
                            }}
                            onInteractOutside={(e) => {
                                // Permitir interação com Select dropdowns e file inputs
                                const target = e.target as HTMLElement
                                if (target.closest('[role="listbox"]') ||
                                    target.closest('[role="dialog"]') ||
                                    target.closest('[data-radix-popper-content-wrapper]') ||
                                    target.closest('input[type="file"]')) {
                                    e.preventDefault()
                                }
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Criar Novo Produto
                                </DialogTitle>
                                <DialogDescription>
                                    Preencha as informações abaixo para adicionar um novo produto ao catálogo
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-6">
                                {isNewProductOpen && (
                                    <ProductForm
                                        categories={categories}
                                        onSuccess={() => {
                                            setIsNewProductOpen(false)
                                            handleRefresh()
                                        }}
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm font-medium text-gray-600">Total de Produtos</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="p-2 md:p-3 bg-blue-100 rounded-full">
                                <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm font-medium text-gray-600">Produtos Ativos</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.active}</p>
                            </div>
                            <div className="p-2 md:p-3 bg-green-100 rounded-full">
                                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm font-medium text-gray-600">Produtos Inativos</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.inactive}</p>
                            </div>
                            <div className="p-2 md:p-3 bg-red-100 rounded-full">
                                <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#FED466]">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm font-medium text-gray-600">Valor Médio</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                    R$ {(stats.productCount && stats.productCount > 0) ? (stats.revenue / stats.productCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                </p>
                            </div>
                            <div className="p-2 md:p-3 bg-yellow-100 rounded-full">
                                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Produtos */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Catálogo de Produtos
                                <Badge variant="outline" className="ml-2">{stats.total}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Visualize e gerencie todos os produtos da sua loja
                            </CardDescription>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="space-y-3 pt-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Pesquisar por nome do produto..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                                {search !== debouncedSearch && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#FED466]"></div>
                                    </div>
                                )}
                            </div>
                            <CategoryFilter
                                categories={categories}
                                value={category}
                                onValueChange={setCategory}
                            />
                        </div>

                        {/* Indicador de filtros ativos */}
                        {(debouncedSearch || (category && category !== 'all')) && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Filtros ativos:</span>
                                {debouncedSearch && (
                                    <Badge variant="secondary" className="gap-1">
                                        Nome: {debouncedSearch}
                                        <button
                                            onClick={() => setSearch('')}
                                            className="ml-1 hover:text-red-600 transition-colors"
                                            aria-label="Remover filtro de nome"
                                        >
                                            ✕
                                        </button>
                                    </Badge>
                                )}
                                {category && category !== 'all' && (
                                    <Badge variant="secondary" className="gap-1">
                                        Categoria: {category === 'sem-categoria' ? 'Sem Categoria' : findCategoryName(category, categories) || category}
                                        <button
                                            onClick={() => setCategory('all')}
                                            className="ml-1 hover:text-red-600 transition-colors"
                                            aria-label="Remover filtro de categoria"
                                        >
                                            ✕
                                        </button>
                                    </Badge>
                                )}
                                <button
                                    onClick={() => {
                                        setSearch('')
                                        setCategory('all')
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                    Limpar todos
                                </button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ProductsCards
                        key={refreshTrigger}
                        search={debouncedSearch}
                        category={category === 'all' ? '' : category}
                        onRefresh={handleRefresh}
                        refreshTrigger={refreshTrigger}
                    />
                </CardContent>
            </Card>
        </div>
    )
}