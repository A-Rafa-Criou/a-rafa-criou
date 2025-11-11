import React, { useEffect, useRef, useState } from 'react'
import { Package, FolderPlus, X, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Nested Dialog removed to keep a single outer modal during create/edit
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import AttributeManager from '@/components/admin/AttributeManager'
import VariationManager from '@/components/admin/VariationManager'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useTranslation } from 'react-i18next'
import CategoryDialog from '@/components/admin/CategoryDialog'
import { uploadDirectToR2, uploadDirectToCloudinary, compressImage } from '@/lib/upload-utils'

// Types used in this form
interface Category {
    id: string
    name: string
    slug?: string
    description?: string | null
    parentId?: string | null
    icon?: string | null
    sortOrder?: number
    isActive?: boolean
    subcategories?: Category[]
}
interface AttributeValue { id: string; value: string }
interface Attribute { id: string; name: string; values?: AttributeValue[] }
interface UploadedFile { file?: File; filename?: string; r2Key?: string }
interface ImageFile { file?: File; filename?: string; previewUrl?: string }
interface VariationForm { name: string; price: string; attributeValues: { attributeId: string; valueId: string }[]; files: UploadedFile[]; images: ImageFile[] }
interface ProductFormData {
    name: string;
    slug?: string;
    description?: string;
    categoryId?: string | null; // Mantido para compatibilidade
    categoryIds?: string[]; // NOVO: array de IDs de categorias
    isActive?: boolean;
    isFeatured?: boolean;
    images: string[];
    price?: string;
    variations: VariationForm[];
    attributes?: { attributeId: string; valueIds: string[] }[]
}

interface ProductFormProps { defaultValues?: Partial<ProductFormData & { id?: string }>; categories?: Category[]; availableAttributes?: Attribute[]; isEditing?: boolean; productId?: string | null; onSuccess?: () => void }

export default function ProductForm({ defaultValues, categories = [], availableAttributes = [], isEditing = false, productId = null, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const { t } = useTranslation('common')
    const [step, setStep] = useState<number>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // 🚀 NOVOS ESTADOS: Upload em background (começa ao anexar arquivo)
    const [uploadingFiles, setUploadingFiles] = useState<Map<string, { progress: number; status: 'uploading' | 'done' | 'error'; result?: unknown }>>(new Map())
    const uploadCacheRef = useRef<Map<File, { r2Key?: string; cloudinaryId?: string; url?: string }>>(new Map())
    
    // 🗑️ NOVO: Rastreamento de arquivos para limpeza de cache ao remover
    const fileToKeyMapRef = useRef<Map<File, string>>(new Map()) // File -> uploadKey

    // 🌍 NOVOS ESTADOS: Tradução automática em background
    const [translating, setTranslating] = useState(false)
    const [translationCache, setTranslationCache] = useState<{
        en?: { name?: string; description?: string; shortDescription?: string }
        es?: { name?: string; description?: string; shortDescription?: string }
    }>({})
    const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 🌍 FUNÇÃO: Tradução automática ao digitar (debounced)
    const translateProductData = async (name: string, description?: string, shortDescription?: string) => {
        // Limpar timeout anterior
        if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current)
        }

        // Só traduzir se tiver pelo menos nome
        if (!name || name.length < 3) return

        // Debounce de 1 segundo
        translationTimeoutRef.current = setTimeout(async () => {
            setTranslating(true)
            try {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'product',
                        data: { name, description: description || null, shortDescription: shortDescription || null },
                        targetLangs: ['EN', 'ES']
                    })
                })

                if (!response.ok) throw new Error('Falha na tradução')

                const data = await response.json()
                setTranslationCache(data.translations || {})
                console.log('✅ Produto traduzido em background:', data.translations)
            } catch (error) {
                console.error('⚠️ Erro na tradução automática:', error)
            } finally {
                setTranslating(false)
            }
        }, 1000) // Espera 1s após usuário parar de digitar
    }

    // 🚀 FUNÇÃO: Upload automático de PDF assim que anexado (em background)
    const uploadPDFInBackground = async (file: File) => {
        const fileKey = `pdf-${file.name}-${file.size}`;
        
        // 🗑️ Rastrear File -> fileKey para limpeza posterior
        fileToKeyMapRef.current.set(file, fileKey);

        // Se já está no cache, retornar imediatamente
        if (uploadCacheRef.current.has(file)) {
            console.log(`✅ PDF já em cache: ${file.name}`);
            return uploadCacheRef.current.get(file);
        }

        // Marcar como "uploading"
        setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 0, status: 'uploading' }));

        try {
            // TENTATIVA 1: Upload direto R2
            try {
                const result = await uploadDirectToR2(file, (progress) => {
                    setUploadingFiles(prev => new Map(prev).set(fileKey, { progress, status: 'uploading' }));
                });

                const cacheData = { r2Key: result.key, url: result.url };
                uploadCacheRef.current.set(file, cacheData);
                setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 100, status: 'done', result: cacheData }));
                
                // 🔄 ATUALIZAR r2Key no objeto variation
                setFormData(prev => ({
                    ...prev,
                    variations: prev.variations.map(v => ({
                        ...v,
                        files: v.files.map(f =>
                            f.file === file ? { ...f, r2Key: result.key } : f
                        )
                    }))
                }));
                
                console.log(`✅ PDF enviado em background (direto): ${file.name}`);
                return cacheData;
            } catch {
                console.warn(`⚠️ Upload direto falhou, usando fallback...`);

                // FALLBACK: Upload via backend
                const CHUNK_SIZE = 4 * 1024 * 1024;

                if (file.size <= CHUNK_SIZE) {
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch('/api/r2/upload', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error('Upload failed');
                    const j = await res.json();

                    const cacheData = { r2Key: j?.data?.key };
                    uploadCacheRef.current.set(file, cacheData);
                    setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 100, status: 'done', result: cacheData }));
                    
                    // 🔄 ATUALIZAR r2Key no objeto variation
                    setFormData(prev => ({
                        ...prev,
                        variations: prev.variations.map(v => ({
                            ...v,
                            files: v.files.map(f =>
                                f.file === file ? { ...f, r2Key: j?.data?.key } : f
                            )
                        }))
                    }));
                    
                    return cacheData;
                } else {
                    // Upload em chunks
                    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    for (let i = 0; i < totalChunks; i++) {
                        const start = i * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, file.size);
                        const chunk = file.slice(start, end);

                        const fd = new FormData();
                        fd.append('chunk', chunk);
                        fd.append('uploadId', uploadId);
                        fd.append('chunkIndex', i.toString());
                        fd.append('totalChunks', totalChunks.toString());
                        fd.append('fileName', file.name);
                        fd.append('fileType', file.type);
                        fd.append('fileSize', file.size.toString());

                        await fetch('/api/r2/upload-chunk', { method: 'POST', body: fd });
                        setUploadingFiles(prev => new Map(prev).set(fileKey, {
                            progress: Math.round(((i + 1) / totalChunks) * 80),
                            status: 'uploading'
                        }));
                    }

                    const finalRes = await fetch('/api/r2/finalize-chunk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uploadId })
                    });
                    const j = await finalRes.json();

                    const cacheData = { r2Key: j?.data?.key };
                    uploadCacheRef.current.set(file, cacheData);
                    setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 100, status: 'done', result: cacheData }));
                    
                    // 🔄 ATUALIZAR r2Key no objeto variation
                    setFormData(prev => ({
                        ...prev,
                        variations: prev.variations.map(v => ({
                            ...v,
                            files: v.files.map(f =>
                                f.file === file ? { ...f, r2Key: j?.data?.key } : f
                            )
                        }))
                    }));
                    
                    return cacheData;
                }
            }
        } catch (error) {
            console.error(`❌ Erro no upload de ${file.name}:`, error);
            setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 0, status: 'error' }));
            throw error;
        }
    };

    // 🚀 FUNÇÃO: Upload automático de imagem assim que anexada (em background)
    const uploadImageInBackground = async (file: File, folder: 'products' | 'variations') => {
        const fileKey = `img-${file.name}-${file.size}`;
        
        // 🗑️ Rastrear File -> fileKey para limpeza posterior
        fileToKeyMapRef.current.set(file, fileKey);

        // Se já está no cache, retornar imediatamente
        if (uploadCacheRef.current.has(file)) {
            console.log(`✅ Imagem já em cache: ${file.name}`);
            return uploadCacheRef.current.get(file);
        }

        setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 0, status: 'uploading' }));

        try {
            // Comprimir primeiro
            const compressed = await compressImage(file, 800, 0.75);
            setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 20, status: 'uploading' }));

            // TENTATIVA 1: Upload direto Cloudinary
            try {
                const result = await uploadDirectToCloudinary(compressed, folder, (progress) => {
                    setUploadingFiles(prev => new Map(prev).set(fileKey, {
                        progress: 20 + Math.round(progress * 0.8),
                        status: 'uploading'
                    }));
                });

                const cacheData = { cloudinaryId: result.publicId, url: result.secureUrl };
                uploadCacheRef.current.set(file, cacheData);
                setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 100, status: 'done', result: cacheData }));
                
                // 🔄 ATUALIZAR cloudinaryId no objeto variation (se for imagem de variação)
                if (folder === 'variations') {
                    setFormData(prev => ({
                        ...prev,
                        variations: prev.variations.map(v => ({
                            ...v,
                            images: v.images.map(img =>
                                img.file === file ? { ...img, cloudinaryId: result.publicId, url: result.secureUrl } : img
                            )
                        }))
                    }));
                }
                
                console.log(`✅ Imagem enviada em background (direto): ${file.name}`);
                return cacheData;
            } catch {
                console.warn(`⚠️ Upload direto falhou, usando fallback...`);

                // FALLBACK: Upload via backend
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(compressed);
                });

                const res = await fetch('/api/cloudinary/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, folder })
                });

                if (!res.ok) throw new Error('Upload failed');
                const data = await res.json();

                const cacheData = { cloudinaryId: data.cloudinaryId, url: data.url };
                uploadCacheRef.current.set(file, cacheData);
                setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 100, status: 'done', result: cacheData }));
                
                // 🔄 ATUALIZAR cloudinaryId no objeto variation (se for imagem de variação)
                if (folder === 'variations') {
                    setFormData(prev => ({
                        ...prev,
                        variations: prev.variations.map(v => ({
                            ...v,
                            images: v.images.map(img =>
                                img.file === file ? { ...img, cloudinaryId: data.cloudinaryId, url: data.url } : img
                            )
                        }))
                    }));
                }
                
                return cacheData;
            }
        } catch (error) {
            console.error(`❌ Erro no upload de ${file.name}:`, error);
            setUploadingFiles(prev => new Map(prev).set(fileKey, { progress: 0, status: 'error' }));
            throw error;
        }
    };

    const [localAttributes, setLocalAttributes] = useState<Attribute[]>(availableAttributes)
    const [isLoadingAttributes, setIsLoadingAttributes] = useState(false)

    // Carregar atributos do banco de dados apenas uma vez ao montar
    useEffect(() => {
        let isMounted = true

        async function loadAttributesFromDB() {
            // Se já tem atributos via prop, usar eles
            if (availableAttributes.length > 0) {
                setLocalAttributes(availableAttributes)
                return
            }

            try {
                setIsLoadingAttributes(true)
                const response = await fetch('/api/admin/attributes')
                if (response.ok && isMounted) {
                    const data = await response.json()
                    setLocalAttributes(data)
                }
            } catch {
                // Failed to load attributes
            } finally {
                if (isMounted) {
                    setIsLoadingAttributes(false)
                }
            }
        }

        loadAttributesFromDB()

        return () => {
            isMounted = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Executa apenas uma vez ao montar

    const [categoriesLocal, setCategoriesLocal] = useState<Category[]>([])
    const [categoriesOriginal, setCategoriesOriginal] = useState<Category[]>([]) // Para o CategoryDialog
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)
    const [categoriesError, setCategoriesError] = useState<string | null>(null)
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

    // Carregar categorias - USAR prop categories se disponível, senão carregar do banco
    useEffect(() => {
        let isMounted = true

        async function loadCategories() {
            try {
                setIsLoadingCategories(true)
                setCategoriesError(null)

                // Se categorias foram passadas como prop E não estão vazias, usar elas
                if (categories && categories.length > 0) {
                    console.log('✅ [CATEGORIAS] Usando categorias da prop:', categories.length)

                    if (!isMounted) return

                    setCategoriesOriginal(categories)

                    // Flatten categories and subcategories para o Select
                    const flatCategories: Category[] = []
                    categories.forEach((cat: Category) => {
                        flatCategories.push(cat)
                        if (cat.subcategories && cat.subcategories.length > 0) {
                            // Adicionar subcategorias com marcação de parentId
                            cat.subcategories.forEach(sub => {
                                flatCategories.push({ ...sub, parentId: cat.id })
                            })
                        }
                    })

                    setCategoriesLocal(flatCategories)
                    setIsLoadingCategories(false)
                    return
                }

                // Se não, carregar do banco
                console.log('🔵 [CATEGORIAS] Carregando do banco...')
                const response = await fetch('/api/admin/categories')

                console.log('🔵 [CATEGORIAS] Response status:', response.status, response.statusText)

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('❌ [CATEGORIAS] Erro na resposta:', errorText)
                    throw new Error('Falha ao carregar categorias')
                }

                const data = await response.json()
                console.log('✅ [CATEGORIAS] Carregadas do banco:', data.length, data)

                if (!isMounted) return

                // Guardar categorias originais para o CategoryDialog
                setCategoriesOriginal(data)

                // Flatten categories and subcategories para o Select
                const flatCategories: Category[] = []
                data.forEach((cat: Category) => {
                    flatCategories.push(cat)
                    if (cat.subcategories && cat.subcategories.length > 0) {
                        // Adicionar subcategorias com marcação de parentId
                        cat.subcategories.forEach(sub => {
                            flatCategories.push({ ...sub, parentId: cat.id })
                        })
                    }
                })

                setCategoriesLocal(flatCategories)
            } catch (error) {
                console.error('❌ [CATEGORIAS] Erro ao carregar:', error)
                setCategoriesError(error instanceof Error ? error.message : 'Erro ao carregar categorias')
                // Se falhar, ao menos deixar o formulário carregado
                setCategoriesLocal([])
            } finally {
                if (isMounted) {
                    setIsLoadingCategories(false)
                }
            }
        }

        loadCategories()

        return () => {
            isMounted = false
        }
    }, [categories])

    const [slugTouched, setSlugTouched] = useState(false)
    const [formData, setFormData] = useState<ProductFormData>(() => {
        return {
            name: defaultValues?.name || '',
            slug: defaultValues?.slug,
            description: defaultValues?.description,
            categoryId: defaultValues?.categoryId ?? null,
            categoryIds: defaultValues?.categoryIds || (defaultValues?.categoryId ? [defaultValues.categoryId] : []),
            isActive: defaultValues?.isActive ?? true,
            isFeatured: defaultValues?.isFeatured ?? false,
            images: defaultValues?.images || [],
            price: defaultValues?.price ? String(defaultValues.price) : '',
            variations: defaultValues?.variations || [{ name: '', price: '', attributeValues: [], files: [], images: [] }],
            attributes: defaultValues?.attributes || [],
        }
    })

    // Sync form state when defaultValues change (e.g., opening edit dialog with product data)
    useEffect(() => {
        if (!defaultValues) return

        console.log('🔄 [PRODUCT FORM] Sincronizando defaultValues:', {
            categoryId: defaultValues.categoryId,
            categoryIds: defaultValues.categoryIds,
            initialized: initializedRef.current,
            productId: defaultValues.id,
            lastProductId: lastProductIdRef.current
        })

        // Se o productId mudou, resetar a flag (novo produto sendo editado)
        if (defaultValues.id !== lastProductIdRef.current) {
            console.log('🆕 [PRODUCT FORM] Novo produto detectado, resetando flag')
            initializedRef.current = false
            lastProductIdRef.current = defaultValues.id
        }

        // Se já inicializamos uma vez E os categoryIds estão vazios, não resetar
        // (permite que o usuário selecione categorias sem serem apagadas)
        if (initializedRef.current && (!defaultValues.categoryIds || defaultValues.categoryIds.length === 0)) {
            console.log('⚠️ [PRODUCT FORM] Ignorando sync porque já inicializamos e categoryIds está vazio')
            return
        }

        initializedRef.current = true

        // ensure local attributes include server-provided ones
        // (merge by id, prefer existing local ones)
        if (availableAttributes && availableAttributes.length > 0) {
            setLocalAttributes(prev => {
                const map = new Map(prev.map(a => [a.id, a]))
                for (const a of availableAttributes) {
                    if (!map.has(a.id)) map.set(a.id, a)
                }
                return Array.from(map.values())
            })

        }

        // prepare image preview objects for product images so drag/reorder/removal work
        const prodImages = defaultValues?.images || []
        imagePreviewsRef.current = prodImages.map((imgData, i) => {
            if (typeof imgData === 'string') {
                return { file: undefined as File | undefined, filename: String(imgData).split('/').pop() || `img-${i}`, previewUrl: String(imgData) } as ImageFile
            }
            // imgData is an object with cloudinaryId and url
            const imgObj = imgData as { cloudinaryId?: string; url?: string; alt?: string }
            const previewUrl = imgObj.url || ''

            return {
                file: undefined as File | undefined,
                filename: imgObj.alt || imgObj.url?.split('/').pop() || `img-${i}`,
                previewUrl,
                cloudinaryId: imgObj.cloudinaryId
            } as ImageFile & { cloudinaryId?: string }
        }).filter(img => img.previewUrl) // Remove imagens sem URL válida

        // map variations: ensure images are ImageFile objects and keep files as-is
        type InFile = { filename?: string; originalName?: string; fileSize?: number; mimeType?: string; r2Key?: string; url?: string }
        const mappedVariations = (defaultValues?.variations || []).map((v: Partial<VariationForm>) => ({
            name: v.name || '',
            price: v.price ? String(v.price) : '',
            attributeValues: v.attributeValues || [],
            files: (v.files || []).map((f: string | InFile) => {
                if (typeof f === 'string') {
                    // if API sent a simple string (unlikely) treat as r2Key/url
                    const r = String(f)
                    return { file: undefined as File | undefined, filename: r.split('/').pop() || r, r2Key: r.startsWith('/') || r.includes('/api/r2/download') ? '' : r, url: r.startsWith('/') || r.includes('/api/r2/download') ? r : undefined }
                }
                const ff = f as InFile
                const url = ff.r2Key ? `/api/r2/download?r2Key=${encodeURIComponent(String(ff.r2Key))}` : (ff.url || undefined)
                return { file: undefined as File | undefined, filename: ff.filename || ff.originalName || url?.split('/').pop() || '', r2Key: ff.r2Key || '', originalName: ff.originalName, fileSize: ff.fileSize, mimeType: ff.mimeType, url }
            }),
            images: (v.images || []).map((img: string | { filename?: string; previewUrl?: string; url?: string; cloudinaryId?: string; alt?: string }, ii: number) => {
                // image may be string or object { cloudinaryId, url, alt }
                if (typeof img === 'string') return { file: undefined as File | undefined, filename: String(img).split('/').pop() || `var-${ii}`, previewUrl: img } as ImageFile
                type ImgObj = { filename?: string; previewUrl?: string; url?: string; cloudinaryId?: string; alt?: string }
                const io = img as ImgObj
                const preview = io.url || io.previewUrl || ''
                return {
                    file: undefined as File | undefined,
                    filename: io.alt || io.filename || String(preview || '').split('/').pop() || `var-${ii}`,
                    previewUrl: preview,
                    cloudinaryId: io.cloudinaryId
                } as ImageFile & { cloudinaryId?: string }
            }).filter(img => img.previewUrl && img.previewUrl.trim()) // Remove imagens sem URL válida
        }))

        const finalImages = imagePreviewsRef.current.map(img => img.previewUrl || '').filter(url => url.trim())

        setFormData({
            name: defaultValues?.name || '',
            slug: defaultValues?.slug,
            description: defaultValues?.description,
            categoryId: defaultValues?.categoryId ?? null,
            categoryIds: defaultValues?.categoryIds || (defaultValues?.categoryId ? [defaultValues.categoryId] : []),
            isActive: defaultValues?.isActive ?? true,
            isFeatured: defaultValues?.isFeatured ?? false,
            images: finalImages,
            price: defaultValues?.price ? String(defaultValues.price) : '',
            variations: mappedVariations.length > 0 ? mappedVariations : [{ name: '', price: '', attributeValues: [], files: [], images: [] }],
            attributes: defaultValues?.attributes || [],
        })
        // reset to first step when loading existing product
        setStep(1)
    }, [defaultValues, availableAttributes])

    // When availableAttributes prop changes after mount, merge into localAttributes
    useEffect(() => {
        if (!availableAttributes || availableAttributes.length === 0) return
        setLocalAttributes(prev => {
            const map = new Map(prev.map(a => [a.id, a]))
            for (const a of availableAttributes) {
                if (!map.has(a.id)) map.set(a.id, a)
            }
            return Array.from(map.values())
        })
    }, [availableAttributes])

    // Refs and state for image previews and drag-and-drop
    const imagePreviewsRef = useRef<ImageFile[]>([])
    const dragIndexRef = useRef<number | null>(null)
    type DragPayload = { source: 'product'; imageIndex: number; image: ImageFile } | { source: 'variation'; variationIndex: number; imageIndex: number; image: ImageFile } | null
    const dragDataRef = useRef<DragPayload>(null)
    const initializedRef = useRef<boolean>(false) // Flag para evitar reset de categoryIds
    const lastProductIdRef = useRef<string | undefined>(undefined) // Rastrear mudanças de produto

    const [productDraggingIndex, setProductDraggingIndex] = useState<number | null>(null)
    const [productDragOverIndex, setProductDragOverIndex] = useState<number | null>(null)

    function handleProductImageUpload(files: FileList) {
        const list = Array.from(files).map(f => {
            // 🚀 Upload automático ao anexar imagem do produto
            uploadImageInBackground(f, 'products').catch(err =>
                console.error('Erro no upload de background (imagem produto):', err)
            )

            return { file: f, filename: f.name, previewUrl: URL.createObjectURL(f) }
        })
        imagePreviewsRef.current = [...imagePreviewsRef.current, ...list]
        setFormData(prev => ({ ...prev, images: [...prev.images, ...list.map(l => l.previewUrl!)] }))
    }

    function removeProductImageByPreview(previewUrl: string) {
        setFormData(prev => {
            const idx = prev.images.indexOf(previewUrl)
            if (idx === -1) return prev
            const previews = [...imagePreviewsRef.current]
            const [removed] = previews.splice(idx, 1)
            if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
            imagePreviewsRef.current = previews
            return { ...prev, images: prev.images.filter(p => p !== previewUrl) }
        })
    }

    // Small Dropzone component (local) to provide drag/drop and click-to-select behavior
    type DropzoneProps = { accept?: string; multiple?: boolean; onFilesSelected: (files: FileList) => void; children?: React.ReactNode }
    function Dropzone({ accept, multiple, onFilesSelected, children }: DropzoneProps) {
        const inputRef = useRef<HTMLInputElement | null>(null)

        function onDrop(e: React.DragEvent) {
            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFilesSelected(e.dataTransfer.files)
            }
        }

        function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
            if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files)
                // Reset input para permitir selecionar o mesmo arquivo novamente
                e.target.value = ''
            }
        }

        function handleClick(e: React.MouseEvent) {
            e.stopPropagation()
            inputRef.current?.click()
        }

        return (
            <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={onDrop}
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                    title="Selecionar arquivos"
                    onClick={(e) => e.stopPropagation()}
                />
                {children}
            </div>
        )
    }

    function slugify(text: string) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') // spaces to dashes
            .replace(/[^a-z0-9-_]/g, '') // remove invalid chars
            .replace(/-+/g, '-')
    }

    // fetch categories from API when none were passed as prop
    useEffect(() => {
        if ((!categories || categories.length === 0) && categoriesLocal.length === 0) {
            ; (async () => {
                try {
                    const res = await fetch('/api/admin/categories')
                    if (!res.ok) return
                    const j = await res.json()
                    setCategoriesLocal(j.categories || [])
                } catch {
                    // Failed to fetch categories
                }
            })()
        }
    }, [categories, categoriesLocal.length])

    function prevStep() { setStep(s => Math.max(1, s - 1)) }
    function nextStep() { setStep(s => Math.min(3, s + 1)) }

    function validate(): string | null {
        // Clear previous error
        setFormError(null)

        // Obter IDs dos atributos selecionados no Step 2
        const selectedAttributeIds = (formData.attributes || []).map(a => a.attributeId)

        // Ensure every variation has at least one file
        for (const [idx, v] of formData.variations.entries()) {
            if (!v.files || v.files.length === 0) {
                return `Cada variação (linha ${idx + 1}) precisa ter pelo menos um arquivo.`
            }

            // Se há atributos selecionados, todas as variações DEVEM ter todos os atributos preenchidos
            if (selectedAttributeIds.length > 0) {
                const variationAttributeIds = (v.attributeValues || []).map(av => av.attributeId)

                // Verificar se TODOS os atributos selecionados estão presentes na variação
                const missingAttributes = selectedAttributeIds.filter(attrId => !variationAttributeIds.includes(attrId))

                if (missingAttributes.length > 0) {
                    const missingNames = missingAttributes.map(attrId => {
                        const attr = localAttributes.find(a => a.id === attrId)
                        return attr?.name || attrId
                    }).join(', ')

                    return `Variação "${v.name || `#${idx + 1}`}" está incompleta! Faltam os atributos: ${missingNames}. Selecione todos para garantir que o cliente compre o produto correto.`
                }
            }
        }

        if (!formData.name) return 'Nome do produto é obrigatório.'

        // price must be present or at least one variation price
        const priceOk = !!formData.price || formData.variations.some(v => !!v.price)
        if (!priceOk) return 'Preço do produto é obrigatório (ou preencha preço nas variações).'

        return null
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        const err = validate()
        if (err) {
            setFormError(err)
            return
        }
        setIsSubmitting(true)
        try {
            // Types
            type R2File = { filename: string; originalName: string; fileSize: number; mimeType: string; r2Key: string }
            type CloudinaryImage = { cloudinaryId: string; url: string; width?: number; height?: number; format?: string; size?: number; alt?: string; isMain?: boolean; order?: number }
            type VariationPayload = { id?: string; name: string; price: number; isActive: boolean; files: R2File[]; images?: CloudinaryImage[]; attributeValues: VariationForm['attributeValues'] }

            // UPLOAD PARALELO - MUITO MAIS RÁPIDO! 🚀

            // 1. Coletar todos os arquivos que precisam de upload
            const allPDFUploads: Array<{ file: File; variationIndex: number; fileIndex: number }> = []
            const allVariationImageUploads: Array<{ file: File; variationIndex: number; imageIndex: number }> = []
            const allProductImageUploads: Array<{ file: File; imageIndex: number }> = []

            // Coletar PDFs das variações
            formData.variations.forEach((variation, vi) => {
                variation.files.forEach((f, fi) => {
                    if (f.file) {
                        allPDFUploads.push({ file: f.file, variationIndex: vi, fileIndex: fi })
                    }
                })
                    ; (variation.images || []).forEach((img, ii) => {
                        if (img.file) {
                            allVariationImageUploads.push({ file: img.file, variationIndex: vi, imageIndex: ii })
                        }
                    })
            })

            // Coletar imagens do produto
            imagePreviewsRef.current.forEach((img, i) => {
                if (img.file) {
                    allProductImageUploads.push({ file: img.file, imageIndex: i })
                }
            })

            // 2. 🚀 Upload PARALELO TOTAL com cache (usa uploads já feitos)
            const [pdfResults, variationImageResults, productImageResults] = await Promise.all([
                // PDFs: Verifica cache primeiro, senão faz upload
                Promise.all(allPDFUploads.map(async ({ file, variationIndex, fileIndex }) => {
                    // Se já foi enviado em background, usar cache
                    const cached = uploadCacheRef.current.get(file);
                    if (cached?.r2Key) {
                        console.log(`✅ Usando PDF do cache: ${file.name}`);
                        return {
                            variationIndex,
                            fileIndex,
                            r2File: {
                                filename: file.name,
                                originalName: file.name,
                                fileSize: file.size,
                                mimeType: file.type,
                                r2Key: cached.r2Key
                            }
                        };
                    }

                    // Senão, fazer upload agora (com fallback)
                    return uploadPDFInBackground(file).then(result => ({
                        variationIndex,
                        fileIndex,
                        r2File: {
                            filename: file.name,
                            originalName: file.name,
                            fileSize: file.size,
                            mimeType: file.type,
                            r2Key: result!.r2Key!
                        }
                    }));
                })),

                // 🚀 Upload de imagens com FALLBACK automático
                // Imagens de variações: Verifica cache primeiro
                Promise.all(allVariationImageUploads.map(async ({ file, variationIndex, imageIndex }) => {
                    // Se já foi comprimida e enviada em background, usar cache
                    const cached = uploadCacheRef.current.get(file);
                    if (cached?.cloudinaryId) {
                        console.log(`✅ Usando imagem de variação do cache: ${file.name}`);
                        return {
                            variationIndex,
                            imageIndex,
                            cloudinaryImage: {
                                cloudinaryId: cached.cloudinaryId,
                                url: cached.url || '',
                                alt: file.name,
                                isMain: imageIndex === 0,
                                order: imageIndex
                            }
                        };
                    }

                    // Senão, fazer upload agora (com compressão + fallback)
                    return uploadImageInBackground(file, 'variations').then(result => ({
                        variationIndex,
                        imageIndex,
                        cloudinaryImage: {
                            cloudinaryId: result!.cloudinaryId!,
                            url: result!.url || '',
                            alt: file.name,
                            isMain: imageIndex === 0,
                            order: imageIndex
                        }
                    }));
                })),

                // 🚀 Upload de imagens do produto com FALLBACK automático
                // Imagens do produto: Verifica cache primeiro
                Promise.all(allProductImageUploads.map(async ({ file, imageIndex }) => {
                    // Se já foi comprimida e enviada em background, usar cache
                    const cached = uploadCacheRef.current.get(file);
                    if (cached?.cloudinaryId) {
                        console.log(`✅ Usando imagem do produto do cache: ${file.name}`);
                        return {
                            imageIndex,
                            cloudinaryImage: {
                                cloudinaryId: cached.cloudinaryId,
                                url: cached.url || '',
                                alt: file.name,
                                isMain: imageIndex === 0,
                                order: imageIndex
                            }
                        };
                    }

                    // Senão, fazer upload agora (com compressão + fallback)
                    return uploadImageInBackground(file, 'products').then(result => ({
                        imageIndex,
                        cloudinaryImage: {
                            cloudinaryId: result!.cloudinaryId!,
                            url: result!.url || '',
                            alt: file.name,
                            isMain: imageIndex === 0,
                            order: imageIndex
                        }
                    }));
                }))
            ])

            // 3. Montar payloads com os resultados
            const variationsPayload: VariationPayload[] = formData.variations.map((variation, vi) => {
                // PDFs desta variação
                const filesPayload: R2File[] = variation.files.map((f, fi) => {
                    if (f.file) {
                        const uploaded = pdfResults.find(r => r.variationIndex === vi && r.fileIndex === fi)
                        return uploaded!.r2File
                    } else if ((f as unknown as R2File).r2Key) {
                        return f as unknown as R2File
                    }
                    return null!
                }).filter(Boolean)

                // Imagens desta variação
                const variationImagesPayload: CloudinaryImage[] = (variation.images || []).map((img, ii) => {
                    if (img.file) {
                        const uploaded = variationImageResults.find(r => r.variationIndex === vi && r.imageIndex === ii)
                        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl)
                        return uploaded!.cloudinaryImage
                    } else if (img.previewUrl && img.previewUrl.startsWith('http')) {
                        const cloudinaryId = (img as unknown as { cloudinaryId?: string }).cloudinaryId || ''
                        if (cloudinaryId) {
                            return {
                                cloudinaryId,
                                url: img.previewUrl,
                                alt: img.filename,
                                isMain: ii === 0,
                                order: ii
                            }
                        }
                    }
                    return null!
                }).filter(Boolean)

                return {
                    name: variation.name,
                    price: parseFloat(variation.price) || 0,
                    isActive: true,
                    files: filesPayload,
                    images: variationImagesPayload,
                    attributeValues: variation.attributeValues || [],
                }
            })

            // Imagens do produto
            const productImagesPayload: CloudinaryImage[] = imagePreviewsRef.current.map((img, i) => {
                if (img.file) {
                    const uploaded = productImageResults.find(r => r.imageIndex === i)
                    if (img.previewUrl) URL.revokeObjectURL(img.previewUrl)
                    return uploaded!.cloudinaryImage
                } else if (img.previewUrl && img.previewUrl.startsWith('http')) {
                    const cloudinaryId = (img as unknown as { cloudinaryId?: string }).cloudinaryId || ''
                    if (cloudinaryId) {
                        return {
                            cloudinaryId,
                            url: img.previewUrl,
                            alt: img.filename,
                            isMain: i === 0,
                            order: i
                        }
                    }
                }
                return null!
            }).filter(Boolean)

            const productPrice = formData.price ? parseFloat(formData.price) : (formData.variations[0] ? parseFloat(formData.variations[0].price || '0') : 0)

            const payload = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                price: productPrice,
                categoryId: formData.categoryId || null,
                categoryIds: formData.categoryIds || [], // NOVO: array de IDs de categorias
                isActive: formData.isActive,
                isFeatured: formData.isFeatured,
                images: productImagesPayload,
                variations: variationsPayload,
                files: [],
                attributes: formData.attributes || [],
                // include any locally-created attribute definitions so server can create them
                attributeDefinitions: localAttributes
                    .filter(a => a.id.startsWith('local-'))
                    .map(a => ({ id: a.id, name: a.name, values: (a.values || []).map(v => ({ id: v.id, value: v.value })) })),
                // 🌍 Enviar traduções em cache (se existirem)
                translations: translationCache
            }

            // Type-safe extraction of id from defaultValues: prefer explicit prop, fallback to defaultValues.id
            const dv = defaultValues as Partial<ProductFormData & { id?: string }> | undefined
            const effectiveProductId = productId ?? dv?.id
            const url = isEditing && effectiveProductId ? `/api/admin/products/${effectiveProductId}` : '/api/admin/products'
            const method = isEditing && effectiveProductId ? 'PUT' : 'POST'
            // When updating, include variation ids if present in defaultValues
            if (isEditing) {
                // Merge existing variation ids into payload.variations by index if available
                const existingVariations = (defaultValues?.variations || []) as Array<Partial<{ id?: string }>>
                for (let i = 0; i < (payload.variations || []).length; i++) {
                    const pv = payload.variations[i] as VariationPayload
                    const ev = existingVariations[i]
                    if (ev && ev.id) pv.id = ev.id
                }
            }

            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Erro na API de produtos: ${res.status} ${txt}`)
            }
            await res.json()
            setIsSubmitting(false)
            if (onSuccess) onSuccess()
            else router.push('/admin/produtos')
        } catch (err: unknown) {
            setIsSubmitting(false)
            setFormError('Erro ao salvar produto: ' + (err instanceof Error ? err.message : String(err)))
        }
    }

    // Small helper UI lists (language removed from variations - kept for potential future use)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                        <div className="flex items-start justify-between">
                            <div>{formError}</div>
                            <button type="button" onClick={() => setFormError(null)} className="text-sm text-red-600 underline">Fechar</button>
                        </div>
                    </div>
                )}
                {/* Stepper header */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => setStep(1)} className={`px-3 py-1 rounded ${step === 1 ? 'bg-yellow-200 text-yellow-900' : 'bg-gray-100'}`}>1. Informações</button>
                        <button type="button" onClick={() => setStep(2)} className={`px-3 py-1 rounded ${step === 2 ? 'bg-yellow-200 text-yellow-900' : 'bg-gray-100'}`}>2. Atributos</button>
                        <button type="button" onClick={() => setStep(3)} className={`px-3 py-1 rounded ${step === 3 ? 'bg-yellow-200 text-yellow-900' : 'bg-gray-100'}`}>3. Variações</button>
                    </div>
                    <div className="text-sm text-gray-500">Passo {step} de 3</div>
                </div>

                {/* Step 1 */}
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Informações do Produto</CardTitle>
                            <CardDescription>Dados básicos, imagens e categoria.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Nome *</Label>
                                    <Input value={formData.name} onChange={e => {
                                        const val = e.target.value
                                        setFormData(prev => ({ ...prev, name: val }))
                                        // auto-fill slug only if user hasn't touched slug field
                                        if (!slugTouched) setFormData(prev => ({ ...prev, slug: slugify(val) }))
                                        // 🌍 Disparar tradução automática
                                        translateProductData(val, formData.description, undefined)
                                    }} />
                                </div>
                                <div>
                                    <Label>Slug</Label>
                                    <Input value={formData.slug || ''} onChange={e => {
                                        setSlugTouched(true)
                                        setFormData(prev => ({ ...prev, slug: e.target.value }))
                                    }} />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Descrição *</Label>
                                    <RichTextEditor
                                        content={formData.description || ''}
                                        onChange={(html) => {
                                            setFormData(prev => ({ ...prev, description: html }))
                                            // 🌍 Disparar tradução automática
                                            translateProductData(formData.name, html, undefined)
                                        }}
                                        placeholder="Descreva o produto com detalhes..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Categorias *</Label>
                                    {categoriesError && (
                                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                            ⚠️ {categoriesError}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            {isLoadingCategories ? (
                                                <div className="flex-1 h-10 flex items-center justify-center border-2 border-gray-300 rounded-md bg-gray-50">
                                                    <span className="text-sm text-gray-500">Carregando categorias...</span>
                                                </div>
                                            ) : (
                                                <Select
                                                    value=""
                                                    onValueChange={val => {
                                                        if (val && !formData.categoryIds?.includes(val)) {
                                                            console.log('📝 [CATEGORIA] Adicionando:', val)
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                categoryIds: [...(prev.categoryIds || []), val],
                                                                // Primeira categoria se torna a principal
                                                                categoryId: prev.categoryIds?.length === 0 ? val : prev.categoryId
                                                            }))
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Adicionar categoria..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categoriesLocal.length === 0 ? (
                                                            <SelectItem value="empty" disabled>
                                                                Nenhuma categoria encontrada. Crie uma categoria primeiro!
                                                            </SelectItem>
                                                        ) : (
                                                            categoriesLocal
                                                                .filter(c => c.isActive !== false)
                                                                .filter(c => !formData.categoryIds?.includes(c.id))
                                                                .map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        {c.parentId ? `  ↳ ${c.name}` : c.name}
                                                                    </SelectItem>
                                                                ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setIsCategoryDialogOpen(true)}
                                                disabled={isLoadingCategories}
                                            >
                                                <FolderPlus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        {/* Badges das categorias selecionadas */}
                                        {formData.categoryIds && formData.categoryIds.length > 0 && (
                                            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
                                                {formData.categoryIds.map((catId) => {
                                                    const category = categoriesLocal.find(c => c.id === catId)
                                                    if (!category) return null
                                                    const isPrimary = catId === formData.categoryId
                                                    return (
                                                        <div
                                                            key={catId}
                                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isPrimary
                                                                ? 'bg-[#FED466] text-gray-900 font-medium'
                                                                : 'bg-white border border-gray-300 text-gray-700'
                                                                }`}
                                                        >
                                                            <span>{category.name}</span>
                                                            {isPrimary && (
                                                                <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded">
                                                                    Principal
                                                                </span>
                                                            )}
                                                            {!isPrimary && (formData.categoryIds?.length || 0) > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            categoryId: catId,
                                                                        }))
                                                                    }}
                                                                    className="text-xs underline hover:text-gray-900"
                                                                >
                                                                    Tornar principal
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newIds = formData.categoryIds?.filter(id => id !== catId) || []
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        categoryIds: newIds,
                                                                        // Se remover a categoria principal, tornar a primeira como principal
                                                                        categoryId: catId === prev.categoryId ? (newIds[0] || null) : prev.categoryId
                                                                    }))
                                                                }}
                                                                className="hover:text-red-600"
                                                                title="Remover categoria"
                                                                aria-label="Remover categoria"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex flex-col gap-2">
                                        <Label>Imagens do Produto</Label>
                                        <div className="mt-2">
                                            <Dropzone accept="image/*" multiple onFilesSelected={files => handleProductImageUpload(files)}>
                                                <div className="block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
                                                    onDragOver={e => {
                                                        // Só previne default se está arrastando uma imagem existente
                                                        if (dragDataRef.current) {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                        }
                                                    }}
                                                    onDrop={e => {
                                                        const payload = dragDataRef.current
                                                        // Se não tem payload, deixa o Dropzone lidar (upload de novos arquivos)
                                                        if (!payload) return

                                                        e.preventDefault()
                                                        e.stopPropagation()

                                                        if (payload.source === 'product') {
                                                            const from = payload.imageIndex
                                                            if (typeof from === 'number') {
                                                                setFormData(prev => {
                                                                    const arr = [...prev.images]
                                                                    const [moved] = arr.splice(from, 1)
                                                                    arr.push(moved)
                                                                    return { ...prev, images: arr }
                                                                })
                                                                const previews = [...imagePreviewsRef.current]
                                                                const [movedP] = previews.splice(from, 1)
                                                                previews.push(movedP)
                                                                imagePreviewsRef.current = previews
                                                            }
                                                        } else if (payload.source === 'variation') {
                                                            const fromVar = payload.variationIndex!
                                                            const fromIdx = payload.imageIndex
                                                            const imgObj = payload.image
                                                            setFormData(prev => {
                                                                const newVars = prev.variations.map((v, vi) => vi === fromVar ? { ...v, images: v.images.filter((_, i) => i !== fromIdx) } : v)
                                                                return { ...prev, variations: newVars, images: [...prev.images, imgObj!.previewUrl!] }
                                                            })
                                                            imagePreviewsRef.current = [...imagePreviewsRef.current, imgObj!]
                                                        }
                                                        dragDataRef.current = null
                                                        setProductDraggingIndex(null)
                                                    }}
                                                >
                                                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="text-sm text-gray-500">Arraste e solte ou clique para selecionar imagens</div>
                                                </div>
                                            </Dropzone>

                                            {formData.images.length > 0 && (
                                                <div className="mt-3 grid grid-cols-4 gap-2">
                                                    {formData.images.filter(url => typeof url === 'string' && url.trim()).map((url, idx) => (
                                                        <div key={url || idx}
                                                            draggable
                                                            onDragStart={e => {
                                                                dragIndexRef.current = idx
                                                                setProductDraggingIndex(idx)
                                                                // attach payload for moving between product and variations
                                                                dragDataRef.current = { source: 'product', imageIndex: idx, image: imagePreviewsRef.current[idx] }
                                                                e.dataTransfer!.effectAllowed = 'move'
                                                            }}
                                                            onDragEnd={() => { dragIndexRef.current = null; setProductDraggingIndex(null); setProductDragOverIndex(null); dragDataRef.current = null }}
                                                            onDragOver={e => { e.preventDefault(); setProductDragOverIndex(idx) }}
                                                            onDragLeave={() => setProductDragOverIndex(null)}
                                                            onDrop={e => {
                                                                e.preventDefault()
                                                                const from = dragIndexRef.current
                                                                const to = idx
                                                                if (from === null || from === to) return
                                                                setFormData(prev => {
                                                                    const arr = [...prev.images]
                                                                    const [moved] = arr.splice(from, 1)
                                                                    arr.splice(to, 0, moved)
                                                                    return { ...prev, images: arr }
                                                                })
                                                                const previews = [...imagePreviewsRef.current]
                                                                const [movedP] = previews.splice(from, 1)
                                                                previews.splice(to, 0, movedP)
                                                                imagePreviewsRef.current = previews
                                                                dragIndexRef.current = null
                                                                setProductDraggingIndex(null)
                                                                setProductDragOverIndex(null)
                                                            }}
                                                            className={`relative border rounded overflow-hidden cursor-move transition-transform duration-150 ${productDraggingIndex === idx ? 'opacity-70 scale-95' : ''} ${productDragOverIndex === idx ? 'ring-2 ring-yellow-300' : ''}`}>
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={url} alt={`preview-${idx}`} className="w-full h-24 object-cover" />
                                                            {idx === 0 && <span className="absolute left-1 top-1 bg-yellow-300 text-black text-xs px-2 py-0.5 rounded">Capa</span>}
                                                            <button type="button" aria-label={t('a11y.removeImage')} onClick={() => removeProductImageByPreview(url)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2 - Atributos */}
                {step === 2 && (
                    <>
                        {isLoadingAttributes && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                                <div className="text-sm text-blue-800">Carregando atributos do banco de dados...</div>
                            </div>
                        )}
                        <AttributeManager
                            selectedAttributes={formData.attributes || []}
                            onChange={attributes => setFormData(prev => ({ ...prev, attributes }))}
                            onAttributeCreated={(newAttribute) => {
                                // Auto-selecionar o novo atributo com todos os seus valores
                                const valueIds = newAttribute.values?.map(v => v.id) || []
                                setFormData(prev => ({
                                    ...prev,
                                    attributes: [
                                        ...(prev.attributes || []),
                                        { attributeId: newAttribute.id, valueIds }
                                    ]
                                }))
                                // Adicionar aos atributos locais também
                                setLocalAttributes(prev => {
                                    // Evitar duplicatas
                                    if (prev.some(a => a.id === newAttribute.id)) return prev
                                    return [...prev, newAttribute]
                                })
                            }}
                            onAttributesUpdated={(updatedAttributes) => {
                                // Quando o AttributeManager recarrega os atributos, atualizar aqui também
                                setLocalAttributes(updatedAttributes)
                            }}
                        />
                    </>
                )}

                {/* Step 3 - Variações */}
                {step === 3 && (
                    <>
                        {isLoadingAttributes ? (
                            <div className="p-8 text-center text-gray-500">
                                Carregando atributos...
                            </div>
                        ) : (
                            <VariationManager
                                variations={formData.variations}
                                attributes={localAttributes
                                    .filter(attr => formData.attributes?.some(a => a.attributeId === attr.id))
                                    .map(attr => {
                                        // Filtrar apenas os valores selecionados no Step 2
                                        const selectedAttr = formData.attributes?.find(a => a.attributeId === attr.id)
                                        return {
                                            ...attr,
                                            values: attr.values?.filter(v => selectedAttr?.valueIds.includes(v.id))
                                        }
                                    })
                                }
                                onChange={variations => setFormData(prev => ({ ...prev, variations }))}
                                onFileAttached={file => {
                                    // 🚀 Upload automático ao anexar PDF
                                    uploadPDFInBackground(file).catch(err =>
                                        console.error('Erro no upload de background (PDF):', err)
                                    )
                                }}
                                onFileRemoved={(file) => {
                                    // 🗑️ Limpar cache quando arquivo removido
                                    if (file) {
                                        const fileKey = fileToKeyMapRef.current.get(file);
                                        if (fileKey) {
                                            console.log(`🗑️ Limpando cache de upload: ${fileKey}`);
                                            setUploadingFiles(prev => {
                                                const newMap = new Map(prev);
                                                newMap.delete(fileKey);
                                                return newMap;
                                            });
                                            fileToKeyMapRef.current.delete(file);
                                        }
                                        uploadCacheRef.current.delete(file);
                                    }
                                }}
                                onImageAttached={file => {
                                    // 🚀 Upload automático ao anexar imagem
                                    uploadImageInBackground(file, 'variations').catch(err =>
                                        console.error('Erro no upload de background (imagem):', err)
                                    )
                                }}
                            />
                        )}
                    </>
                )}

                {/* Actions */}
                {/* 🌍 Indicador de tradução em andamento */}
                {translating && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                            <span className="text-sm font-medium text-purple-900">
                                Traduzindo produto automaticamente (EN + ES)...
                            </span>
                        </div>
                    </div>
                )}

                {/* 🚀 Indicador de uploads em background */}
                {uploadingFiles.size > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            <span className="text-sm font-medium text-blue-900">
                                Uploads em andamento: {Array.from(uploadingFiles.values()).filter(u => u.status === 'uploading').length} de {uploadingFiles.size}
                            </span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {Array.from(uploadingFiles.entries()).map(([key, upload]) => (
                                <div key={key} className="text-xs flex items-center gap-2">
                                    {upload.status === 'uploading' && <span className="text-blue-600">⏳ {Math.round(upload.progress)}%</span>}
                                    {upload.status === 'done' && <span className="text-green-600">✅ Completo</span>}
                                    {upload.status === 'error' && <span className="text-red-600">❌ Erro</span>}
                                    <span className="text-gray-600 truncate">{key.split('-')[1] || key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div>
                        <Button type="button" variant="outline" onClick={() => onSuccess ? onSuccess() : router.push('/admin/produtos')}>Cancelar</Button>
                    </div>
                    <div className="flex gap-2">
                        {step > 1 && <Button type="button" variant="ghost" onClick={prevStep}>Anterior</Button>}
                        {step < 3 && <Button type="button" onClick={nextStep}>Próximo</Button>}
                        {step === 3 && <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Produto' : 'Criar Produto')}</Button>}
                    </div>
                </div>
            </form>

            {/* Category Dialog */}
            <CategoryDialog
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                categories={categoriesOriginal.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug || '',
                    description: cat.description || null,
                    parentId: cat.parentId || null,
                    icon: cat.icon || null,
                    sortOrder: cat.sortOrder || 0,
                    isActive: cat.isActive ?? true,
                    subcategories: cat.subcategories?.map(sub => ({
                        id: sub.id,
                        name: sub.name,
                        slug: sub.slug || '',
                        description: sub.description || null,
                        parentId: sub.parentId || null,
                        icon: sub.icon || null,
                        sortOrder: sub.sortOrder || 0,
                        isActive: sub.isActive ?? true,
                    }))
                }))}
                onSuccess={(newCategory) => {
                    // Recarregar categorias do banco após criar uma nova
                    fetch('/api/admin/categories')
                        .then(res => res.json())
                        .then(data => {
                            setCategoriesOriginal(data)
                            // Flatten para o select
                            const flatCategories: Category[] = []
                            data.forEach((cat: Category) => {
                                flatCategories.push(cat)
                                if (cat.subcategories && cat.subcategories.length > 0) {
                                    flatCategories.push(...cat.subcategories)
                                }
                            })
                            setCategoriesLocal(flatCategories)
                        })
                    // Selecionar automaticamente a nova categoria
                    setFormData(prev => ({ ...prev, categoryId: newCategory.id }))
                }}
            />
        </div>
    )
}
