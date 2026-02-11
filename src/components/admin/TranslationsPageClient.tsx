'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Languages,
    Search,
    RefreshCw,
    Save,
    Replace,
    Eye,
    Check,
    X,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Pencil,
    BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────
interface TranslationRow {
    productId: string;
    ptName: string;
    ptSlug: string;
    translatedName: string | null;
    translatedSlug: string | null;
    translatedDescription: string | null;
    translatedShortDescription: string | null;
    locale: string | null;
    isActive: boolean;
}

interface BulkPreviewItem {
    type: 'product' | 'variation';
    id: string;
    ptName: string;
    currentName: string;
    newName: string;
    descriptionChanged: boolean;
    shortDescriptionChanged: boolean;
}

// ─── Component ─────────────────────────────────────────────────
export function TranslationsPageClient() {
    // State
    const [locale, setLocale] = useState<'es' | 'en'>('es');
    const [translations, setTranslations] = useState<TranslationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editShortDescription, setEditShortDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Bulk replace state
    const [showBulkReplace, setShowBulkReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [bulkPreview, setBulkPreview] = useState<BulkPreviewItem[] | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Glossary state
    const [showGlossary, setShowGlossary] = useState(false);
    const [glossaryPreview, setGlossaryPreview] = useState<BulkPreviewItem[] | null>(null);
    const [glossaryLoading, setGlossaryLoading] = useState(false);

    // ─── Fetch ─────────────────────────────────────────────────────
    const fetchTranslations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                locale,
                page: page.toString(),
                limit: '50',
            });
            if (search) params.set('search', search);

            const res = await fetch(`/api/admin/translations?${params}`);
            const data = await res.json();

            if (res.ok) {
                setTranslations(data.products);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            } else {
                toast.error('Erro ao carregar traduções');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    }, [locale, page, search]);

    useEffect(() => {
        fetchTranslations();
    }, [fetchTranslations]);

    // Reset page on search/locale change
    useEffect(() => {
        setPage(1);
    }, [search, locale]);

    // ─── Edit Handlers ─────────────────────────────────────────────
    function startEdit(row: TranslationRow) {
        setEditingId(row.productId);
        setEditName(row.translatedName || '');
        setEditDescription(row.translatedDescription || '');
        setEditShortDescription(row.translatedShortDescription || '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditDescription('');
        setEditShortDescription('');
    }

    async function saveEdit(productId: string) {
        if (!editName.trim()) {
            toast.error('O nome traduzido não pode estar vazio');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/translations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    locale,
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    shortDescription: editShortDescription.trim() || null,
                }),
            });

            if (res.ok) {
                toast.success('Tradução salva com sucesso!');
                cancelEdit();
                fetchTranslations();
            } else {
                toast.error('Erro ao salvar tradução');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    }

    // ─── Bulk Replace ──────────────────────────────────────────────
    async function previewBulkReplace() {
        if (!findText.trim()) {
            toast.error('Informe o texto a buscar');
            return;
        }

        setBulkLoading(true);
        try {
            const res = await fetch('/api/admin/translations/bulk-replace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locale,
                    findText: findText.trim(),
                    replaceText: replaceText.trim(),
                    dryRun: true,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setBulkPreview(data.preview);
                if (data.preview.length === 0) {
                    toast.info('Nenhuma tradução encontrada com esse texto');
                }
            } else {
                toast.error('Erro ao buscar preview');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setBulkLoading(false);
        }
    }

    async function applyBulkReplace() {
        setBulkLoading(true);
        try {
            const res = await fetch('/api/admin/translations/bulk-replace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locale,
                    findText: findText.trim(),
                    replaceText: replaceText.trim(),
                    dryRun: false,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`${data.updated} tradução(ões) atualizadas!`);
                setBulkPreview(null);
                setFindText('');
                setReplaceText('');
                setShowBulkReplace(false);
                fetchTranslations();
            } else {
                toast.error('Erro ao aplicar substituição');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setBulkLoading(false);
        }
    }

    // ─── Glossary Fix ──────────────────────────────────────────────
    async function previewGlossary() {
        setGlossaryLoading(true);
        try {
            const res = await fetch('/api/admin/translations/apply-glossary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dryRun: true }),
            });

            const data = await res.json();
            if (res.ok) {
                setGlossaryPreview(data.preview);
                if (data.preview.length === 0) {
                    toast.success('Todas as traduções já estão corretas!');
                }
            } else {
                toast.error('Erro ao verificar glossário');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setGlossaryLoading(false);
        }
    }

    async function applyGlossary() {
        setGlossaryLoading(true);
        try {
            const res = await fetch('/api/admin/translations/apply-glossary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dryRun: false }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`${data.updated} tradução(ões) corrigidas pelo glossário!`);
                setGlossaryPreview(null);
                setShowGlossary(false);
                fetchTranslations();
            } else {
                toast.error('Erro ao aplicar glossário');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setGlossaryLoading(false);
        }
    }

    // ─── Stats ────────────────────────────────────────────────────
    const translated = translations.filter(t => t.translatedName).length;
    const missing = translations.filter(t => !t.translatedName).length;

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-xl shadow-sm">
                        <Languages className="w-7 h-7 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Traduções</h1>
                        <p className="text-gray-500 text-sm">
                            Gerencie as traduções dos produtos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={() => { setShowGlossary(true); previewGlossary(); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Corrigir pelo Glossário
                    </Button>
                    <Button
                        onClick={() => setShowBulkReplace(true)}
                        className="bg-[#FD9555] hover:bg-[#fd8540] text-gray-800 font-medium shadow-sm"
                    >
                        <Replace className="w-4 h-4 mr-2" />
                        Substituir em Massa
                    </Button>
                    <Button
                        onClick={fetchTranslations}
                        variant="outline"
                        className="border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-sm text-gray-500">Total de Produtos</p>
                        <p className="text-2xl font-bold text-gray-900">{total}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-sm text-gray-500">Traduzidos ({locale.toUpperCase()})</p>
                        <p className="text-2xl font-bold text-green-600">{translated}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4 pb-4">
                        <p className="text-sm text-gray-500">Sem tradução</p>
                        <p className="text-2xl font-bold text-amber-600">{missing}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Language selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Idioma:</span>
                            <Select value={locale} onValueChange={(v) => setLocale(v as 'es' | 'en')}>
                                <SelectTrigger className="w-[160px] bg-gray-50 border-gray-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                                    <SelectItem value="en">🇺🇸 English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por nome (PT ou traduzido)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-gray-50 border-gray-300"
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Translation Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[45%]">
                                        Português (Original)
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[45%]">
                                        {locale === 'es' ? '🇪🇸 Español' : '🇺🇸 English'} (Tradução)
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[10%]">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-3">
                                                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                                            </td>
                                        </tr>
                                    ))
                                ) : translations.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                                            Nenhum produto encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    translations.map((row) => (
                                        <tr
                                            key={row.productId}
                                            className={`hover:bg-gray-50 transition-colors ${!row.translatedName ? 'bg-amber-50/50' : ''
                                                }`}
                                        >
                                            {/* PT Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {row.ptName}
                                                    </span>
                                                    {!row.isActive && (
                                                        <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                                                            Inativo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Translated Name (editable) */}
                                            <td className="px-4 py-3">
                                                {editingId === row.productId ? (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                                Nome
                                                            </label>
                                                            <Input
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                className="bg-gray-50 border-gray-300 text-sm"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                                Descrição curta
                                                            </label>
                                                            <Textarea
                                                                value={editShortDescription}
                                                                onChange={(e) => setEditShortDescription(e.target.value)}
                                                                className="bg-gray-50 border-gray-300 text-sm min-h-[60px]"
                                                                rows={2}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                                Descrição completa
                                                            </label>
                                                            <Textarea
                                                                value={editDescription}
                                                                onChange={(e) => setEditDescription(e.target.value)}
                                                                className="bg-gray-50 border-gray-300 text-sm min-h-[80px]"
                                                                rows={3}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {row.translatedName ? (
                                                            <span className="text-sm text-gray-700">{row.translatedName}</span>
                                                        ) : (
                                                            <span className="text-sm text-amber-600 italic flex items-center gap-1">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                Sem tradução
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-center">
                                                {editingId === row.productId ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => saveEdit(row.productId)}
                                                            disabled={saving}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                                                        >
                                                            {saving ? (
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={cancelEdit}
                                                            className="h-8 px-3 border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => startEdit(row)}
                                                        className="h-8 px-3 border-gray-300 bg-gray-100 text-gray-800 hover:bg-[#FED466]/30 hover:border-[#FED466]"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                                Página {page} de {totalPages} ({total} produtos)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="h-8 border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="h-8 border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Bulk Replace Dialog ────────────────────────────────── */}
            <Dialog open={showBulkReplace} onOpenChange={setShowBulkReplace}>
                <DialogContent className="sm:max-w-[650px] bg-gray-50 border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <Replace className="w-5 h-5 text-[#FD9555]" />
                            Substituir em Massa
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Language badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Idioma alvo:</span>
                            <Badge className="bg-[#FED466] text-gray-800 hover:bg-[#FED466]">
                                {locale === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                            </Badge>
                        </div>

                        {/* Find & Replace inputs */}
                        <div className="grid gap-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Buscar texto (na tradução {locale.toUpperCase()})
                                </label>
                                <Input
                                    value={findText}
                                    onChange={(e) => { setFindText(e.target.value); setBulkPreview(null); }}
                                    placeholder="Ex: RADIODIFUSIÓN"
                                    className="bg-white border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Substituir por
                                </label>
                                <Input
                                    value={replaceText}
                                    onChange={(e) => { setReplaceText(e.target.value); setBulkPreview(null); }}
                                    placeholder="Ex: BROADCASTING"
                                    className="bg-white border-gray-300"
                                />
                            </div>
                        </div>

                        {/* Preview button */}
                        <Button
                            onClick={previewBulkReplace}
                            disabled={bulkLoading || !findText.trim()}
                            className="w-full bg-[#FED466] hover:bg-[#FD9555] text-gray-800 font-medium"
                        >
                            {bulkLoading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4 mr-2" />
                            )}
                            Pré-visualizar Mudanças
                        </Button>

                        {/* Preview results */}
                        {bulkPreview && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">
                                    {bulkPreview.length} item(s) serão alterados:
                                </p>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-lg border border-gray-200 bg-white p-2">
                                    {bulkPreview.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            Nenhuma mudança encontrada
                                        </p>
                                    ) : (
                                        bulkPreview.map((item, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                                                <p className="text-gray-500 text-xs mb-1">
                                                    PT: {item.ptName}
                                                </p>
                                                <p className="text-red-600 line-through">
                                                    {item.currentName}
                                                </p>
                                                <p className="text-emerald-700 font-medium">
                                                    {item.newName}
                                                </p>
                                                {item.descriptionChanged && (
                                                    <Badge variant="secondary" className="mt-1 text-xs bg-gray-200">
                                                        + descrição
                                                    </Badge>
                                                )}
                                                {item.shortDescriptionChanged && (
                                                    <Badge variant="secondary" className="mt-1 ml-1 text-xs bg-gray-200">
                                                        + desc. curta
                                                    </Badge>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setShowBulkReplace(false); setBulkPreview(null); }}
                            className="border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                            Cancelar
                        </Button>
                        {bulkPreview && bulkPreview.length > 0 && (
                            <Button
                                onClick={applyBulkReplace}
                                disabled={bulkLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                                {bulkLoading ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                )}
                                Aplicar {bulkPreview.length} Mudança(s)
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Glossary Dialog ────────────────────────────────────── */}
            <Dialog open={showGlossary} onOpenChange={setShowGlossary}>
                <DialogContent className="sm:max-w-[650px] bg-gray-50 border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <BookOpen className="w-5 h-5 text-emerald-600" />
                            Corrigir pelo Glossário
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            O glossário contém termos específicos que devem ter traduções customizadas em Espanhol.
                            Clique abaixo para verificar quais traduções precisam ser corrigidas.
                        </p>

                        {glossaryLoading && !glossaryPreview ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : glossaryPreview && glossaryPreview.length === 0 ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-emerald-600">
                                <Check className="w-5 h-5" />
                                <span className="font-medium">Todas as traduções estão corretas!</span>
                            </div>
                        ) : glossaryPreview ? (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">
                                    {glossaryPreview.length} tradução(ões) precisam ser corrigidas:
                                </p>
                                <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-lg border border-gray-200 bg-white p-2">
                                    {glossaryPreview.map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                                            <p className="text-gray-500 text-xs mb-1">
                                                PT: {item.ptName}
                                            </p>
                                            <p className="text-red-600 line-through">
                                                {item.currentName}
                                            </p>
                                            <p className="text-emerald-700 font-medium">
                                                {item.newName}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setShowGlossary(false); setGlossaryPreview(null); }}
                            className="border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={previewGlossary}
                            disabled={glossaryLoading}
                            className="bg-[#FED466] hover:bg-[#FD9555] text-gray-800 font-medium"
                        >
                            {glossaryLoading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4 mr-2" />
                            )}
                            Verificar
                        </Button>
                        {glossaryPreview && glossaryPreview.length > 0 && (
                            <Button
                                onClick={applyGlossary}
                                disabled={glossaryLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                                {glossaryLoading ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                )}
                                Corrigir {glossaryPreview.length} Tradução(ões)
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
