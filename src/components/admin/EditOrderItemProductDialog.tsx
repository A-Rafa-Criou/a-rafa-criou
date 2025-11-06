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
            // Buscar produtos COM variações incluídas
            const response = await fetch('/api/admin/products?status=all&include=variations')
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Editar Produto do Pedido</DialogTitle>
                    <DialogDescription>
                        Produto atual: <strong>{currentProductName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 overflow-y-auto flex-1">{/* Scroll aqui */}
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
                    <div className="space-y-2">
                        <Label htmlFor="product">Selecionar Produto</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger id="product" className="h-14">
                                <SelectValue placeholder="Escolha um produto..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {loading ? (
                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                ) : filteredProducts.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhum produto encontrado</SelectItem>
                                ) : (
                                    filteredProducts.map(product => (
                                        <SelectItem key={product.id} value={product.id}>
                                            <div className="flex flex-col gap-1 py-1">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium">{product.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 ml-6">
                                                    {product.hasVariations ? (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {product.variations?.length || 0} variações
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Sem variações
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {selectedProduct && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                    ✅ Produto selecionado: {selectedProduct.name}
                                </p>
                                {selectedProduct.hasVariations ? (
                                    <p className="text-xs text-blue-700 mt-1">
                                        {selectedProduct.variations?.length || 0} variações disponíveis - selecione uma abaixo
                                    </p>
                                ) : (
                                    <p className="text-xs text-red-700 mt-1">
                                        ⚠️ Este produto não possui variações configuradas
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Seleção de Variação (se aplicável) */}
                    {hasVariations && (
                        <div className="space-y-2">
                            <Label htmlFor="variation">Selecionar Variação *</Label>
                            <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                                <SelectTrigger id="variation" className="h-14">
                                    <SelectValue placeholder="Escolha uma variação..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {variations.length === 0 ? (
                                        <SelectItem value="empty" disabled>Nenhuma variação disponível</SelectItem>
                                    ) : (
                                        variations.map(variation => (
                                            <SelectItem key={variation.id} value={variation.id}>
                                                <div className="flex flex-col gap-1 py-1">
                                                    <span className="font-medium">{variation.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        R$ {parseFloat(variation.price).toFixed(2)}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedVariationId && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-medium text-green-900">
                                        ✅ Variação selecionada: {variations.find(v => v.id === selectedVariationId)?.name}
                                    </p>
                                    <p className="text-xs text-green-700 mt-1">
                                        Preço: R$ {parseFloat(variations.find(v => v.id === selectedVariationId)?.price || '0').toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Informação de preço */}
                    {selectedProduct && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💰</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-yellow-900 mb-2">
                                        Resumo da Atualização:
                                    </p>
                                    <div className="space-y-1 text-sm text-yellow-800">
                                        <p>
                                            <strong>Produto:</strong> {selectedProduct.name}
                                        </p>
                                        {hasVariations && (
                                            <p>
                                                <strong>Variação:</strong>{' '}
                                                {selectedVariationId 
                                                    ? variations.find(v => v.id === selectedVariationId)?.name || 'Não encontrada'
                                                    : <span className="text-red-600">Selecione uma variação</span>
                                                }
                                            </p>
                                        )}
                                        <p className="text-base font-bold mt-2 pt-2 border-t border-yellow-300">
                                            <strong>Novo preço:</strong>{' '}
                                            {selectedVariationId ? (
                                                <>R$ {parseFloat(variations.find(v => v.id === selectedVariationId)?.price || '0').toFixed(2)}</>
                                            ) : (
                                                <span className="text-red-600">Selecione uma variação</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-xs text-yellow-700 mt-2 italic">
                                        ⚠️ O total do pedido será recalculado automaticamente
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={!selectedProductId || (hasVariations && !selectedVariationId) || updating}
                    >
                        {updating ? 'Atualizando...' : 'Atualizar Produto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
