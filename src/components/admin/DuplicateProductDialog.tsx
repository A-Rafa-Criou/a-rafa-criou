'use client'

import React, { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import ProductForm from '@/components/admin/ProductForm'
import { getPreviewSrc } from '@/lib/r2-utils'

// Types used only to map API product into ProductForm default values
interface ApiImage { id?: string; name?: string; r2Key?: string; url?: string; data?: string; mimeType?: string; alt?: string; cloudinaryId?: string; width?: number; height?: number; format?: string; size?: number }
interface ApiFile { filename?: string; originalName?: string; fileSize?: number; mimeType?: string; r2Key?: string; url?: string }
interface ApiAttributeValue { attributeId?: string; valueId?: string; attribute_id?: string; attribute_value_id?: string }
interface ApiVariation { id?: string; name?: string; price?: number | string; isActive?: boolean; images?: ApiImage[]; files?: ApiFile[]; attributeValues?: ApiAttributeValue[] }
interface AdminProduct { id?: string; name?: string; slug?: string; description?: string; categoryId?: string; categoryIds?: string[]; isActive?: boolean; isFeatured?: boolean; fileType?: string; images?: ApiImage[]; price?: number; variations?: ApiVariation[]; attributes?: { attributeId: string; valueIds: string[] }[]; files?: ApiFile[] }

interface DuplicateProductDialogProps {
    product: AdminProduct | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

// Mirror the Attribute shape used by ProductForm
interface Attribute {
    id: string
    name: string
    values?: { id: string; value: string }[]
}

interface Category {
    id: string
    name: string
    parentId?: string | null
}

export default function DuplicateProductDialog({
    product,
    open,
    onOpenChange,
    onSuccess,
}: DuplicateProductDialogProps) {
    const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)
    const [isLoadingAttributes, setIsLoadingAttributes] = useState(true)
    const [detailedProduct, setDetailedProduct] = useState<AdminProduct | null>(null)

    // Buscar atributos disponíveis
    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    setIsLoadingAttributes(true)
                    const res = await fetch('/api/admin/attributes')
                    if (!res.ok) return
                    const j = await res.json()
                    if (!mounted) return
                    const rawAttrs = (j.attributes || j || []) as unknown
                    const attrs: Attribute[] = Array.isArray(rawAttrs) ? rawAttrs.map((a: unknown) => {
                        const obj = a as Record<string, unknown>
                        const vals = Array.isArray(obj.values) ? obj.values as unknown[] : []
                        const values = vals.map(v => {
                            const vv = v as Record<string, unknown>
                            return { id: String(vv.id), value: String(vv.value ?? vv.name ?? '') }
                        })
                        return { id: String(obj.id), name: String(obj.name), values }
                    }) : []
                    setAvailableAttributes(attrs)
                } catch {
                    // Failed to fetch attributes
                } finally {
                    if (mounted) setIsLoadingAttributes(false)
                }
            })()
        return () => { mounted = false }
    }, [])

    // Buscar categorias disponíveis
    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    setIsLoadingCategories(true)
                    const res = await fetch('/api/admin/categories')
                    if (!res.ok) return
                    const j = await res.json()
                    if (!mounted) return
                    const cats: Category[] = Array.isArray(j) ? j : []
                    console.log('✅ [DUPLICATE DIALOG] Categorias carregadas:', cats.length)
                    setCategories(cats)
                } catch (error) {
                    console.error('❌ [DUPLICATE DIALOG] Erro ao buscar categorias:', error)
                } finally {
                    if (mounted) setIsLoadingCategories(false)
                }
            })()
        return () => { mounted = false }
    }, [])

    // Buscar detalhes completos do produto original quando o dialog abre
    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    if (!product?.id || !open) return
                    console.log('🔵 [DUPLICATE DIALOG] Buscando detalhes do produto:', product.id)
                    const res = await fetch(`/api/admin/products/${product.id}`)
                    if (!res.ok) return
                    const j = await res.json()
                    console.log('✅ [DUPLICATE DIALOG] Produto detalhado recebido para duplicação')
                    if (!mounted) return
                    setDetailedProduct(j)
                } catch (error) {
                    console.error('❌ [DUPLICATE DIALOG] Erro ao buscar produto:', error)
                }
            })()
        return () => { mounted = false }
    }, [product?.id, open])

    // Preparar valores padrão a partir do produto original
    const defaultValues = React.useMemo(() => {
        const src = detailedProduct || product
        if (!src) return undefined
        const source = src as AdminProduct

        // Preparar imagens (preservando Cloudinary URLs)
        const images = (source.images || []).map(i => {
            const apiImg = i as ApiImage
            if (apiImg.cloudinaryId && apiImg.url) {
                return {
                    cloudinaryId: apiImg.cloudinaryId,
                    url: apiImg.url,
                    alt: apiImg.alt || source.name,
                }
            }
            const raw = apiImg.data ?? apiImg.r2Key ?? apiImg.url ?? ''
            return getPreviewSrc(String(raw || ''), apiImg.mimeType)
        })

        type RawAttr = ApiAttributeValue & { attribute_id?: string; attribute_value_id?: string }
        type RawFile = ApiFile & { name?: string; path?: string; size?: number }

        // Preparar variações
        const variations = (source.variations || []).map(v => {
            const vv = v as ApiVariation
            const imgs = (vv.images || []).map(img => {
                if (!img) return { filename: '', previewUrl: '' }
                const ai = img as ApiImage
                if (ai.cloudinaryId && ai.url) {
                    return {
                        filename: ai.alt || ai.name || '',
                        previewUrl: ai.url,
                        cloudinaryId: ai.cloudinaryId,
                    }
                }
                const raw = ai.data ?? ai.r2Key ?? ai.url ?? ''
                const preview = getPreviewSrc(String(raw || ''), ai.mimeType)
                return { filename: ai.alt || ai.name || '', previewUrl: preview }
            })
            const attrVals = (vv.attributeValues || []).map((av: RawAttr) => ({
                attributeId: av.attributeId || av.attribute_id || '',
                valueId: av.valueId || av.attribute_value_id || ''
            })).filter(a => a.attributeId && a.valueId)
            const files = (vv.files || []).map((f: RawFile) => {
                const r2 = f.r2Key || f.path || ''
                const url = r2 ? `/api/r2/download?r2Key=${encodeURIComponent(String(r2))}` : (f.url || '')
                return {
                    filename: f.filename || f.originalName || f.name || '',
                    originalName: f.originalName || '',
                    fileSize: f.fileSize ?? f.size ?? 0,
                    mimeType: f.mimeType || '',
                    r2Key: r2,
                    uploaded: !!r2,
                    url,
                }
            })
            return {
                // NÃO incluir id da variação original
                name: vv.name || '',
                price: vv.price ? String(vv.price) : '',
                isActive: vv.isActive ?? true,
                attributeValues: attrVals,
                files,
                images: imgs,
            }
        })

        const result = {
            // NÃO incluir id do produto original - será criado um novo
            name: `${source.name} (Cópia)`,
            slug: `${source.slug}-copia`,
            description: source.description || '',
            categoryId: source.categoryId ?? null,
            categoryIds: source.categoryIds || [],
            isActive: false, // Por padrão inativo
            isFeatured: false, // Por padrão não destacado
            fileType: (source.fileType === 'png' ? 'png' : 'pdf') as 'pdf' | 'png',
            images,
            price: source.price ? String(source.price) : '',
            variations,
            attributes: source.attributes || [],
        }

        return result
    }, [detailedProduct, product])

    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
            <DialogContent
                className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg"
                onPointerDownOutside={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('[role="listbox"]') ||
                        target.closest('[role="dialog"]') ||
                        target.closest('[data-radix-popper-content-wrapper]')) {
                        e.preventDefault()
                    }
                }}
                onInteractOutside={(e) => {
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
                        <Copy className="w-5 h-5" />
                        Duplicar Produto
                    </DialogTitle>
                    <DialogDescription>
                        Edite as informações abaixo conforme necessário. Um novo produto será criado sem alterar o original.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    {(isLoadingCategories || isLoadingAttributes || !detailedProduct) ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-3">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                <p className="text-sm text-gray-600">Carregando dados do produto...</p>
                            </div>
                        </div>
                    ) : (
                        <ProductForm
                            defaultValues={defaultValues as typeof defaultValues & { images: string[] }}
                            availableAttributes={availableAttributes}
                            categories={categories}
                            isEditing={false} // FALSE = modo criação (não edição)
                            productId={undefined} // SEM productId = cria novo produto
                            onSuccess={() => {
                                onSuccess?.()
                                onOpenChange(false)
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

