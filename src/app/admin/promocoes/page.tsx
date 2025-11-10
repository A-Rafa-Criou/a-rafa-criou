'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import PromotionForm from '@/components/admin/PromotionForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Promotion {
    id: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    appliesTo: 'all' | 'specific';
    productIds?: string[];
    variationIds?: string[];
}

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
        null
    );

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/promotions');
            if (res.ok) {
                const data = await res.json();
                setPromotions(data);
            }
        } catch (error) {
            console.error('Erro ao carregar promoções:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data: unknown) => {
        try {
            const url = editingPromotion
                ? `/api/admin/promotions/${editingPromotion.id}`
                : '/api/admin/promotions';

            const method = editingPromotion ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setEditingPromotion(null);
                loadPromotions();
            } else {
                alert('Erro ao salvar promoção');
            }
        } catch (error) {
            console.error('Erro ao salvar promoção:', error);
            alert('Erro ao salvar promoção');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta promoção?')) return;

        try {
            const res = await fetch(`/api/admin/promotions/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                loadPromotions();
            } else {
                alert('Erro ao excluir promoção');
            }
        } catch (error) {
            console.error('Erro ao excluir promoção:', error);
            alert('Erro ao excluir promoção');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-xl shadow-sm">
                        <Tag className="w-7 h-7 text-gray-800" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Promoções</h1>
                        <p className="text-gray-600 mt-1">
                            Gerencie promoções e descontos
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingPromotion(null);
                        setIsDialogOpen(true);
                    }}
                    className="bg-[#FED466] hover:bg-[#FD9555] text-gray-800 font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Promoção
                </Button>
            </div>

            {/* Lista de Promoções */}
            {loading ? (
                <div className="text-center py-12">Carregando...</div>
            ) : promotions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        Nenhuma promoção cadastrada
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {promotions.map((promo) => (
                        <Card key={promo.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate">{promo.name}</span>
                                    {promo.isActive ? (
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                            Ativa
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                            Inativa
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {promo.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {promo.description}
                                    </p>
                                )}
                                <div className="text-2xl font-bold text-[#FD9555]">
                                    {promo.discountType === 'percentage'
                                        ? `${promo.discountValue}%`
                                        : `R$ ${Number(promo.discountValue).toFixed(2)}`}
                                </div>
                                <div className="text-sm text-gray-500 space-y-1">
                                    <p>
                                        Início:{' '}
                                        {format(new Date(promo.startDate), 'dd/MM/yyyy HH:mm', {
                                            locale: ptBR,
                                        })}
                                    </p>
                                    <p>
                                        Fim:{' '}
                                        {format(new Date(promo.endDate), 'dd/MM/yyyy HH:mm', {
                                            locale: ptBR,
                                        })}
                                    </p>
                                    <p className="capitalize">
                                        {promo.appliesTo === 'all'
                                            ? 'Todos os produtos'
                                            : `${promo.productIds?.length || 0} produtos`}
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setEditingPromotion(promo);
                                            setIsDialogOpen(true);
                                        }}
                                        className="flex-1"
                                    >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(promo.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de Criação/Edição */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
                        </DialogTitle>
                    </DialogHeader>
                    <PromotionForm
                        promotion={
                            editingPromotion
                                ? {
                                    ...editingPromotion,
                                    discountValue: Number(editingPromotion.discountValue),
                                    startDate: new Date(editingPromotion.startDate),
                                    endDate: new Date(editingPromotion.endDate),
                                }
                                : undefined
                        }
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingPromotion(null);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
