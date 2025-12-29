'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface PromotionFormProps {
    promotion?: {
        id?: string;
        name: string;
        description?: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        startDate: Date;
        endDate: Date;
        isActive: boolean;
        appliesTo: 'all' | 'specific';
        productIds?: string[];
        variationIds?: string[];
    };
    onSubmit: (data: unknown) => Promise<void>;
    onCancel: () => void;
}

// Helper para converter Date UTC para string datetime-local no horário de Brasília
function toSaoPauloTime(date: Date): string {
    // Pegar a data UTC e converter para string no formato de Brasília
    const brasiliaString = date.toLocaleString('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    // Formato retornado: "YYYY-MM-DD, HH:mm"
    // Converter para: "YYYY-MM-DDTHH:mm"
    const [datePart, timePart] = brasiliaString.split(', ');
    const result = `${datePart}T${timePart}`;

    console.log('🕐 [toSaoPauloTime]', {
        input: date.toISOString(),
        output: result,
        brasilia: date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });

    return result;
}

// Helper para converter datetime-local (em horário de Brasília) para Date UTC
function fromSaoPauloTime(dateTimeLocal: string): Date {
    if (!dateTimeLocal) {
        return new Date();
    }

    // O input retorna: "YYYY-MM-DDTHH:mm"
    // Precisamos interpretar isso como horário de Brasília e converter para UTC

    // Criar uma string ISO com timezone de Brasília explícito
    // Brasília está em UTC-3 (sem horário de verão desde 2019)
    const dateStr = dateTimeLocal + ':00-03:00';

    // Criar o Date - o JavaScript vai interpretar corretamente o timezone
    const result = new Date(dateStr);

    console.log('🕐 [fromSaoPauloTime]', {
        input: dateTimeLocal,
        dateStr,
        outputISO: result.toISOString(),
        outputBrasilia: result.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });

    return result;
}

export default function PromotionForm({
    promotion,
    onSubmit,
    onCancel,
}: PromotionFormProps) {
    // Calcular datas padrão: início = agora, fim = 1 dia depois
    const getDefaultDates = () => {
        const now = new Date();
        const oneDayLater = new Date(now);
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        return { start: now, end: oneDayLater };
    };

    const defaultDates = getDefaultDates();

    const [formData, setFormData] = useState({
        name: promotion?.name || '',
        description: promotion?.description || '',
        discountType: promotion?.discountType || 'percentage',
        discountValue: promotion?.discountValue || 0,
        startDate: promotion?.startDate ? new Date(promotion.startDate) : defaultDates.start,
        endDate: promotion?.endDate ? new Date(promotion.endDate) : defaultDates.end,
        isActive: promotion?.isActive ?? true,
        appliesTo: promotion?.appliesTo || 'all',
        productIds: promotion?.productIds || [],
        variationIds: promotion?.variationIds || [],
    });

    const [products, setProducts] = useState<{
        id: string;
        name: string;
        variations?: { id: string; name: string }[];
    }[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

    useEffect(() => {
        if (formData.appliesTo === 'specific') {
            loadProducts();
        }
    }, [formData.appliesTo]);

    const loadProducts = async () => {
        try {
            setLoadingProducts(true);
            // Incluir variações na resposta
            const res = await fetch('/api/admin/products?include=variations', {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                console.log('📦 [PROMOTION FORM] Produtos recebidos:', data);
                // A API pode retornar array direto ou objeto com propriedade products
                const productsList = Array.isArray(data) ? data : (data.products || []);
                console.log('📦 [PROMOTION FORM] Produtos processados:', productsList.length);
                setProducts(productsList);
            }
        } catch (error) {
            console.error('❌ [PROMOTION FORM] Erro ao carregar produtos:', error);
            setProducts([]); // Garantir que seja array vazio em caso de erro
        } finally {
            setLoadingProducts(false);
        }
    };

    // Selecionar/desselecionar todos os produtos
    const handleSelectAllProducts = () => {
        const allProductIds = products.map(p => p.id);
        if (formData.productIds.length === allProductIds.length) {
            // Desselecionar todos
            setFormData(prev => ({ ...prev, productIds: [] }));
        } else {
            // Selecionar todos
            setFormData(prev => ({ ...prev, productIds: allProductIds }));
        }
    };

    // Selecionar/desselecionar todas as variações de um produto
    const handleSelectAllVariations = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product?.variations) return;

        const variationIds = product.variations.map(v => v.id);
        const allSelected = variationIds.every(id => formData.variationIds.includes(id));

        if (allSelected) {
            // Desselecionar todas as variações deste produto
            setFormData(prev => ({
                ...prev,
                variationIds: prev.variationIds.filter(id => !variationIds.includes(id))
            }));
        } else {
            // Selecionar todas as variações deste produto
            setFormData(prev => ({
                ...prev,
                variationIds: [...new Set([...prev.variationIds, ...variationIds])]
            }));
        }
    };

    // Toggle expansão de variações
    const toggleProductExpansion = (productId: string) => {
        setExpandedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Debug: mostrar as datas que serão enviadas
        console.log('📅 [PROMOTION FORM] Datas sendo enviadas:', {
            startDate: formData.startDate,
            startDateISO: formData.startDate.toISOString(),
            startDateBrasilia: formData.startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            endDate: formData.endDate,
            endDateISO: formData.endDate.toISOString(),
            endDateBrasilia: formData.endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        });

        try {
            await onSubmit(formData);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="name">Nome da Promoção *</Label>
                    <span className="text-xs text-gray-500">
                        {formData.name.length}/20 caracteres
                    </span>
                </div>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                        if (e.target.value.length <= 20) {
                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                    }}
                    placeholder="Ex: PROMOÇÃO FIM DE ANO"
                    maxLength={20}
                    required
                />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Descrição da promoção"
                    rows={3}
                />
            </div>

            {/* Tipo e Valor do Desconto */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="discountType">Tipo de Desconto *</Label>
                    <Select
                        value={formData.discountType}
                        onValueChange={(value: 'percentage' | 'fixed') =>
                            setFormData((prev) => ({ ...prev, discountType: value }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="discountValue">
                        Valor do Desconto *{' '}
                        {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                    </Label>
                    <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        min="0"
                        max={formData.discountType === 'percentage' ? '100' : undefined}
                        value={formData.discountValue}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                discountValue: parseFloat(e.target.value) || 0,
                            }))
                        }
                        required
                    />
                </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início * (Horário de Brasília)</Label>
                    <Input
                        id="startDate"
                        type="datetime-local"
                        value={toSaoPauloTime(formData.startDate)}
                        onChange={(e) => {
                            const newStartDate = fromSaoPauloTime(e.target.value);
                            setFormData((prev) => {
                                // Se a nova data inicial for após a data final, ajustar a data final
                                const newEndDate = newStartDate >= prev.endDate
                                    ? new Date(newStartDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia
                                    : prev.endDate;

                                return {
                                    ...prev,
                                    startDate: newStartDate,
                                    endDate: newEndDate,
                                };
                            });
                        }}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término * (Horário de Brasília)</Label>
                    <Input
                        id="endDate"
                        type="datetime-local"
                        value={toSaoPauloTime(formData.endDate)}
                        min={toSaoPauloTime(formData.startDate)}
                        onChange={(e) => {
                            const newEndDate = fromSaoPauloTime(e.target.value);
                            // Validar que a data final seja posterior à inicial
                            if (newEndDate > formData.startDate) {
                                setFormData((prev) => ({
                                    ...prev,
                                    endDate: newEndDate,
                                }));
                            }
                        }}
                        required
                    />
                    {formData.endDate <= formData.startDate && (
                        <p className="text-xs text-red-600">
                            A data final deve ser posterior à data inicial
                        </p>
                    )}
                </div>
            </div>

            {/* Aplicar a */}
            <div className="space-y-2">
                <Label htmlFor="appliesTo">Aplicar Promoção *</Label>
                <Select
                    value={formData.appliesTo}
                    onValueChange={(value: 'all' | 'specific') =>
                        setFormData((prev) => ({ ...prev, appliesTo: value }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Produtos</SelectItem>
                        <SelectItem value="specific">Produtos Específicos</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Seleção de Produtos (se específico) */}
            {formData.appliesTo === 'specific' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Produtos e Variações</Label>
                        {products.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllProducts}
                                className="text-xs"
                            >
                                {formData.productIds.length === products.length
                                    ? 'Desselecionar Todos'
                                    : 'Selecionar Todos os Produtos'}
                            </Button>
                        )}
                    </div>
                    {loadingProducts ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="border rounded-md p-4 text-center text-gray-500">
                            Nenhum produto encontrado
                        </div>
                    ) : (
                        <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-3">
                            {products.map((product) => {
                                const isExpanded = expandedProducts.includes(product.id);
                                const hasVariations = product.variations && product.variations.length > 0;
                                const allVariationsSelected = hasVariations
                                    ? product.variations!.every(v => formData.variationIds.includes(v.id))
                                    : false;

                                return (
                                    <div key={product.id} className="border rounded-md p-3 bg-gray-50">
                                        {/* Checkbox do Produto */}
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center space-x-2 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.productIds.includes(product.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                productIds: [...prev.productIds, product.id],
                                                            }));
                                                        } else {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                productIds: prev.productIds.filter(
                                                                    (id) => id !== product.id
                                                                ),
                                                            }));
                                                        }
                                                    }}
                                                    className="h-4 w-4"
                                                    aria-label={`Selecionar produto ${product.name}`}
                                                />
                                                <span className="text-sm font-semibold">{product.name}</span>
                                            </label>

                                            {/* Botão para expandir variações */}
                                            {hasVariations && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleProductExpansion(product.id)}
                                                    className="text-xs"
                                                >
                                                    {isExpanded ? '▼' : '▶'} {product.variations!.length} variações
                                                </Button>
                                            )}
                                        </div>

                                        {/* Lista de Variações (expansível) */}
                                        {hasVariations && isExpanded && (
                                            <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-300 pl-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-gray-600">Variações:</span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSelectAllVariations(product.id)}
                                                        className="text-xs h-7"
                                                    >
                                                        {allVariationsSelected
                                                            ? 'Desselecionar Todas'
                                                            : 'Selecionar Todas'}
                                                    </Button>
                                                </div>
                                                {product.variations!.map((variation) => (
                                                    <label
                                                        key={variation.id}
                                                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.variationIds.includes(variation.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        variationIds: [...prev.variationIds, variation.id],
                                                                    }));
                                                                } else {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        variationIds: prev.variationIds.filter(
                                                                            (id) => id !== variation.id
                                                                        ),
                                                                    }));
                                                                }
                                                            }}
                                                            className="h-4 w-4"
                                                            aria-label={`Selecionar variação ${variation.name}`}
                                                        />
                                                        <span className="text-sm text-gray-700">{variation.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Contador de selecionados */}
                    {products.length > 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                            {formData.productIds.length} produto(s) e {formData.variationIds.length} variação(ões) selecionada(s)
                        </div>
                    )}
                </div>
            )}

            {/* Status */}
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="h-4 w-4"
                    aria-label="Ativar promoção"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                    Promoção Ativa
                </Label>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#FED466] hover:bg-[#FD9555] text-gray-800"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar Promoção'
                    )}
                </Button>
            </div>
        </form>
    );
}
