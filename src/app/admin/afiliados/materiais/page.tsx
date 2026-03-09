'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Eye,
    EyeOff,
    Clock,
    Loader2,
    Upload,
    FileText,
    Image as ImageIcon,
    Video,
    Archive,
    File,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Material {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    affiliateType: string;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    previewUrl?: string | null;
}

function formatFileSize(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMediaIcon(fileType: string | null) {
    switch (fileType) {
        case 'image': return <ImageIcon className="w-5 h-5 text-blue-500" />;
        case 'video': return <Video className="w-5 h-5 text-purple-500" />;
        case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
        case 'zip': return <Archive className="w-5 h-5 text-amber-500" />;
        default: return <File className="w-5 h-5 text-gray-500" />;
    }
}

function getAffiliateTypeBadge(type: string) {
    switch (type) {
        case 'common': return <Badge className="bg-blue-100 text-blue-700 text-xs">Comum</Badge>;
        case 'commercial_license': return <Badge className="bg-purple-100 text-purple-700 text-xs">Licença Comercial</Badge>;
        case 'both': return <Badge className="bg-green-100 text-green-700 text-xs">Ambos</Badge>;
        default: return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
}

export default function MateriaisPage() {
    const { showToast } = useToast();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    // Criar/editar
    const [showForm, setShowForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAffiliateType, setFormAffiliateType] = useState<string>('both');
    const [formDisplayOrder, setFormDisplayOrder] = useState(0);

    // Upload
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<{
        fileUrl: string;
        fileKey: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        mimeType: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Deletar
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType]);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterType !== 'all') params.set('type', filterType);

            const response = await fetch(`/api/admin/affiliates/materials?${params}`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(data.materials || []);
            }
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            showToast('Arquivo muito grande. Limite: 100MB', 'error');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            const uploadPromise = new Promise<{ fileUrl: string; fileKey: string; fileName: string; fileType: string; fileSize: number; mimeType: string }>((resolve, reject) => {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        setUploadProgress(Math.round((event.loaded / event.total) * 100));
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data.file);
                    } else {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            reject(new Error(data.error || 'Erro no upload'));
                        } catch {
                            reject(new Error('Erro no upload'));
                        }
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Erro de rede')));
                xhr.open('POST', '/api/admin/affiliates/materials/upload');
                xhr.send(formData);
            });

            const fileData = await uploadPromise;
            setUploadedFile(fileData);

            // Criar preview local (blob URL) para imagens e vídeos
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }

            // Auto-fill title from filename if empty
            if (!formTitle) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                setFormTitle(nameWithoutExt);
            }

            showToast('Arquivo enviado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro no upload:', error);
            showToast(error instanceof Error ? error.message : 'Erro ao enviar arquivo', 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreate = async () => {
        if (!formTitle.trim()) {
            showToast('Título é obrigatório', 'error');
            return;
        }

        if (!uploadedFile && !editingMaterial) {
            showToast('Selecione um arquivo para enviar', 'error');
            return;
        }

        try {
            setSaving(true);

            if (editingMaterial) {
                // Atualizar
                const updateData: Record<string, unknown> = {
                    title: formTitle.trim(),
                    description: formDescription.trim() || null,
                    affiliateType: formAffiliateType,
                    displayOrder: formDisplayOrder,
                };

                if (uploadedFile) {
                    updateData.fileUrl = uploadedFile.fileUrl;
                    updateData.fileName = uploadedFile.fileName;
                    updateData.fileType = uploadedFile.fileType;
                    updateData.fileSize = uploadedFile.fileSize;
                }

                const response = await fetch(`/api/admin/affiliates/materials/${editingMaterial.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                });

                if (response.ok) {
                    showToast('Material atualizado!', 'success');
                    resetForm();
                    loadMaterials();
                } else {
                    const data = await response.json();
                    showToast(data.error || 'Erro ao atualizar', 'error');
                }
            } else {
                // Criar
                const response = await fetch('/api/admin/affiliates/materials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: formTitle.trim(),
                        description: formDescription.trim() || null,
                        fileUrl: uploadedFile!.fileUrl,
                        fileName: uploadedFile!.fileName,
                        fileType: uploadedFile!.fileType,
                        fileSize: uploadedFile!.fileSize,
                        affiliateType: formAffiliateType,
                        displayOrder: formDisplayOrder,
                    }),
                });

                if (response.ok) {
                    showToast('Material criado com sucesso!', 'success');
                    resetForm();
                    loadMaterials();
                } else {
                    const data = await response.json();
                    showToast(data.error || 'Erro ao criar material', 'error');
                }
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro ao salvar material', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/affiliates/materials/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive }),
            });

            if (response.ok) {
                showToast(!currentActive ? 'Material ativado!' : 'Material desativado!', 'success');
                loadMaterials();
            }
        } catch (error) {
            console.error('Erro ao alternar status:', error);
        }
    };

    const handleReorder = async (id: string, direction: 'up' | 'down') => {
        const idx = materials.findIndex(m => m.id === id);
        if (idx === -1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= materials.length) return;

        const currentOrder = materials[idx].displayOrder;
        const swapOrder = materials[swapIdx].displayOrder;

        try {
            await Promise.all([
                fetch(`/api/admin/affiliates/materials/${materials[idx].id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayOrder: swapOrder }),
                }),
                fetch(`/api/admin/affiliates/materials/${materials[swapIdx].id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayOrder: currentOrder }),
                }),
            ]);
            loadMaterials();
        } catch (error) {
            console.error('Erro ao reordenar:', error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setDeleting(true);
            const response = await fetch(`/api/admin/affiliates/materials/${deleteId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                showToast('Material removido!', 'success');
                setDeleteId(null);
                loadMaterials();
            } else {
                showToast('Erro ao remover material', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            showToast('Erro ao remover material', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingMaterial(null);
        setFormTitle('');
        setFormDescription('');
        setFormAffiliateType('both');
        setFormDisplayOrder(0);
        setUploadedFile(null);
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    const openEditForm = (material: Material) => {
        setEditingMaterial(material);
        setFormTitle(material.title);
        setFormDescription(material.description || '');
        setFormAffiliateType(material.affiliateType);
        setFormDisplayOrder(material.displayOrder);
        setUploadedFile(null);
        // Usar previewUrl do material (signed URL gerada pelo backend)
        setPreviewUrl(material.previewUrl || null);
        setShowForm(true);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#FD9555]" />
                        Materiais para Afiliados
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Gerencie materiais de divulgação (imagens, vídeos, PDFs) para os afiliados
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="common">Comum</SelectItem>
                            <SelectItem value="commercial_license">Licença Comercial</SelectItem>
                            <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                        className="bg-[#FD9555] hover:bg-[#e8864d] text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Material
                    </Button>
                </div>
            </div>

            {/* Formulário de criação/edição */}
            {showForm && (
                <Card className="border-2 border-[#FED466] shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-[#FD9555]" />
                            {editingMaterial ? 'Editar Material' : 'Novo Material'}
                        </CardTitle>
                        <CardDescription>
                            {editingMaterial
                                ? 'Atualize os dados do material. Para trocar o arquivo, faça um novo upload.'
                                : 'Envie um arquivo e preencha as informações do material'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Upload de arquivo */}
                        <div className="space-y-2">
                            <Label>Arquivo</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                {uploading ? (
                                    <div className="space-y-2">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FD9555]" />
                                        <p className="text-sm text-gray-500">Enviando... {uploadProgress}%</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                                            <div
                                                className={`bg-[#FD9555] h-2 rounded-full transition-all`}
                                                style={{ width: `${uploadProgress}%` }} // dynamic progress width
                                            />
                                        </div>
                                    </div>
                                ) : uploadedFile ? (
                                    <div className="space-y-3">
                                        {/* Preview do arquivo enviado */}
                                        {previewUrl && uploadedFile.fileType === 'image' && (
                                            <div className="max-w-xs mx-auto rounded-lg overflow-hidden border border-gray-200">
                                                <img
                                                    src={previewUrl}
                                                    alt={uploadedFile.fileName}
                                                    className="w-full h-auto max-h-48 object-contain bg-gray-50"
                                                />
                                            </div>
                                        )}
                                        {previewUrl && uploadedFile.fileType === 'video' && (
                                            <div className="max-w-sm mx-auto rounded-lg overflow-hidden border border-gray-200">
                                                <video
                                                    src={previewUrl}
                                                    controls
                                                    className="w-full max-h-48 bg-black"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-2">
                                            {getMediaIcon(uploadedFile.fileType)}
                                            <span className="text-sm font-medium">{uploadedFile.fileName}</span>
                                            <span className="text-xs text-gray-400">({formatFileSize(uploadedFile.fileSize)})</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setUploadedFile(null);
                                                if (previewUrl && previewUrl.startsWith('blob:')) {
                                                    URL.revokeObjectURL(previewUrl);
                                                }
                                                setPreviewUrl(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Remover
                                        </Button>
                                    </div>
                                ) : editingMaterial ? (
                                    <div className="space-y-3">
                                        {/* Preview do arquivo existente */}
                                        {previewUrl && editingMaterial.fileType === 'image' && (
                                            <div className="max-w-xs mx-auto rounded-lg overflow-hidden border border-gray-200">
                                                <img
                                                    src={previewUrl}
                                                    alt={editingMaterial.fileName}
                                                    className="w-full h-auto max-h-48 object-contain bg-gray-50"
                                                />
                                            </div>
                                        )}
                                        {previewUrl && editingMaterial.fileType === 'video' && (
                                            <div className="max-w-sm mx-auto rounded-lg overflow-hidden border border-gray-200">
                                                <video
                                                    src={previewUrl}
                                                    controls
                                                    className="w-full max-h-48 bg-black"
                                                />
                                            </div>
                                        )}
                                        {previewUrl && editingMaterial.fileType === 'pdf' && (
                                            <div className="max-w-xs mx-auto">
                                                <a
                                                    href={previewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Visualizar PDF
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-2">
                                            {getMediaIcon(editingMaterial.fileType)}
                                            <span className="text-sm">{editingMaterial.fileName}</span>
                                            <span className="text-xs text-gray-400">({formatFileSize(editingMaterial.fileSize)})</span>
                                        </div>
                                        <p className="text-xs text-gray-400">Arquivo atual — faça upload para substituir</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 mr-1" />
                                            Substituir Arquivo
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-8 h-8 mx-auto text-gray-300" />
                                        <p className="text-sm text-gray-500">
                                            Arraste ou clique para enviar
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Imagens, vídeos, PDFs, ZIPs — até 100MB
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-3 h-3 mr-1" />
                                            Selecionar Arquivo
                                        </Button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*,video/*,.pdf,.zip"
                                    onChange={handleFileUpload}
                                    title="Selecionar arquivo para upload"
                                />
                            </div>
                        </div>

                        {/* Título */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Título *</Label>
                            <Input
                                id="title"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="Ex: Banner para redes sociais"
                                maxLength={255}
                            />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Descreva o material para os afiliados..."
                                className="min-h-[80px] resize-y"
                                maxLength={2000}
                            />
                        </div>

                        {/* Tipo de afiliado + Ordem */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Disponível para</Label>
                                <Select value={formAffiliateType} onValueChange={setFormAffiliateType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">Todos os afiliados</SelectItem>
                                        <SelectItem value="common">Apenas afiliados comuns</SelectItem>
                                        <SelectItem value="commercial_license">Apenas licença comercial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="displayOrder">Ordem de exibição</Label>
                                <Input
                                    id="displayOrder"
                                    type="number"
                                    min={0}
                                    value={formDisplayOrder}
                                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={resetForm}>
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCreate}
                                disabled={saving || (!uploadedFile && !editingMaterial)}
                                className="bg-[#FD9555] hover:bg-[#e8864d] text-white"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-1" />
                                )}
                                {editingMaterial ? 'Salvar Alterações' : 'Criar Material'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista de materiais */}
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FD9555]" />
                    <p className="text-sm text-gray-500 mt-2">Carregando materiais...</p>
                </div>
            ) : materials.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">Nenhum Material</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Nenhum material cadastrado ainda. Clique em &quot;Novo Material&quot; para adicionar o primeiro.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {materials.map((material, idx) => (
                        <Card
                            key={material.id}
                            className={`transition-all ${material.isActive
                                ? 'border-l-4 border-l-[#FD9555] hover:shadow-md'
                                : 'border-l-4 border-l-gray-300 opacity-60'
                                }`}
                        >
                            <CardContent className="py-4 px-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5 shrink-0">
                                            {getMediaIcon(material.fileType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm sm:text-base truncate">{material.title}</h3>
                                            {material.description && (
                                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2">{material.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                {getAffiliateTypeBadge(material.affiliateType)}
                                                <Badge variant={material.isActive ? 'default' : 'secondary'}
                                                    className={`text-xs ${material.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {material.isActive ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                                <span className="text-xs text-gray-400">
                                                    {material.fileName} • {formatFileSize(material.fileSize)}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(material.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReorder(material.id, 'up')}
                                            disabled={idx === 0}
                                            title="Mover para cima"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ArrowUp className="w-4 h-4 text-gray-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReorder(material.id, 'down')}
                                            disabled={idx === materials.length - 1}
                                            title="Mover para baixo"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ArrowDown className="w-4 h-4 text-gray-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(material.id, material.isActive)}
                                            title={material.isActive ? 'Desativar' : 'Ativar'}
                                            className="h-8 w-8 p-0"
                                        >
                                            {material.isActive ? (
                                                <EyeOff className="w-4 h-4 text-gray-500" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditForm(material)}
                                            title="Editar"
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit className="w-4 h-4 text-blue-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(material.id)}
                                            title="Excluir"
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de confirmação de exclusão */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Material</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir este material? O arquivo será removido permanentemente e os afiliados não terão mais acesso.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
