'use client'

import { useState, useEffect } from 'react'
import { Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Product {
    id: string
    name: string
    slug: string
    hasVariations: boolean
    variations?: Variation[]
}

interface Variation {
    id: string
    name: string
    price: string
    stock: number | null
    files?: { id: string; path: string; originalName?: string }[]
}

interface EditOrderItemProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: string
    orderItemId: string
    currentProductName: string
    onSuccess: () => void
}

export default function EditOrderItemProductDialog({
    open,
    onOpenChange,
    orderId,
    orderItemId,
    currentProductName,
    onSuccess
}: EditOrderItemProductDialogProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [variations, setVariations] = useState<Variation[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [selectedVariationId, setSelectedVariationId] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)

    // Buscar produtos
    useEffect(() => {
        if (open) {
            loadProducts()
        }
    }, [open])

    // Buscar variações quando produto é selecionado
    useEffect(() => {
        if (selectedProductId) {
            loadVariations(selectedProductId)
        } else {
            setVariations([])
            setSelectedVariationId('')
        }
    }, [selectedProductId, products]) // eslint-disable-line react-hooks/exhaustive-deps

    const loadProducts = async () => {
        try {
            setLoading(true)
            // Buscar produtos COM variações E arquivos incluídos - limite alto para pegar todos
            const response = await fetch('/api/admin/products?status=all&include=variations,files&limit=200')
            if (response.ok) {
                const data = await response.json()
                // Mapear produtos para incluir informação se tem variações
                const productsData = (data.products || []).map((p: { id: string; name: string; slug: string; variations?: Variation[] }) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    hasVariations: p.variations && p.variations.length > 0,
                    variations: p.variations || []
                }))
                setProducts(productsData)
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadVariations = async (productId: string) => {
        try {
            // Buscar variações do produto selecionado
            // Primeiro, tentar pegar do cache local (já veio com o produto)
            const product = products.find(p => p.id === productId)
            if (product && product.variations && product.variations.length > 0) {
                setVariations(product.variations)
                return
            }

            // Se não tiver no cache, buscar da API
            const response = await fetch(`/api/admin/products/${productId}/variations`)
            if (response.ok) {
                const data = await response.json()
                setVariations(data.variations || [])
            }
        } catch (error) {
            console.error('Erro ao carregar variações:', error)
        }
    }

    const handleUpdate = async () => {
        if (!selectedProductId) return

        try {
            setUpdating(true)
            const response = await fetch(`/api/admin/orders/${orderId}/items/${orderItemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProductId,
                    variationId: selectedVariationId || null
                })
            })

            if (response.ok) {
                onSuccess()
                onOpenChange(false)
                setSelectedProductId('')
                setSelectedVariationId('')
            } else {
                const error = await response.json()
                alert(error.message || 'Erro ao atualizar produto')
            }
        } catch (error) {
            console.error('Erro ao atualizar produto:', error)
            alert('Erro ao atualizar produto')
        } finally {
            setUpdating(false)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const selectedProduct = products.find(p => p.id === selectedProductId)
    const hasVariations = selectedProduct?.hasVariations

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full sm:w-[500px] sm:max-w-[calc(100vw-2rem)] sm:h-auto sm:max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-base sm:text-lg">Editar Produto do Pedido</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Produto atual: <strong className="break-words">{currentProductName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 overflow-y-auto overflow-x-hidden flex-1">{/* Scroll aqui */}
                    {/* Busca de Produtos */}
                    <div className="space-y-2">
                        <Label htmlFor="search">Buscar Produto</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                id="search"
                                placeholder="Digite o nome do produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Seleção de Produto */}
                    <div className="space-y-2 min-w-0">
                        <Label htmlFor="product" className="text-sm">Selecionar Produto</Label>
                        <Select value={selectedProductId} onValueChange={(value) => {
                            setSelectedProductId(value)
                            setSelectedVariationId('') // Reset variation when changing product
                        }}>
                            <SelectTrigger id="product" className="h-auto min-h-[3rem] py-2 w-full">
                                <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
                                    <SelectValue placeholder="Escolha um produto..." className="truncate flex-1 text-left" />
                                    {selectedProduct && (
                                        <Badge
                                            variant={selectedProduct.hasVariations ? "secondary" : "destructive"}
                                            className="text-xs flex-shrink-0 ml-auto"
                                        >
                                            {selectedProduct.hasVariations
                                                ? `${selectedProduct.variations?.length || 0} var.`
                                                : 'Sem var.'
                                            }
                                        </Badge>
                                    )}
                                </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] w-[calc(100vw-3rem)] sm:w-[468px] max-w-[calc(100vw-3rem)]" align="start" side="bottom" sideOffset={4}>
                                {loading ? (
                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                ) : filteredProducts.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhum produto encontrado</SelectItem>
                                ) : (
                                    filteredProducts.map(product => (
                                        <SelectItem key={product.id} value={product.id} className="cursor-pointer">
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <Package className="w-4 h-4 flex-shrink-0" />
                                                <span className="font-medium text-sm truncate flex-1">{product.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Seleção de Variação (se aplicável) */}
                    {hasVariations && (
                        <div className="space-y-2 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="variation" className="text-sm">Selecionar Variação *</Label>
                                {selectedVariationId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedVariationId('')}
                                        className="h-6 text-[10px] sm:text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                    >
                                        Limpar
                                    </Button>
                                )}
                            </div>
                            <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                                <SelectTrigger id="variation" className="h-auto min-h-[3rem] py-2 w-full">
                                    <SelectValue placeholder="Escolha uma variação..." className="truncate" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] w-[calc(100vw-3rem)] sm:w-[468px] max-w-[calc(100vw-3rem)]" align="start" side="bottom" sideOffset={4}>
                                    {variations.length === 0 ? (
                                        <SelectItem value="empty" disabled>Nenhuma variação disponível</SelectItem>
                                    ) : (
                                        variations.map(variation => {
                                            // Se a variação não tem nome, tentar usar o nome do primeiro arquivo
                                            let displayName = variation.name
                                            if (!displayName && variation.files && variation.files.length > 0) {
                                                displayName = variation.files[0].originalName?.replace(/\.pdf$/i, '') || 'Sem nome'
                                            }
                                            if (!displayName) displayName = 'Variação sem nome'

                                            return (
                                                <SelectItem key={variation.id} value={variation.id} className="cursor-pointer">
                                                    <div className="flex items-center justify-between gap-2 w-full py-1 min-w-0">
                                                        <span className="font-medium text-sm truncate flex-1 min-w-0">{displayName}</span>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Badge variant="outline" className="text-xs">
                                                                R$ {parseFloat(variation.price).toFixed(2)}
                                                            </Badge>
                                                            {variation.files && variation.files.length > 0 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {variation.files.length} PDF{variation.files.length > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Informação de preço */}
                    {selectedProduct && (
                        <div className="p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg overflow-hidden">
                            <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                                <div className="text-xl sm:text-2xl flex-shrink-0">💰</div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-xs sm:text-sm font-bold text-yellow-900 mb-2">
                                        Resumo da Atualização:
                                    </p>
                                    <div className="space-y-1 text-xs sm:text-sm text-yellow-800">
                                        <p className="break-words">
                                            <strong>Produto:</strong> {selectedProduct.name}
                                        </p>
                                        {hasVariations && (
                                            <>
                                                <p className="break-words">
                                                    <strong>Variação:</strong>{' '}
                                                    {selectedVariationId ? (() => {
                                                        const selectedVar = variations.find(v => v.id === selectedVariationId)
                                                        if (!selectedVar) return 'Não encontrada'
                                                        let displayName = selectedVar.name
                                                        if (!displayName && selectedVar.files && selectedVar.files.length > 0) {
                                                            displayName = selectedVar.files[0].originalName?.replace(/\.pdf$/i, '') || 'Sem nome'
                                                        }
                                                        return displayName || 'Variação sem nome'
                                                    })() : <span className="text-red-600">Selecione uma variação</span>}
                                                </p>
                                                {selectedVariationId && (() => {
                                                    const selectedVar = variations.find(v => v.id === selectedVariationId)
                                                    return selectedVar?.files && selectedVar.files.length > 0 ? (
                                                        <p className="break-words">
                                                            <strong>PDFs inclusos:</strong> {selectedVar.files.length} arquivo{selectedVar.files.length > 1 ? 's' : ''}
                                                        </p>
                                                    ) : null
                                                })()}
                                            </>
                                        )}
                                        <p className="text-sm sm:text-base font-bold mt-2 pt-2 border-t border-yellow-300">
                                            <strong>Novo preço:</strong>{' '}
                                            {selectedVariationId ? (
                                                <>R$ {parseFloat(variations.find(v => v.id === selectedVariationId)?.price || '0').toFixed(2)}</>
                                            ) : (
                                                <span className="text-red-600">Selecione uma variação</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-yellow-700 mt-2 italic">
                                        ⚠️ O total do pedido será recalculado automaticamente
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 flex-shrink-0 mt-auto pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updating}
                        className="w-full sm:w-auto h-12 sm:h-10 text-sm order-2 sm:order-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={!selectedProductId || (hasVariations && !selectedVariationId) || updating}
                        className="w-full sm:w-auto h-12 sm:h-10 text-sm order-1 sm:order-2"
                    >
                        {updating ? 'Atualizando...' : 'Atualizar Produto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
