'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
import type { FinancialCategory } from '@/types/financial';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<FinancialCategory>) => Promise<void>;
    category?: FinancialCategory;
}

export function CategoryDialog({
    open,
    onOpenChange,
    onSubmit,
    category,
}: CategoryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<FinancialCategory>>({
        name: '',
        type: 'EXPENSE',
        scope: 'BOTH',
        active: true,
        displayOrder: 0,
    });

    useEffect(() => {
        if (category) {
            setFormData(category);
        } else {
            setFormData({
                name: '',
                type: 'EXPENSE',
                scope: 'BOTH',
                active: true,
                displayOrder: 0,
            });
        }
    }, [category, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            {category ? 'Editar Categoria' : 'Nova Categoria'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                            {category
                                ? 'Atualize as informações da categoria financeira'
                                : 'Crie uma nova categoria para organizar suas transações'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        {/* Nome */}
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-gray-700 font-semibold">
                                Nome da Categoria
                            </Label>
                            <Input
                                id="name"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: Alimentação, Transporte, Marketing..."
                                className="border-gray-300 text-gray-900"
                            />
                        </div>

                        {/* Tipo */}
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-gray-700 font-semibold">
                                Tipo de Transação
                            </Label>
                            <Select
                                value={formData.type || 'EXPENSE'}
                                onValueChange={value => setFormData({ ...formData, type: value as any })}
                            >
                                <SelectTrigger className="border-gray-300 text-gray-900 cursor-pointer">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="EXPENSE" className="text-gray-900 cursor-pointer">
                                        💸 Despesa (saídas de dinheiro)
                                    </SelectItem>
                                    <SelectItem value="INCOME" className="text-gray-900 cursor-pointer">
                                        💰 Receita (entradas de dinheiro)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Define se a categoria é para receitas ou despesas</p>
                        </div>

                        {/* Escopo */}
                        <div className="grid gap-2">
                            <Label htmlFor="scope" className="text-gray-700 font-semibold">
                                Escopo de Uso
                            </Label>
                            <Select
                                value={formData.scope || 'BOTH'}
                                onValueChange={value => setFormData({ ...formData, scope: value as any })}
                            >
                                <SelectTrigger className="border-gray-300 text-gray-900 cursor-pointer">
                                    <SelectValue placeholder="Selecione o escopo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="STORE" className="text-gray-900 cursor-pointer">
                                        🏪 Loja (apenas transações da loja)
                                    </SelectItem>
                                    <SelectItem value="PERSONAL" className="text-gray-900 cursor-pointer">
                                        👤 Pessoal (apenas transações pessoais)
                                    </SelectItem>
                                    <SelectItem value="BOTH" className="text-gray-900 cursor-pointer">
                                        🔄 Ambos (disponível em loja e pessoal)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Define onde a categoria pode ser usada</p>
                        </div>

                        {/* Cor (opcional) */}
                        <div className="grid gap-2">
                            <Label htmlFor="color" className="text-gray-700 font-semibold">
                                Cor da Categoria
                            </Label>
                            <div className="flex gap-3 items-center">
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color || '#FD9555'}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="h-12 w-20 border-gray-300 cursor-pointer"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                                        style={{ backgroundColor: formData.color || '#FD9555' }}
                                        suppressHydrationWarning
                                    />
                                    <span className="text-sm text-gray-600 font-medium">
                                        {formData.color || '#FD9555'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Esta cor será usada para identificar a categoria visualmente</p>
                        </div>

                        {/* Ordem de exibição */}
                        <div className="grid gap-2">
                            <Label htmlFor="displayOrder" className="text-gray-700 font-semibold">
                                Ordem de Exibição
                            </Label>
                            <Input
                                id="displayOrder"
                                type="number"
                                value={formData.displayOrder || 0}
                                onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                                className="border-gray-300 text-gray-900"
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500">Quanto menor o número, mais acima a categoria aparecerá nas listas</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="border-gray-300 text-gray-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold"
                        >
                            {loading ? 'Salvando...' : category ? 'Atualizar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
