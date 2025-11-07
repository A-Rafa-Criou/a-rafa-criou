'use client'

import React, { useState } from 'react'
import { Trash2, Plus, Upload, X, FileText, ImageIcon, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AttributeValue {
    id: string
    value: string
}

interface Attribute {
    id: string
    name: string
    values?: AttributeValue[]
}

interface UploadedFile {
    file?: File
    filename?: string
    r2Key?: string
    url?: string
}

interface ImageFile {
    file?: File
    filename?: string
    previewUrl?: string
}

interface Variation {
    id?: string
    name: string
    price: string
    attributeValues: { attributeId: string; valueId: string }[]
    files: UploadedFile[]
    images: ImageFile[]
}

interface VariationManagerProps {
    variations: Variation[]
    attributes: Attribute[]
    onChange: (variations: Variation[]) => void
}

export default function VariationManager({ variations, attributes, onChange }: VariationManagerProps) {
    // Estado para controlar o dialog de confirmação
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean
        variationIndex: number
        fileIndex: number
        filename: string
        hasR2Key: boolean
    } | null>(null)

    // Estado para controlar se o preço único está ativado
    const [singlePrice, setSinglePrice] = useState(false)

    // Estados para feedback visual de drag & drop
    const [isDraggingFile, setIsDraggingFile] = useState<number | null>(null)
    const [isDraggingImage, setIsDraggingImage] = useState<number | null>(null)

    // Função para gerar todas as combinações possíveis de atributos
    function generateAllCombinations() {
        if (attributes.length === 0) {
            alert('Selecione pelo menos um atributo no passo anterior para gerar variações automaticamente.')
            return
        }

        // Verificar se todos os atributos têm valores
        const attributesWithoutValues = attributes.filter(attr => !attr.values || attr.values.length === 0)
        if (attributesWithoutValues.length > 0) {
            alert(`Os seguintes atributos não têm valores: ${attributesWithoutValues.map(a => a.name).join(', ')}`)
            return
        }

        // Confirmar antes de gerar (pode criar muitas variações)
        const totalCombinations = attributes.reduce((acc, attr) => acc * (attr.values?.length || 1), 1)

        if (totalCombinations > 50) {
            if (!confirm(`Isso irá criar ${totalCombinations} variações. Deseja continuar?`)) {
                return
            }
        }

        // Gerar combinações usando produto cartesiano
        function cartesianProduct(arrays: AttributeValue[][]): AttributeValue[][] {
            if (arrays.length === 0) return [[]]

            const [first, ...rest] = arrays
            const restProduct = cartesianProduct(rest)

            const result: AttributeValue[][] = []
            for (const item of first) {
                for (const restItem of restProduct) {
                    result.push([item, ...restItem])
                }
            }

            return result
        }

        // Criar array de valores para cada atributo
        const attributeValueArrays = attributes.map(attr => attr.values || [])

        // Gerar todas as combinações
        const combinations = cartesianProduct(attributeValueArrays)

        // Criar variações a partir das combinações
        const newVariations: Variation[] = combinations.map(combination => {
            // Criar attributeValues para esta variação
            const attributeValues = combination.map((value, index) => ({
                attributeId: attributes[index].id,
                valueId: value.id
            }))

            return {
                name: '', // Deixar vazio para o usuário preencher
                price: '',
                attributeValues,
                files: [],
                images: []
            }
        })

        // Confirmar substituição se já existem variações
        if (variations.length > 0) {
            if (!confirm(`Isso irá substituir as ${variations.length} variações existentes. Deseja continuar?`)) {
                return
            }
        }

        onChange(newVariations)
    }

    function addVariation() {
        onChange([...variations, {
            name: '',
            price: '',
            attributeValues: [],
            files: [],
            images: []
        }])
    }

    function removeVariation(index: number) {
        if (confirm('Tem certeza que deseja remover esta variação?')) {
            onChange(variations.filter((_, i) => i !== index))
        }
    }

    function updateVariation(index: number, field: keyof Variation, value: unknown) {
        // Se for atualização de preço e o modo "preço único" estiver ativado
        if (field === 'price' && singlePrice && index === 0) {
            // Atualizar o preço de TODAS as variações
            onChange(variations.map(v => ({ ...v, price: value as string })))
        } else {
            // Atualização normal
            onChange(variations.map((v, i) => i === index ? { ...v, [field]: value } : v))
        }
    }

    // Função para alternar o modo de preço único
    function toggleSinglePrice(enabled: boolean) {
        setSinglePrice(enabled)

        if (enabled && variations.length > 0 && variations[0].price) {
            // Se ativar e a primeira variação já tem preço, replicar para todas
            const firstPrice = variations[0].price
            onChange(variations.map(v => ({ ...v, price: firstPrice })))
        } else if (!enabled) {
            // Se desativar, limpar os preços das variações seguintes (manter apenas o primeiro)
            onChange(variations.map((v, i) => i === 0 ? v : { ...v, price: '' }))
        }
    }

    function updateAttributeValue(variationIndex: number, attributeId: string, valueId: string) {
        onChange(variations.map((v, i) => {
            if (i !== variationIndex) return v
            const filtered = v.attributeValues.filter(av => av.attributeId !== attributeId)
            return {
                ...v,
                attributeValues: [...filtered, { attributeId, valueId }]
            }
        }))
    }

    function handleFileUpload(variationIndex: number, files: FileList) {
        const newFiles = Array.from(files).map(f => ({
            file: f,
            filename: f.name
        }))
        onChange(variations.map((v, i) =>
            i === variationIndex ? { ...v, files: [...v.files, ...newFiles] } : v
        ))
    }

    function handleFileDrop(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingFile(null)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileUpload(variationIndex, files)
        }
    }

    function handleFileDragOver(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
    }

    function handleFileDragEnter(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingFile(variationIndex)
    }

    function handleFileDragLeave(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        // Só remove o estado se realmente saiu da área (não é um elemento filho)
        if (e.currentTarget === e.target) {
            setIsDraggingFile(null)
        }
    } async function removeFile(variationIndex: number, fileIndex: number) {
        const variation = variations[variationIndex]
        const file = variation.files[fileIndex]

        // Abrir dialog de confirmação
        setDeleteDialog({
            open: true,
            variationIndex,
            fileIndex,
            filename: file.filename || 'arquivo sem nome',
            hasR2Key: !!file.r2Key
        })
    }

    async function confirmRemoveFile() {
        if (!deleteDialog) return

        const { variationIndex, fileIndex } = deleteDialog
        const variation = variations[variationIndex]
        const file = variation.files[fileIndex]

        // Se o arquivo já foi carregado no R2 (tem r2Key), deletar do R2 imediatamente
        if (file.r2Key) {
            try {
                const response = await fetch(`/api/r2/delete?r2Key=${encodeURIComponent(file.r2Key)}`, {
                    method: 'DELETE'
                })

                if (!response.ok) {
                    const error = await response.json()
                    console.error('Erro ao deletar do R2:', error)
                    alert(`Erro ao deletar arquivo do R2: ${error.error || 'Erro desconhecido'}`)
                    setDeleteDialog(null)
                    return
                }
            } catch (error) {
                console.error('Erro ao deletar arquivo do R2:', error)
                alert('Erro ao deletar arquivo. Tente novamente.')
                setDeleteDialog(null)
                return
            }
        }

        // Remover do estado local
        onChange(variations.map((v, i) =>
            i === variationIndex ? { ...v, files: v.files.filter((_, fi) => fi !== fileIndex) } : v
        ))

        // Fechar dialog
        setDeleteDialog(null)
    }

    function handleImageUpload(variationIndex: number, files: FileList) {
        const newImages = Array.from(files).map(f => ({
            file: f,
            filename: f.name,
            previewUrl: URL.createObjectURL(f)
        }))
        onChange(variations.map((v, i) =>
            i === variationIndex ? { ...v, images: [...v.images, ...newImages] } : v
        ))
    }

    function handleImageDrop(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingImage(null)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleImageUpload(variationIndex, files)
        }
    }

    function handleImageDragOver(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
    }

    function handleImageDragEnter(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingImage(variationIndex)
    }

    function handleImageDragLeave(variationIndex: number, e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        // Só remove o estado se realmente saiu da área (não é um elemento filho)
        if (e.currentTarget === e.target) {
            setIsDraggingImage(null)
        }
    } function removeImage(variationIndex: number, imageIndex: number) {
        onChange(variations.map((v, i) =>
            i === variationIndex ? { ...v, images: v.images.filter((_, ii) => ii !== imageIndex) } : v
        ))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Variações do Produto</h3>
                    <p className="text-sm text-gray-500">
                        Cada variação deve ter nome, preço e pelo menos um arquivo PDF
                    </p>
                </div>
                <div className="flex gap-2">
                    {attributes.length > 0 && (
                        <Button
                            type="button"
                            onClick={generateAllCombinations}
                            variant="default"
                            className="bg-[#FED466] text-gray-900 hover:bg-[#FD9555]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Gerar Variações Automaticamente
                        </Button>
                    )}
                    <Button type="button" onClick={addVariation} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Variação Manual
                    </Button>
                </div>
            </div>

            {variations.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    Nenhuma variação adicionada. Clique em &quot;Nova Variação&quot; para começar.
                </div>
            )}

            {variations.map((variation, index) => (
                <Card key={index} className="p-5">
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-base px-3 py-1">
                                    Variação {index + 1}
                                </Badge>
                                {variation.name && (
                                    <span className="font-semibold text-gray-900">{variation.name}</span>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariation(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remover
                            </Button>
                        </div>

                        {/* Nome e Preço */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between h-8 mb-2">
                                    <Label>Nome da variação ou kit *</Label>
                                </div>
                                <Input
                                    value={variation.name}
                                    onChange={e => updateVariation(index, 'name', e.target.value)}
                                    placeholder="Ex: Kit Completo, kit 1, kit 2"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between h-8 mb-2">
                                    <Label>Preço (R$) *</Label>
                                    {index === 0 && variations.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="single-price" className="text-xs text-gray-600 cursor-pointer">
                                                Mesmo preço para todas
                                            </Label>
                                            <Switch
                                                id="single-price"
                                                checked={singlePrice}
                                                onCheckedChange={toggleSinglePrice}
                                            />
                                        </div>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variation.price}
                                    onChange={e => updateVariation(index, 'price', e.target.value)}
                                    placeholder="0.00"
                                    disabled={singlePrice && index > 0}
                                />
                                {singlePrice && index > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Preço copiado da primeira variação
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Atributos */}
                        {attributes.length > 0 && (
                            <div>
                                <Label className="mb-2 block">Atributos da Variação *</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {attributes.map(attr => {
                                        const selectedValue = variation.attributeValues.find(
                                            av => av.attributeId === attr.id
                                        )?.valueId || undefined

                                        return (
                                            <div key={attr.id}>
                                                <Label className="text-sm text-gray-600">{attr.name}</Label>
                                                <Select
                                                    value={selectedValue}
                                                    onValueChange={val => {
                                                        console.log(`Selecionando atributo ${attr.name} = ${val} para variação ${index}`)
                                                        updateAttributeValue(index, attr.id, val)
                                                    }}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue placeholder={`Selecione ${attr.name}`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {attr.values?.map(v => (
                                                            <SelectItem key={v.id} value={v.id}>
                                                                {v.value}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Resumo dos atributos selecionados */}
                                {variation.attributeValues.length > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="text-sm font-semibold text-green-800 mb-2">
                                            ✓ Atributos Selecionados:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {variation.attributeValues.map((av, avIndex) => {
                                                const attr = attributes.find(a => a.id === av.attributeId)
                                                const val = attr?.values?.find(v => v.id === av.valueId)
                                                return (
                                                    <Badge key={avIndex} variant="secondary" className="bg-green-100 text-green-800">
                                                        {attr?.name}: {val?.value || 'N/A'}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Alerta se faltam atributos */}
                                {attributes.length > variation.attributeValues.length && (
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="text-sm font-semibold text-amber-800">
                                            ⚠️ Selecione todos os atributos para garantir que o cliente compre o produto correto
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Arquivos e Imagens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Arquivos PDF */}
                            <div>
                                <Label>Arquivos PDF *</Label>
                                <div className="mt-2">
                                    <label
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingFile === index
                                            ? 'bg-[#FED466]/30 border-[#FD9555] border-4 scale-105'
                                            : 'hover:bg-gray-50 border-gray-300'
                                            }`}
                                        onDrop={e => handleFileDrop(index, e)}
                                        onDragOver={handleFileDragOver}
                                        onDragEnter={e => handleFileDragEnter(index, e)}
                                        onDragLeave={e => handleFileDragLeave(index, e)}
                                    >
                                        <Upload className={`w-8 h-8 mb-2 transition-colors ${isDraggingFile === index ? 'text-[#FD9555]' : 'text-gray-400'
                                            }`} />
                                        <span className={`text-sm font-medium transition-colors ${isDraggingFile === index ? 'text-[#FD9555]' : 'text-gray-500'
                                            }`}>
                                            {isDraggingFile === index ? '📄 Solte os PDFs aqui!' : 'Clique ou arraste PDFs aqui'}
                                        </span>
                                        {isDraggingFile === index && (
                                            <span className="text-xs text-[#FD9555] mt-1 font-semibold">
                                                ⬇️ Variação {index + 1}
                                            </span>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf"
                                            onChange={e => e.target.files && handleFileUpload(index, e.target.files)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {variation.files.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {variation.files.map((file, fi) => (
                                            <div
                                                key={fi}
                                                className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                    <span className="text-sm truncate">{file.filename}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(index, fi)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Imagens */}
                            <div>
                                <Label>Imagens (opcional)</Label>
                                <div className="mt-2">
                                    <label
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingImage === index
                                            ? 'bg-[#FED466]/30 border-[#FD9555] border-4 scale-105'
                                            : 'hover:bg-gray-50 border-gray-300'
                                            }`}
                                        onDrop={e => handleImageDrop(index, e)}
                                        onDragOver={handleImageDragOver}
                                        onDragEnter={e => handleImageDragEnter(index, e)}
                                        onDragLeave={e => handleImageDragLeave(index, e)}
                                    >
                                        <ImageIcon className={`w-8 h-8 mb-2 transition-colors ${isDraggingImage === index ? 'text-[#FD9555]' : 'text-gray-400'
                                            }`} />
                                        <span className={`text-sm font-medium transition-colors ${isDraggingImage === index ? 'text-[#FD9555]' : 'text-gray-500'
                                            }`}>
                                            {isDraggingImage === index ? '🖼️ Solte as imagens aqui!' : 'Clique ou arraste imagens aqui'}
                                        </span>
                                        {isDraggingImage === index && (
                                            <span className="text-xs text-[#FD9555] mt-1 font-semibold">
                                                ⬇️ Variação {index + 1}
                                            </span>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={e => e.target.files && handleImageUpload(index, e.target.files)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {variation.images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {variation.images.filter(img => img.previewUrl && img.previewUrl.trim()).map((img, ii) => (
                                            <div key={ii} className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img.previewUrl || '/file.svg'}
                                                    alt={img.filename || 'preview'}
                                                    className="w-full h-24 object-cover rounded-lg border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => removeImage(index, ii)}
                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resumo */}
                        <div className="flex items-center gap-4 pt-3 border-t text-sm text-gray-600">
                            <div>
                                📄 {variation.files.length} {variation.files.length === 1 ? 'arquivo' : 'arquivos'}
                            </div>
                            <div>
                                🖼️ {variation.images.length} {variation.images.length === 1 ? 'imagem' : 'imagens'}
                            </div>
                            {variation.price && (
                                <div className="ml-auto font-semibold text-lg text-[#FD9555]">
                                    R$ {Number(variation.price).toFixed(2).replace('.', ',')}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            ))}

            {/* Alert Dialog para confirmar exclusão de arquivo */}
            <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Remover arquivo
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <div>
                                    Deseja remover o arquivo <strong>{deleteDialog?.filename}</strong>?
                                </div>
                                {deleteDialog?.hasR2Key && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="font-semibold">⚠️ Atenção:</div>
                                                <div className="mt-1">
                                                    O arquivo será <strong>deletado permanentemente</strong> do Cloudflare R2 imediatamente.
                                                </div>
                                                <div className="mt-1">
                                                    Esta ação não pode ser desfeita, mesmo se você cancelar a edição do produto.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveFile} className="bg-red-600 hover:bg-red-700">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
