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
    basePrice: string
    hasVariations: boolean
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
    }, [selectedProductId])

    const loadProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/products?status=all')
            if (response.ok) {
                const data = await response.json()
                setProducts(data.products || [])
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadVariations = async (productId: string) => {
        try {
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
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar Produto do Pedido</DialogTitle>
                    <DialogDescription>
                        Produto atual: <strong>{currentProductName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
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
                            <SelectTrigger id="product">
                                <SelectValue placeholder="Escolha um produto..." />
                            </SelectTrigger>
                            <SelectContent>
                                {loading ? (
                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                ) : filteredProducts.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhum produto encontrado</SelectItem>
                                ) : (
                                    filteredProducts.map(product => (
                                        <SelectItem key={product.id} value={product.id}>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                <span>{product.name}</span>
                                                <Badge variant="outline" className="ml-auto">
                                                    R$ {parseFloat(product.basePrice).toFixed(2)}
                                                </Badge>
                                                {product.hasVariations && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Com variações
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Seleção de Variação (se aplicável) */}
                    {hasVariations && (
                        <div className="space-y-2">
                            <Label htmlFor="variation">Selecionar Variação</Label>
                            <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                                <SelectTrigger id="variation">
                                    <SelectValue placeholder="Escolha uma variação..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {variations.length === 0 ? (
                                        <SelectItem value="empty" disabled>Nenhuma variação disponível</SelectItem>
                                    ) : (
                                        variations.map(variation => (
                                            <SelectItem key={variation.id} value={variation.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{variation.name}</span>
                                                    <Badge variant="outline" className="ml-auto">
                                                        R$ {parseFloat(variation.price).toFixed(2)}
                                                    </Badge>
                                                    {variation.stock !== null && (
                                                        <Badge variant={variation.stock > 0 ? 'default' : 'destructive'}>
                                                            {variation.stock > 0 ? `${variation.stock} em estoque` : 'Sem estoque'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Informação de preço */}
                    {selectedProduct && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <strong>Novo preço:</strong>{' '}
                                R$ {selectedVariationId
                                    ? parseFloat(variations.find(v => v.id === selectedVariationId)?.price || '0').toFixed(2)
                                    : parseFloat(selectedProduct.basePrice).toFixed(2)}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                O total do pedido será recalculado automaticamente
                            </p>
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
