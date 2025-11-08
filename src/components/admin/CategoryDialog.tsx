"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface Category {
    id: string
    name: string
    slug: string
    description: string | null
    parentId: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
    subcategories?: Category[]
}

interface CategoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingCategory?: Category | null
    categories?: Category[]
    onSuccess?: (category: Category) => void
}

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

export default function CategoryDialog({ 
    open, 
    onOpenChange, 
    editingCategory = null, 
    categories = [],
    onSuccess 
}: CategoryDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        icon: '',
        sortOrder: 0,
        isActive: true
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filtrar apenas categorias principais (sem parentId) para o select de categoria pai
    const mainCategories = categories.filter(c => !c.parentId)

    useEffect(() => {
        if (editingCategory) {
            setFormData({
                name: editingCategory.name,
                slug: editingCategory.slug,
                description: editingCategory.description || '',
                parentId: editingCategory.parentId || '',
                icon: editingCategory.icon || '',
                sortOrder: editingCategory.sortOrder,
                isActive: editingCategory.isActive
            })
        } else {
            setFormData({
                name: '',
                slug: '',
                description: '',
                parentId: '',
                icon: '',
                sortOrder: 0,
                isActive: true
            })
        }
        setError(null)
    }, [editingCategory, open])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const url = editingCategory
            ? `/api/admin/categories/${editingCategory.id}`
            : '/api/admin/categories'

        const method = editingCategory ? 'PUT' : 'POST'

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao salvar categoria')
            }

            const savedCategory = await response.json()
            
            if (onSuccess) {
                onSuccess(savedCategory)
            }
            
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar categoria')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados da categoria. O ícone/imagem é opcional.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => {
                                    const name = e.target.value
                                    setFormData({
                                        ...formData,
                                        name,
                                        slug: generateSlug(name)
                                    })
                                }}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug *</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="parentId">Categoria Pai (Subcategoria)</Label>
                            <Select
                                value={formData.parentId || 'none'}
                                onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Nenhuma (categoria principal)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                                    {mainCategories
                                        .filter(c => c.id !== editingCategory?.id)
                                        .map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sortOrder">Ordem</Label>
                            <Input
                                id="sortOrder"
                                type="number"
                                value={formData.sortOrder}
                                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="icon">
                            Ícone/Imagem (opcional)
                            <span className="text-sm text-gray-500 ml-2">
                                Emoji (ex: 💌) ou URL de imagem
                            </span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="icon"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="💌 ou https://..."
                                disabled={isSubmitting}
                            />
                            {formData.icon && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    {formData.icon.startsWith('http') ? (
                                        <Image
                                            src={formData.icon}
                                            alt="Preview"
                                            width={40}
                                            height={40}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl">{formData.icon}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                disabled={isSubmitting}
                            />
                            <Label htmlFor="isActive">Categoria ativa</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-[#FD9555] hover:bg-[#FD9555]/90" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : (editingCategory ? 'Salvar Alterações' : 'Criar Categoria')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
