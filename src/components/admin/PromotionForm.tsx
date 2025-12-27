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

export default function PromotionForm({
    promotion,
    onSubmit,
    onCancel,
}: PromotionFormProps) {
    const [formData, setFormData] = useState({
        name: promotion?.name || '',
        description: promotion?.description || '',
        discountType: promotion?.discountType || 'percentage',
        discountValue: promotion?.discountValue || 0,
        startDate: promotion?.startDate ? new Date(promotion.startDate) : new Date(),
        endDate: promotion?.endDate ? new Date(promotion.endDate) : new Date(),
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
                <Label htmlFor="name">Nome da Promoção *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Black Friday 2024"
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
                    <Label htmlFor="startDate">Data de Início *</Label>
                    <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate.toISOString().slice(0, 16)}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                startDate: new Date(e.target.value),
                            }))
                        }
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="endDate">Data de Término *</Label>
                    <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate.toISOString().slice(0, 16)}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                endDate: new Date(e.target.value),
                            }))
                        }
                        required
                    />
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
