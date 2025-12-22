"use client"

import { memo, useState } from 'react'
import { Users, Mail, Phone, Calendar, MoreVertical, UserCheck, UserX, Crown, AlertTriangle, User, KeyRound, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'

interface User {
    id: string
    name: string | null
    email: string
    phone: string | null
    role: 'admin' | 'user' | 'member'
    createdAt: string
    lastLogin?: string | null
}

interface Props {
    users: User[]
    actionLoading?: string | null
    onPromoteUser?: (email: string, action: 'promote' | 'demote') => void
}

function UsersCards({ users, onPromoteUser }: Props) {
    const [copiedLink, setCopiedLink] = useState<string | null>(null)
    const [sendingReset, setSendingReset] = useState<string | null>(null)
    const { showToast } = useToast()

    const getRoleBadge = (role: string) => {
        if (role === 'admin') {
            return (
                <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-3 h-3" />
                    Admin
                </Badge>
            )
        }

        if (role === 'member') {
            return (
                <Badge variant="default" className="flex items-center gap-1 whitespace-nowrap bg-blue-500">
                    <UserCheck className="w-3 h-3" />
                    Membro
                </Badge>
            )
        }

        return (
            <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
                <User className="w-3 h-3" />
                Usuário
            </Badge>
        )
    }

    const getRolePriority = (role: string) => {
        if (role === 'admin') return 1
        if (role === 'member') return 2
        return 3
    }

    // Ordenar usuários por hierarquia: admin > member > user
    const sortedUsers = [...users].sort((a, b) => {
        const priorityA = getRolePriority(a.role)
        const priorityB = getRolePriority(b.role)
        return priorityA - priorityB
    })

    const handleSendReset = async (userId: string, userEmail: string) => {
        try {
            setSendingReset(userId)

            const response = await fetch('/api/admin/users/send-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Falha ao enviar email')
            }

            showToast(`Email enviado para ${userEmail}`, 'success')
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Erro ao enviar email', 'error')
        } finally {
            setSendingReset(null)
        }
    }

    const handleCopyResetLink = async (userId: string, userEmail: string) => {
        try {
            setSendingReset(userId)

            // Usar rota que apenas gera o link (sem enviar email)
            const response = await fetch('/api/admin/users/generate-reset-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Falha ao gerar link')
            }

            // Copiar para clipboard
            await navigator.clipboard.writeText(result.resetUrl)

            setCopiedLink(userId)
            setTimeout(() => setCopiedLink(null), 2000)

            showToast('Link copiado! Válido por 24h', 'success')
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Erro ao gerar link', 'error')
        } finally {
            setSendingReset(null)
        }
    }

    if (!sortedUsers || sortedUsers.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros de busca ou adicionar um novo usuário</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sortedUsers.map((user) => (
                        <Card key={user.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-[#FED466] flex flex-col h-full">
                            <div className="p-4 flex flex-col h-full">
                                {/* Header com Avatar e Role */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-full flex items-center justify-center shadow-sm text-white font-bold text-lg">
                                            {(user.name || user.email).charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getRoleBadge(user.role)}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>

                                                {/* Ações de Reset de Senha */}
                                                <DropdownMenuItem
                                                    onClick={() => handleSendReset(user.id, user.email)}
                                                    disabled={sendingReset === user.id}
                                                >
                                                    <KeyRound className="w-4 h-4 mr-2" />
                                                    {sendingReset === user.id ? 'Enviando...' : 'Enviar Link de Reset'}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => handleCopyResetLink(user.id, user.email)}
                                                    disabled={sendingReset === user.id}
                                                >
                                                    {copiedLink === user.id ? (
                                                        <Check className="w-4 h-4 mr-2 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 mr-2" />
                                                    )}
                                                    {copiedLink === user.id ? 'Link Copiado!' : 'Copiar Link de Reset'}
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                {user.role !== 'admin' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                onSelect={(e) => e.preventDefault()}
                                                                className="text-green-600"
                                                            >
                                                                <UserCheck className="w-4 h-4 mr-2" />
                                                                Promover a Admin
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2">
                                                                    <Crown className="w-5 h-5 text-yellow-500" />
                                                                    Promover a Administrador
                                                                </AlertDialogTitle>
                                                                <div className="text-amber-600 flex items-center gap-1 mt-2">
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                    Esta ação dará acesso completo à área administrativa.
                                                                </div>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => onPromoteUser?.(user.email, 'promote')}
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                >
                                                                    <Crown className="w-4 h-4 mr-2" />
                                                                    Promover
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}

                                                {user.role === 'admin' && user.email !== 'admin@arafacriou.com.br' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                onSelect={(e) => e.preventDefault()}
                                                                className="text-red-600"
                                                            >
                                                                <UserX className="w-4 h-4 mr-2" />
                                                                Remover Admin
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2">
                                                                    <UserX className="w-5 h-5 text-red-500" />
                                                                    Remover Administrador
                                                                </AlertDialogTitle>
                                                                <div className="text-amber-600 flex items-center gap-1 mt-2">
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                    O usuário perderá acesso à área administrativa.
                                                                </div>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => onPromoteUser?.(user.email, 'demote')}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    <UserX className="w-4 h-4 mr-2" />
                                                                    Remover Admin
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Nome e Email */}
                                <div className="flex-1 min-h-0">
                                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                                        {user.name || 'Sem nome'}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                        <Mail className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                            <Phone className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{user.phone}</span>
                                        </div>
                                    )}

                                    {/* Informações de Data */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Calendar className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Memoizar para evitar re-renders desnecessários
export default memo(UsersCards)
