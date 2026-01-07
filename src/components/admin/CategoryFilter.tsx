'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Category {
    id: string
    name: string
    slug: string
    subcategories?: Category[]
}

interface CategoryFilterProps {
    categories: Category[]
    value: string
    onValueChange: (value: string) => void
}

function CategoryTreeItem({
    category,
    selectedId,
    onSelect,
    level = 0,
}: {
    category: Category
    selectedId: string
    onSelect: (id: string) => void
    level?: number
}) {
    const [isOpen, setIsOpen] = useState(false)
    const hasSubcategories = category.subcategories && category.subcategories.length > 0
    const isSelected = selectedId === category.id

    return (
        <div>
            <button
                onClick={() => {
                    if (hasSubcategories) {
                        setIsOpen(!isOpen)
                    }
                    onSelect(category.id)
                }}
                className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    'hover:bg-gray-100',
                    isSelected && 'bg-[#FED466]/20 text-gray-900 font-medium',
                    !isSelected && 'text-gray-700'
                )}
                data-level={level}
                style={{ paddingLeft: `${level * 1.5 + 0.75}rem` } as React.CSSProperties}
            >
                {hasSubcategories && (
                    <span
                        className="shrink-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(!isOpen)
                        }}
                    >
                        {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                    </span>
                )}
                {!hasSubcategories && <span className="w-4" />}
                {isOpen || hasSubcategories ? (
                    <FolderOpen className="h-4 w-4 text-[#FD9555] shrink-0" />
                ) : (
                    <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <span className="flex-1 text-left truncate">{category.name}</span>
                {isSelected && (
                    <Badge variant="secondary" className="bg-[#FED466] text-gray-900 text-xs px-1.5 py-0">
                        ✓
                    </Badge>
                )}
            </button>

            {isOpen && hasSubcategories && (
                <div className="mt-1">
                    {category.subcategories!.map((sub) => (
                        <CategoryTreeItem
                            key={sub.id}
                            category={sub}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function CategoryFilter({ categories, value, onValueChange }: CategoryFilterProps) {
    const [open, setOpen] = useState(false)

    const handleSelect = (categoryId: string) => {
        onValueChange(categoryId)
        setOpen(false)
    }

    const getSelectedCategoryName = (id: string): string => {
        if (id === 'all') return 'Todas as Categorias'
        if (id === 'sem-categoria') return 'Sem Categoria'

        const findCategory = (cats: Category[]): string | null => {
            for (const cat of cats) {
                if (cat.id === id) return cat.name
                if (cat.subcategories) {
                    const found = findCategory(cat.subcategories)
                    if (found) return found
                }
            }
            return null
        }

        return findCategory(categories) || id
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-64 justify-between"
                >
                    <span className="truncate">{getSelectedCategoryName(value)}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 max-h-96 overflow-y-auto" align="start">
                <div className="p-2 border-b sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Filtrar por categoria</span>
                        {value !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onValueChange('all')
                                    setOpen(false)
                                }}
                                className="h-7 text-xs"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Limpar
                            </Button>
                        )}
                    </div>
                </div>
                <div className="p-2 space-y-1">
                    <button
                        onClick={() => handleSelect('all')}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                            'hover:bg-gray-100',
                            value === 'all' && 'bg-[#FED466]/20 text-gray-900 font-medium',
                            value !== 'all' && 'text-gray-700'
                        )}
                    >
                        <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="flex-1 text-left">Todas as Categorias</span>
                        {value === 'all' && (
                            <Badge variant="secondary" className="bg-[#FED466] text-gray-900 text-xs px-1.5 py-0">
                                ✓
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => handleSelect('sem-categoria')}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                            'hover:bg-gray-100',
                            value === 'sem-categoria' && 'bg-[#FED466]/20 text-gray-900 font-medium',
                            value !== 'sem-categoria' && 'text-gray-700'
                        )}
                    >
                        <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="flex-1 text-left">Sem Categoria</span>
                        {value === 'sem-categoria' && (
                            <Badge variant="secondary" className="bg-[#FED466] text-gray-900 text-xs px-1.5 py-0">
                                ✓
                            </Badge>
                        )}
                    </button>

                    <div className="border-t my-2 pt-2">
                        {categories.map((category) => (
                            <CategoryTreeItem
                                key={category.id}
                                category={category}
                                selectedId={value}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
