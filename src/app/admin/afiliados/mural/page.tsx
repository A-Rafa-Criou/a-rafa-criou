'use client';

import { useState, useEffect } from 'react';
import {
    Megaphone,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Eye,
    EyeOff,
    Clock,
    Loader2,
    MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface BulletinMessage {
    id: string;
    message: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function MuralPage() {
    const { showToast } = useToast();
    const [messages, setMessages] = useState<BulletinMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Nova mensagem
    const [newMessage, setNewMessage] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);

    // Edição
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState('');

    // Deletar
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadMessages();
    }, []);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/affiliates/bulletin');
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Erro ao carregar mural:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newMessage.trim()) return;

        try {
            setSaving(true);
            const response = await fetch('/api/admin/affiliates/bulletin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage.trim() }),
            });

            if (response.ok) {
                showToast('Mensagem publicada no mural!', 'success');
                setNewMessage('');
                setShowNewForm(false);
                loadMessages();
            } else {
                const data = await response.json();
                showToast(data.error || 'Erro ao publicar mensagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar mensagem:', error);
            showToast('Erro ao publicar mensagem', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingMessage.trim()) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/admin/affiliates/bulletin/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: editingMessage.trim() }),
            });

            if (response.ok) {
                showToast('Mensagem atualizada!', 'success');
                setEditingId(null);
                setEditingMessage('');
                loadMessages();
            } else {
                showToast('Erro ao atualizar mensagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            showToast('Erro ao atualizar mensagem', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/affiliates/bulletin/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive }),
            });

            if (response.ok) {
                showToast(
                    !currentActive ? 'Mensagem ativada!' : 'Mensagem desativada!',
                    'success'
                );
                loadMessages();
            }
        } catch (error) {
            console.error('Erro ao alternar status:', error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setDeleting(true);
            const response = await fetch(`/api/admin/affiliates/bulletin/${deleteId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                showToast('Mensagem removida do mural', 'success');
                setDeleteId(null);
                loadMessages();
            } else {
                showToast('Erro ao remover mensagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            showToast('Erro ao remover mensagem', 'error');
        } finally {
            setDeleting(false);
        }
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
                        <Megaphone className="w-5 h-5 text-[#FD9555]" />
                        Mural de Notícias
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Publique avisos e novidades para os afiliados comuns
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setShowNewForm(true);
                        setNewMessage('');
                    }}
                    className="bg-[#FD9555] hover:bg-[#e8864d] text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Mensagem
                </Button>
            </div>

            {/* Formulário de nova mensagem */}
            {showNewForm && (
                <Card className="border-2 border-[#FED466] shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[#FD9555]" />
                            Nova Mensagem para o Mural
                        </CardTitle>
                        <CardDescription>
                            Esta mensagem será exibida no dashboard de todos os afiliados comuns
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem aqui... Ex: Novidade! Comissão aumentada para 25% este mês!"
                            className="min-h-[120px] resize-y text-sm"
                            maxLength={2000}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {newMessage.length}/2000 caracteres
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowNewForm(false)}
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={!newMessage.trim() || saving}
                                    className="bg-[#FD9555] hover:bg-[#e8864d] text-white"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                        <Megaphone className="w-4 h-4 mr-1" />
                                    )}
                                    Publicar no Mural
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista de mensagens */}
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FD9555]" />
                    <p className="text-sm text-gray-500 mt-2">Carregando mensagens...</p>
                </div>
            ) : messages.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">Mural Vazio</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Nenhuma mensagem publicada ainda. Clique em &quot;Nova Mensagem&quot; para criar a primeira.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <Card
                            key={msg.id}
                            className={`transition-all ${msg.isActive
                                    ? 'border-l-4 border-l-[#FD9555] hover:shadow-md'
                                    : 'border-l-4 border-l-gray-300 opacity-60'
                                }`}
                        >
                            <CardContent className="py-4 px-5">
                                {editingId === msg.id ? (
                                    /* Modo edição */
                                    <div className="space-y-3">
                                        <Textarea
                                            value={editingMessage}
                                            onChange={(e) => setEditingMessage(e.target.value)}
                                            className="min-h-[100px] resize-y text-sm"
                                            maxLength={2000}
                                        />
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">
                                                {editingMessage.length}/2000
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditingMessage('');
                                                    }}
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleUpdate(msg.id)}
                                                    disabled={!editingMessage.trim() || saving}
                                                    className="bg-[#FD9555] hover:bg-[#e8864d] text-white"
                                                >
                                                    {saving ? (
                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-1" />
                                                    )}
                                                    Salvar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo visualização */
                                    <div>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                    {msg.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(msg.createdAt)}
                                                    </span>
                                                    <Badge
                                                        variant={msg.isActive ? 'default' : 'secondary'}
                                                        className={`text-xs ${msg.isActive
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : 'bg-gray-100 text-gray-500'
                                                            }`}
                                                    >
                                                        {msg.isActive ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleActive(msg.id, msg.isActive)}
                                                    title={msg.isActive ? 'Desativar' : 'Ativar'}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {msg.isActive ? (
                                                        <EyeOff className="w-4 h-4 text-gray-500" />
                                                    ) : (
                                                        <Eye className="w-4 h-4 text-green-600" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingId(msg.id);
                                                        setEditingMessage(msg.message);
                                                    }}
                                                    title="Editar"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteId(msg.id)}
                                                    title="Excluir"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de confirmação de exclusão */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Mensagem</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir esta mensagem do mural? Esta ação não pode ser desfeita.
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
