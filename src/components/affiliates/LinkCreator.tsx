'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, Package, DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-helpers';

interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    image: string | null;
}

interface LinkCreatorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    mode: 'create' | 'edit';
    initialData?: {
        linkId?: string;
        customName?: string;
        productId?: string | null;
    };
}

export default function LinkCreator({
    open,
    onOpenChange,
    onSuccess,
    mode,
    initialData,
}: LinkCreatorProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>(initialData?.productId || '');
    const [customName, setCustomName] = useState(initialData?.customName || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(true);

    useEffect(() => {
        if (open) {
            if (mode === 'create') {
                fetchProducts();
            }
            // Modo edição não precisa carregar produtos
        }
    }, [open, mode]);

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await fetch('/api/affiliates/products');
            const data = await response.json();
            if (data.success) {
                setProducts(data.products);
            }
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setProductsLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (mode === 'create' && !customName.trim()) {
            alert('Digite um nome para identificar este link');
            return;
        }

        if (mode === 'edit' && !customName.trim()) {
            alert('O nome do link não pode ficar vazio');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'create') {
                const response = await fetch('/api/affiliates/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: null, // Link geral
                        customName: customName.trim(),
                    }),
                });

                if (response.ok) {
                    onSuccess();
                    onOpenChange(false);
                    resetForm();
                } else {
                    const error = await response.json();
                    alert(error.message || 'Erro ao criar link');
                }
            } else {
                const response = await fetch(`/api/affiliates/links/${initialData?.linkId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customName: customName.trim() }),
                });

                if (response.ok) {
                    onSuccess();
                    onOpenChange(false);
                } else {
                    alert('Erro ao atualizar link');
                }
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar requisição');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedProductId('');
        setCustomName('');
        setSearchTerm('');
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-137.5">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create' ? 'Criar Novo Link de Divulgação' : 'Editar Nome do Link'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Crie um link geral para divulgar a loja. Identifique de onde vem cada tráfego.'
                            : 'Altere o nome personalizado do link'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {mode === 'create' ? (
                        <>
                            {/* Nome do Link */}
                            <div className="space-y-3">
                                <Label htmlFor="customName" className="text-base font-semibold">
                                    Nome do Link
                                </Label>
                                <Input
                                    id="customName"
                                    placeholder="Ex: Instagram, Facebook, WhatsApp, Email Marketing..."
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="text-base"
                                />
                                <p className="text-sm text-gray-600">
                                    Use um nome que identifique de onde vem o tráfego. O link será único para rastreamento.
                                </p>
                            </div>

                            {/* Preview do Link */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-2">💡 Link Geral</p>
                                <p className="text-xs text-blue-800">
                                    Este link pode ser usado para promover qualquer produto da loja.
                                    Todas as compras feitas por quem clicar nele serão creditadas a você.
                                </p>
                            </div>
                        </>
                    ) : (
                        /* Modo Edição */
                        <div className="space-y-2">
                            <Label htmlFor="editCustomName">Nome do Link</Label>
                            <Input
                                id="editCustomName"
                                placeholder="Nome personalizado"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            resetForm();
                        }}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || (mode === 'create' && !customName.trim())}
                        className="bg-[#FED466] hover:bg-[#FD9555] text-gray-900"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : mode === 'create' ? (
                            'Criar Link'
                        ) : (
                            'Salvar Alterações'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
