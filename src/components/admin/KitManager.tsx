'use client'

import React, { useState } from 'react'
import { Trash2, Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface KitItem {
    id?: string
    itemProductId?: string
    itemVariationId?: string
    quantity: number
    sortOrder: number
    // Dados temporários para exibição (não salvos no DB)
    _productName?: string
    _variationName?: string
    _variationIndex?: number // Índice da variação no array do form
}

interface VariationForm {
    name: string
    price: string
    attributeValues: { attributeId: string; valueId: string }[]
    files: { file?: File; filename?: string; r2Key?: string }[]
    images: { file?: File; filename?: string; previewUrl?: string }[]
}

interface KitManagerProps {
    kitItems: KitItem[]
    availableVariations: VariationForm[] // Variações criadas no Step 3
    onChange: (items: KitItem[]) => void
}

export default function KitManager({ kitItems, availableVariations, onChange }: KitManagerProps) {
    const [selectedVariationIndex, setSelectedVariationIndex] = useState<string>('')
    const [itemQuantity, setItemQuantity] = useState(1)

    function addKitItem() {
        if (!selectedVariationIndex) {
            alert('Selecione uma variação para adicionar ao kit')
            return
        }

        const variationIdx = parseInt(selectedVariationIndex)
        const variation = availableVariations[variationIdx]

        if (!variation) {
            alert('Variação não encontrada')
            return
        }

        const newItem: KitItem = {
            quantity: itemQuantity,
            sortOrder: kitItems.length,
            _variationName: variation.name,
            _variationIndex: variationIdx
        }

        onChange([...kitItems, newItem])

        // Reset form
        setSelectedVariationIndex('')
        setItemQuantity(1)
    }

    function removeKitItem(index: number) {
        onChange(kitItems.filter((_, i) => i !== index))
    }

    function updateQuantity(index: number, quantity: number) {
        onChange(
            kitItems.map((item, i) =>
                i === index ? { ...item, quantity } : item
            )
        )
    }

    function moveItem(index: number, direction: 'up' | 'down') {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= kitItems.length) return

        const newItems = [...kitItems]
        const temp = newItems[index]
        newItems[index] = newItems[newIndex]
        newItems[newIndex] = temp

        // Atualizar sortOrder
        onChange(
            newItems.map((item, i) => ({ ...item, sortOrder: i }))
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Montar Kit
                </CardTitle>
                <CardDescription>
                    Selecione quais variações criadas no passo anterior farão parte deste kit
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Alerta se não há variações */}
                {availableVariations.length === 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <div className="font-semibold text-amber-900">Nenhuma variação criada</div>
                                <div className="text-sm text-amber-800 mt-1">
                                    Volte ao passo 3 e crie as variações que farão parte deste kit.
                                    Você pode usar o botão &quot;Gerar Variações Automaticamente&quot; se selecionou atributos no passo 2.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Formulário de Adição */}
                {availableVariations.length > 0 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <Label>Variação</Label>
                                <Select
                                    value={selectedVariationIndex}
                                    onValueChange={setSelectedVariationIndex}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma variação" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVariations.map((variation, index) => (
                                            <SelectItem key={index} value={String(index)}>
                                                {variation.name || `Variação ${index + 1}`}
                                                {variation.price && ` - R$ ${variation.price}`}
                                                {variation.files.length > 0 && ` (${variation.files.length} arquivo${variation.files.length > 1 ? 's' : ''})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Quantidade</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={addKitItem}
                            disabled={!selectedVariationIndex}
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar ao Kit
                        </Button>
                    </div>
                )}

                {/* Lista de Itens do Kit */}
                {kitItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum item adicionado ao kit ainda
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Itens no Kit ({kitItems.length})
                        </Label>
                        {kitItems.map((item, index) => {
                            const variation = item._variationIndex !== undefined
                                ? availableVariations[item._variationIndex]
                                : null

                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                                >
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="h-6 px-2"
                                        >
                                            ▲
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === kitItems.length - 1}
                                            className="h-6 px-2"
                                        >
                                            ▼
                                        </Button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="font-semibold">
                                            {variation?.name || item._variationName || 'Variação sem nome'}
                                        </div>
                                        {variation && (
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {variation.price && (
                                                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                                                        R$ {variation.price}
                                                    </Badge>
                                                )}
                                                {variation.files.length > 0 && (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                                        {variation.files.length} arquivo{variation.files.length > 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {variation.images.length > 0 && (
                                                    <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                                                        {variation.images.length} imagem{variation.images.length > 1 ? 'ns' : ''}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm">Qtd:</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                            className="w-20"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeKitItem(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
