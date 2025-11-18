'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { User2, X } from 'lucide-react'

interface UserSuggestion {
    id: string
    name: string
    email: string
}

interface CouponFormProps {
    coupon?: {
        id: string
        code: string
        type: string
        value: string
        minSubtotal?: string | null
        maxUses?: number | null
        maxUsesPerUser?: number
        allowedEmails?: string[] | null
        isActive: boolean
        stackable?: boolean
        startsAt?: string | null
        endsAt?: string | null
    }
    onSuccess: () => void
}

export default function CouponForm({ coupon, onSuccess }: CouponFormProps) {
    const [loading, setLoading] = useState(false)
    const [emailInput, setEmailInput] = useState('')
    const [allowedEmails, setAllowedEmails] = useState<string[]>(coupon?.allowedEmails || [])
    const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

    // Função para formatar data do banco (ISO) para datetime-local input
    const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Formato: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState({
        code: coupon?.code || '',
        type: coupon?.type || 'percent',
        value: coupon?.value || '',
        minSubtotal: coupon?.minSubtotal || '',
        maxUses: coupon?.maxUses?.toString() || '',
        maxUsesPerUser: coupon?.maxUsesPerUser?.toString() || '1',
        appliesTo: 'all',
        isActive: coupon?.isActive ?? true,
        stackable: coupon?.stackable ?? false,
        startsAt: formatDateForInput(coupon?.startsAt),
        endsAt: formatDateForInput(coupon?.endsAt),
    })

    // Buscar sugestões de usuários
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        if (emailInput.length < 2) {
            setUserSuggestions([])
            setShowSuggestions(false)
            return
        }

        debounceTimerRef.current = setTimeout(async () => {
            try {
                console.log('🔍 Buscando usuários com query:', emailInput)
                const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(emailInput)}`)
                if (response.ok) {
                    const data = await response.json()
                    console.log('✅ Usuários encontrados:', data)
                    setUserSuggestions(data)
                    setShowSuggestions(data.length > 0)
                } else {
                    console.error('❌ Erro na busca:', response.status, response.statusText)
                }
            } catch (error) {
                console.error('❌ Erro ao buscar usuários:', error)
            }
        }, 250)

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [emailInput])

    const handleAddEmail = (email: string) => {
        const trimmedEmail = email.trim()
        if (trimmedEmail && !allowedEmails.includes(trimmedEmail)) {
            setAllowedEmails([...allowedEmails, trimmedEmail])
        }
        setEmailInput('')
        setShowSuggestions(false)
    }

    const handleRemoveEmail = (email: string) => {
        setAllowedEmails(allowedEmails.filter(e => e !== email))
    }

    const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (userSuggestions.length > 0) {
                handleAddEmail(userSuggestions[0].email)
            } else if (emailInput.includes('@')) {
                handleAddEmail(emailInput)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = coupon ? `/api/admin/coupons/${coupon.id}` : '/api/admin/coupons'
            const method = coupon ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: formData.code,
                    type: formData.type,
                    value: parseFloat(formData.value),
                    minSubtotal: formData.minSubtotal ? parseFloat(formData.minSubtotal) : null,
                    maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                    maxUsesPerUser: parseInt(formData.maxUsesPerUser),
                    appliesTo: formData.appliesTo,
                    allowedEmails: allowedEmails.length > 0 ? allowedEmails : null,
                    isActive: formData.isActive,
                    stackable: formData.stackable,
                    startsAt: formData.startsAt || null,
                    endsAt: formData.endsAt || null,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao salvar cupom')
            }

            onSuccess()
        } catch (error) {
            console.error('Erro:', error)
            alert(error instanceof Error ? error.message : 'Erro ao salvar cupom')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção: Informações Básicas */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                    Informações Básicas
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="code">Código do Cupom *</Label>
                        <Input
                            id="code"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="EX: DESCONTO10"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Desconto *</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percent">Percentual (%)</SelectItem>
                                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="value">Valor do Desconto *</Label>
                        <Input
                            id="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            placeholder={formData.type === 'percent' ? '10' : '50.00'}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="minSubtotal">Valor Mínimo da Compra (R$)</Label>
                        <Input
                            id="minSubtotal"
                            type="number"
                            step="0.01"
                            value={formData.minSubtotal}
                            onChange={(e) => setFormData({ ...formData, minSubtotal: e.target.value })}
                            placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Valor mínimo do carrinho para usar o cupom</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxUses">Usos Máximos Totais</Label>
                        <Input
                            id="maxUses"
                            type="number"
                            min="1"
                            value={formData.maxUses}
                            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                            placeholder="Ilimitado"
                        />
                        <p className="text-xs text-gray-500">Quantas vezes o cupom pode ser usado (total)</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxUsesPerUser">Usos por Usuário *</Label>
                        <Input
                            id="maxUsesPerUser"
                            type="number"
                            min="1"
                            value={formData.maxUsesPerUser}
                            onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                            required
                        />
                        <p className="text-xs text-gray-500">Quantas vezes cada usuário pode usar</p>
                    </div>
                </div>

                {/* Restrição de Email */}
                <div className="space-y-2">
                    <Label htmlFor="emailRestriction">Restringir a E-mails Específicos (Opcional)</Label>
                    <div className="relative">
                        <Input
                            id="emailRestriction"
                            type="text"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={handleEmailKeyDown}
                            onFocus={() => userSuggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="Digite nome ou email do usuário..."
                        />

                        {/* Dropdown de sugestões */}
                        {showSuggestions && userSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                {userSuggestions.map((user) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                        onClick={() => handleAddEmail(user.email)}
                                    >
                                        <User2 className="w-4 h-4 text-gray-400" />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lista de emails adicionados */}
                    {allowedEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {allowedEmails.map((email) => (
                                <Badge
                                    key={email}
                                    variant="secondary"
                                    className="flex items-center gap-1 pl-3 pr-2 py-1"
                                >
                                    {email}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveEmail(email)}
                                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                                        aria-label="Remover email"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-500">
                        Deixe vazio para permitir todos os usuários. Se preenchido, apenas os emails listados poderão usar o cupom.
                    </p>
                </div>
            </div>

            {/* Seção: Datas */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                    Período de Validade
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="startsAt">Data de Início (Opcional)</Label>
                        <Input
                            id="startsAt"
                            type="datetime-local"
                            value={formData.startsAt}
                            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Deixe vazio para ativar imediatamente</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="endsAt">Data de Término (Opcional)</Label>
                        <Input
                            id="endsAt"
                            type="datetime-local"
                            value={formData.endsAt}
                            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Deixe vazio para não expirar</p>
                    </div>
                </div>
            </div>

            {/* Seção: Configurações */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                    Configurações
                </h3>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        />
                        <Label htmlFor="isActive">Cupom Ativo</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="stackable"
                            checked={formData.stackable}
                            onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
                        />
                        <Label htmlFor="stackable">Acumulável</Label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="submit" disabled={loading} className="bg-[#FED466] hover:bg-[#FD9555] text-gray-800">
                    {loading ? 'Salvando...' : coupon ? 'Atualizar Cupom' : 'Criar Cupom'}
                </Button>
            </div>
        </form>
    )
}
