'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, FolderTree, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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

export default function CategoriasPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        icon: '',
        sortOrder: 0,
        isActive: true
    })

    useEffect(() => {
        loadCategories()
    }, [])

    async function loadCategories() {
        try {
            const response = await fetch('/api/admin/categories')
            if (response.ok) {
                const data = await response.json()
                setCategories(data)
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleEdit(category: Category) {
        setEditingCategory(category)
        setFormData({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parentId: category.parentId || '',
            icon: category.icon || '',
            sortOrder: category.sortOrder,
            isActive: category.isActive
        })
        setDialogOpen(true)
    }

    function handleNew() {
        setEditingCategory(null)
        setFormData({
            name: '',
            slug: '',
            description: '',
            parentId: '',
            icon: '',
            sortOrder: 0,
            isActive: true
        })
        setDialogOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

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

            if (response.ok) {
                setDialogOpen(false)
                loadCategories()
            }
        } catch (error) {
            console.error('Erro ao salvar categoria:', error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

        try {
            const response = await fetch(`/api/admin/categories/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                loadCategories()
            }
        } catch (error) {
            console.error('Erro ao excluir categoria:', error)
        }
    }

    async function toggleActive(category: Category) {
        try {
            const response = await fetch(`/api/admin/categories/${category.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...category,
                    isActive: !category.isActive
                })
            })

            if (response.ok) {
                loadCategories()
            }
        } catch (error) {
            console.error('Erro ao alterar status:', error)
        }
    }

    // Gerar slug automaticamente
    function generateSlug(name: string) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    // Categorias principais (sem parent)
    const mainCategories = categories.filter(c => !c.parentId)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-xl shadow-sm">
                        <FolderTree className="w-7 h-7 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
                        <p className="text-gray-600 mt-1">Gerencie as categorias e subcategorias dos produtos</p>
                    </div>
                </div>
                <Button onClick={handleNew} className="bg-[#FD9555] hover:bg-[#FD9555]/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                </Button>
            </div>

            {/* Lista de Categorias */}
            {loading ? (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center py-12">Carregando...</div>
                    </CardContent>
                </Card>
            ) : mainCategories.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center py-12">
                            <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma categoria cadastrada</h3>
                            <p className="text-gray-600 mb-4">Comece criando sua primeira categoria</p>
                            <Button onClick={handleNew} className="bg-[#FD9555] hover:bg-[#FD9555]/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Categoria
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {mainCategories.map((category) => (
                        <Card key={category.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {category.icon && (
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                                {category.icon.startsWith('http') ? (
                                                    <Image
                                                        src={category.icon}
                                                        alt={category.name}
                                                        width={40}
                                                        height={40}
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-2xl">{category.icon}</span>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                {category.name}
                                                {!category.isActive && (
                                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                        Inativa
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                /{category.slug}
                                                {category.subcategories && category.subcategories.length > 0 && (
                                                    <span className="ml-2">• {category.subcategories.length} subcategoria(s)</span>
                                                )}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleActive(category)}
                                            title={category.isActive ? 'Desativar' : 'Ativar'}
                                        >
                                            {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(category)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(category.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {category.description && (
                                <CardContent className="pt-0 pb-3">
                                    <p className="text-sm text-gray-600">{category.description}</p>
                                </CardContent>
                            )}
                            {category.subcategories && category.subcategories.length > 0 && (
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        {category.subcategories.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {sub.icon && (
                                                        <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center">
                                                            {sub.icon.startsWith('http') ? (
                                                                <Image
                                                                    src={sub.icon}
                                                                    alt={sub.name}
                                                                    width={24}
                                                                    height={24}
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-sm">{sub.icon}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium">{sub.name}</span>
                                                    {!sub.isActive && (
                                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                                            Inativa
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => toggleActive(sub)}
                                                    >
                                                        {sub.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(sub)}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(sub.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de Criação/Edição */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os dados da categoria. O ícone/imagem é opcional.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    required
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
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="parentId">Categoria Pai (Subcategoria)</Label>
                                <Select
                                    value={formData.parentId}
                                    onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Nenhuma (categoria principal)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
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
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
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
                                />
                                <Label htmlFor="isActive">Categoria ativa</Label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-[#FD9555] hover:bg-[#FD9555]/90">
                                {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
