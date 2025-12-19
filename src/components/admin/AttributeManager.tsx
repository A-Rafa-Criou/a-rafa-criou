'use client'

import React, { useState, useEffect } from 'react'
import { Plus, X, Check, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface AttributeValue {
    id: string
    value: string
    slug?: string
    description?: string | null
}

interface Attribute {
    id: string
    name: string
    slug?: string
    values?: AttributeValue[]
}

interface AttributeManagerProps {
    selectedAttributes: { attributeId: string; valueIds: string[] }[]
    onChange: (attributes: { attributeId: string; valueIds: string[] }[]) => void
    onAttributeCreated?: (attribute: Attribute) => void
    onAttributesUpdated?: (attributes: Attribute[]) => void
}

// Componente sortable para atributos
function SortableAttribute({
    attr,
    isSelected,
    selectedAttr,
    onToggle,
    onDelete,
    onToggleValue,
    onDeleteValue,
    onSelectAll,
    onAddValue,
    selectedAttributes,
    onChange
}: {
    attr: Attribute
    isSelected: boolean
    selectedAttr?: { attributeId: string; valueIds: string[] }
    onToggle: () => void
    onDelete: () => void
    onToggleValue: (valueId: string) => void
    onDeleteValue: (valueId: string, valueName: string) => void
    onSelectAll: () => void
    onAddValue: (attrId: string, value: string, description?: string) => void
    selectedAttributes: { attributeId: string; valueIds: string[] }[]
    onChange: (attributes: { attributeId: string; valueIds: string[] }[]) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: attr.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const [isAddingValue, setIsAddingValue] = useState(false)
    const [newValue, setNewValue] = useState('')
    const [newValueDescription, setNewValueDescription] = useState('')

    return (
        <div
            ref={setNodeRef}
            style={style}
            suppressHydrationWarning
            className={`border rounded-lg p-3 transition-all ${isSelected
                ? 'border-[#FED466] bg-[#FED466]/5'
                : 'border-gray-200'
                }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={onToggle}
                            className="w-5 h-5"
                        />
                        <div>
                            <div className="font-semibold text-base">{attr.name}</div>
                            <div className="text-sm text-gray-500">
                                {attr.values?.length || 0} {attr.values?.length === 1 ? 'valor' : 'valores'}
                            </div>
                        </div>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    {isSelected && (
                        <Badge variant="secondary" className="bg-[#FED466]">
                            Selecionado
                        </Badge>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Deletar atributo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Valores do Atributo */}
            {isSelected && (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                            Valores disponíveis:
                        </Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onSelectAll}
                                className="h-7 text-xs"
                            >
                                {(() => {
                                    const allValueIds = attr.values?.map(v => v.id) || []
                                    const allSelected = allValueIds.length > 0 && allValueIds.every(vid => selectedAttr?.valueIds.includes(vid))
                                    return allSelected ? 'Desselecionar Todos' : 'Selecionar Todos'
                                })()}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingValue(!isAddingValue)}
                                className="h-7 text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar Valor
                            </Button>
                        </div>
                    </div>

                    {isAddingValue && (
                        <div className="space-y-2 mb-2 p-3 border rounded-lg bg-gray-50">
                            <div>
                                <Label className="text-xs text-gray-600">Nome do Valor</Label>
                                <Input
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    placeholder="Ex: Português, Espanhol, etc."
                                    className="h-8 text-sm mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Descrição (opcional)</Label>
                                <textarea
                                    value={newValueDescription}
                                    onChange={e => setNewValueDescription(e.target.value)}
                                    placeholder="Descrição que aparecerá no front-end..."
                                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md resize-none"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={async () => {
                                        if (newValue.trim()) {
                                            await onAddValue(attr.id, newValue.trim(), newValueDescription.trim() || undefined)
                                            setNewValue('')
                                            setNewValueDescription('')
                                            setIsAddingValue(false)
                                        }
                                    }}
                                    className="h-8"
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    Salvar
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsAddingValue(false)
                                        setNewValue('')
                                        setNewValueDescription('')
                                    }}
                                    className="h-8"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <SortableValueList
                        attribute={attr}
                        selectedValueIds={selectedAttr?.valueIds || []}
                        onToggleValue={onToggleValue}
                        onDeleteValue={onDeleteValue}
                        selectedAttributes={selectedAttributes}
                        onChange={onChange}
                    />
                </div>
            )}
        </div>
    )
}

// Componente sortable para valores
function SortableValue({
    value,
    isSelected,
    onToggle,
    onDelete,
}: {
    value: AttributeValue
    isSelected: boolean
    onToggle: () => void
    onDelete: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: value.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            suppressHydrationWarning
            className={`flex flex-col gap-1 px-2 py-1.5 rounded-md border-2 transition-all text-sm ${isSelected
                ? 'border-[#FD9555] bg-[#FED466]/20'
                : 'border-gray-300'
                }`}
        >
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggle}
                        className="w-4 h-4"
                    />
                    <span className="font-medium">{value.value}</span>
                </label>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-50 rounded"
                    title="Deletar valor"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
            {value.description && (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="description" className="border-0">
                        <AccordionTrigger className="py-1 text-xs text-gray-500 hover:no-underline">
                            Ver descrição
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-gray-600 italic pt-1 pb-2">
                            {value.description}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    )
}

// Lista sortable de valores
function SortableValueList({
    attribute,
    selectedValueIds,
    onToggleValue,
    onDeleteValue,
    selectedAttributes,
    onChange,
}: {
    attribute: Attribute
    selectedValueIds: string[]
    onToggleValue: (valueId: string) => void
    onDeleteValue: (valueId: string, valueName: string) => void
    selectedAttributes: { attributeId: string; valueIds: string[] }[]
    onChange: (attributes: { attributeId: string; valueIds: string[] }[]) => void
}) {
    const [values, setValues] = useState(attribute.values || [])
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        setValues(attribute.values || [])
    }, [attribute.values])

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = values.findIndex((item) => item.id === active.id)
            const newIndex = values.findIndex((item) => item.id === over.id)

            const newOrder = arrayMove(values, oldIndex, newIndex)
            setValues(newOrder)

            // Salvar a nova ordem no banco de dados
            const orderedValueIds = newOrder.map(v => v.id)
            fetch(`/api/admin/attributes/${attribute.id}/reorder`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedValueIds }),
            }).catch(err => {
                console.error('Erro ao salvar ordem dos valores:', err)
            })

            // Atualizar a ordem dos valueIds selecionados também (fora do setState)
            const currentAttr = selectedAttributes.find(a => a.attributeId === attribute.id)
            if (currentAttr) {
                const orderedSelectedValueIds = newOrder
                    .filter(v => currentAttr.valueIds.includes(v.id))
                    .map(v => v.id)

                // Usar setTimeout para garantir que não estamos no meio de um render
                setTimeout(() => {
                    onChange(
                        selectedAttributes.map(a =>
                            a.attributeId === attribute.id
                                ? { ...a, valueIds: orderedSelectedValueIds }
                                : a
                        )
                    )
                }, 0)
            }
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={values.map(v => v.id)}
                strategy={rectSortingStrategy}
            >
                <div className="flex flex-wrap gap-2">
                    {values.map((value) => (
                        <SortableValue
                            key={value.id}
                            value={value}
                            isSelected={selectedValueIds.includes(value.id)}
                            onToggle={() => onToggleValue(value.id)}
                            onDelete={() => onDeleteValue(value.id, value.value)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}

export default function AttributeManager({ selectedAttributes, onChange, onAttributeCreated, onAttributesUpdated }: AttributeManagerProps) {
    const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingNew, setIsCreatingNew] = useState(false)
    const [newAttributeName, setNewAttributeName] = useState('')
    const [newAttributeValues, setNewAttributeValues] = useState<string[]>([''])

    // Sensors para drag & drop (deve ficar no topo, antes de qualquer return)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Carregar atributos do banco ao montar
    useEffect(() => {
        loadAttributes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function loadAttributes() {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/attributes')
            if (response.ok) {
                const data = await response.json()
                setAvailableAttributes(data)
                // Notificar o ProductForm que os atributos foram atualizados
                if (onAttributesUpdated) {
                    onAttributesUpdated(data)
                }
            }
        } catch {
            // Failed to load attributes
        } finally {
            setIsLoading(false)
        }
    }

    function slugify(text: string): string {
        // Mapa de caracteres acentuados para suas versões sem acento
        const accentsMap: Record<string, string> = {
            'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
            'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
            'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
            'ç': 'c', 'ñ': 'n'
        }

        return text
            .toLowerCase()
            .split('')
            .map(char => accentsMap[char] || char)
            .join('')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    async function handleCreateAttribute() {
        if (!newAttributeName.trim()) return

        const values = newAttributeValues.filter(v => v.trim())
        if (values.length === 0) {
            alert('Adicione pelo menos um valor para o atributo')
            return
        }

        try {
            const slug = slugify(newAttributeName)
            const response = await fetch('/api/admin/attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newAttributeName.trim(),
                    slug,
                    values: values.map(v => ({
                        value: v.trim(),
                        slug: slugify(v)
                    }))
                })
            })

            if (response.ok) {
                const newAttribute = await response.json()
                await loadAttributes()
                setNewAttributeName('')
                setNewAttributeValues([''])
                setIsCreatingNew(false)

                // Chamar callback para auto-selecionar o novo atributo
                if (onAttributeCreated && newAttribute) {
                    onAttributeCreated(newAttribute)
                }
            } else {
                const error = await response.json()
                alert(error.error || 'Erro ao criar atributo')
            }
        } catch {
            alert('Erro ao criar atributo')
        }
    }

    async function handleDeleteAttribute(attributeId: string, attributeName: string) {
        if (!confirm(`Tem certeza que deseja deletar o atributo "${attributeName}"?\nTodos os valores serão removidos.`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/attributes?attributeId=${attributeId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                // Remover dos selecionados se estiver
                onChange(selectedAttributes.filter(a => a.attributeId !== attributeId))
                await loadAttributes()
            } else {
                const error = await response.json()
                alert(error.error || 'Erro ao deletar atributo')
            }
        } catch {
            alert('Erro ao deletar atributo')
        }
    }

    async function handleDeleteValue(valueId: string, valueName: string, attributeId: string) {
        if (!confirm(`Tem certeza que deseja deletar o valor "${valueName}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/attributes?valueId=${valueId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                // Remover dos selecionados se estiver
                const attr = selectedAttributes.find(a => a.attributeId === attributeId)
                if (attr && attr.valueIds.includes(valueId)) {
                    onChange(
                        selectedAttributes.map(a =>
                            a.attributeId === attributeId
                                ? { ...a, valueIds: a.valueIds.filter(v => v !== valueId) }
                                : a
                        )
                    )
                }
                await loadAttributes()
            } else {
                const error = await response.json()
                alert(error.error || 'Erro ao deletar valor')
            }
        } catch {
            alert('Erro ao deletar valor')
        }
    }

    function toggleAttribute(attributeId: string) {
        const exists = selectedAttributes.find(a => a.attributeId === attributeId)
        if (exists) {
            const newSelection = selectedAttributes.filter(a => a.attributeId !== attributeId)
            onChange(newSelection)
        } else {
            const newSelection = [...selectedAttributes, { attributeId, valueIds: [] }]
            onChange(newSelection)
        }
    }

    function toggleValue(attributeId: string, valueId: string) {
        const attr = selectedAttributes.find(a => a.attributeId === attributeId)
        if (!attr) return

        const hasValue = attr.valueIds.includes(valueId)
        const newSelection = selectedAttributes.map(a =>
            a.attributeId === attributeId
                ? {
                    ...a,
                    valueIds: hasValue
                        ? a.valueIds.filter(v => v !== valueId)
                        : [...a.valueIds, valueId]
                }
                : a
        )
        onChange(newSelection)
    }

    function addValueField() {
        setNewAttributeValues([...newAttributeValues, ''])
    }

    function updateValueField(index: number, value: string) {
        const updated = [...newAttributeValues]
        updated[index] = value
        setNewAttributeValues(updated)
    }

    function removeValueField(index: number) {
        setNewAttributeValues(newAttributeValues.filter((_, i) => i !== index))
    }

    function handleAttributeDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setAvailableAttributes((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    async function handleAddValueToAttribute(attributeId: string, value: string, description?: string) {
        if (!value.trim()) return

        try {
            const response = await fetch(`/api/admin/attributes/${attributeId}/values`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    value: value.trim(),
                    description: description || null
                })
            })

            if (response.ok) {
                await loadAttributes()
            } else {
                alert('Erro ao adicionar valor')
            }
        } catch {
            alert('Erro ao adicionar valor')
        }
    }

    if (isLoading) {
        return <div className="text-center py-4">Carregando atributos...</div>
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Atributos do Produto</CardTitle>
                        <CardDescription>
                            Selecione atributos existentes ou crie novos (ex: Cor, Idioma, Tamanho)
                        </CardDescription>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setIsCreatingNew(!isCreatingNew)}
                        variant="outline"
                        size="sm"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Novo Atributo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Formulário de Criação */}
                {isCreatingNew && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
                        <div>
                            <Label>Nome do Atributo (ex: Cor, Idioma, Tamanho)</Label>
                            <Input
                                value={newAttributeName}
                                onChange={e => setNewAttributeName(e.target.value)}
                                placeholder="Ex: Cor"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Valores do Atributo</Label>
                            <div className="space-y-2 mt-1">
                                {newAttributeValues.map((value, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            value={value}
                                            onChange={e => updateValueField(index, e.target.value)}
                                            placeholder={`Ex: ${newAttributeName || 'Valor'} ${index + 1}`}
                                        />
                                        {newAttributeValues.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeValueField(index)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addValueField}
                                className="mt-2"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar Valor
                            </Button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                onClick={handleCreateAttribute}
                                size="sm"
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Criar Atributo
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsCreatingNew(false)
                                    setNewAttributeName('')
                                    setNewAttributeValues([''])
                                }}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lista de Atributos Disponíveis */}
                {availableAttributes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum atributo criado ainda. Crie o primeiro!
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleAttributeDragEnd}
                    >
                        <SortableContext
                            items={availableAttributes.map(a => a.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4">
                                {availableAttributes.map(attr => {
                                    const isSelected = selectedAttributes.some(a => a.attributeId === attr.id)
                                    const selectedAttr = selectedAttributes.find(a => a.attributeId === attr.id)

                                    return (
                                        <SortableAttribute
                                            key={attr.id}
                                            attr={attr}
                                            isSelected={isSelected}
                                            selectedAttr={selectedAttr}
                                            onToggle={() => toggleAttribute(attr.id)}
                                            onDelete={() => handleDeleteAttribute(attr.id, attr.name)}
                                            onToggleValue={(valueId) => toggleValue(attr.id, valueId)}
                                            onDeleteValue={(valueId, valueName) => handleDeleteValue(valueId, valueName, attr.id)}
                                            onSelectAll={() => {
                                                const allValueIds = attr.values?.map(v => v.id) || []
                                                const currentAttr = selectedAttributes.find(a => a.attributeId === attr.id)
                                                const allSelected = allValueIds.length > 0 && allValueIds.every(vid => currentAttr?.valueIds.includes(vid))

                                                if (allSelected) {
                                                    onChange(
                                                        selectedAttributes.map(a =>
                                                            a.attributeId === attr.id
                                                                ? { ...a, valueIds: [] }
                                                                : a
                                                        )
                                                    )
                                                } else {
                                                    onChange(
                                                        selectedAttributes.map(a =>
                                                            a.attributeId === attr.id
                                                                ? { ...a, valueIds: allValueIds }
                                                                : a
                                                        )
                                                    )
                                                }
                                            }}
                                            onAddValue={handleAddValueToAttribute}
                                            selectedAttributes={selectedAttributes}
                                            onChange={onChange}
                                        />
                                    )
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardContent>
        </Card>
    )
}
