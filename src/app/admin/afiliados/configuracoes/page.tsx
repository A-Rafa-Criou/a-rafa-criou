'use client'

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AffiliateSettings {
    affiliateEnabled: boolean
    affiliateDefaultCommission: string
    affiliateMinPayout: string
    affiliateCookieDays: number
}

export default function AffiliateSettingsPage() {
    const { showToast } = useToast()
    const [settings, setSettings] = useState<AffiliateSettings>({
        affiliateEnabled: false,
        affiliateDefaultCommission: '20.00',
        affiliateMinPayout: '0.01',
        affiliateCookieDays: 30,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadSettings()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/settings')
            if (response.ok) {
                const data = await response.json()
                setSettings({
                    affiliateEnabled: data.affiliateEnabled ?? false,
                    affiliateDefaultCommission: data.affiliateDefaultCommission ?? '20.00',
                    affiliateMinPayout: data.affiliateMinPayout ?? '0.01',
                    affiliateCookieDays: data.affiliateCookieDays ?? 30,
                })
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error)
            showToast('Erro ao carregar configurações', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            // Load full settings first to not overwrite other fields
            const fullResponse = await fetch('/api/admin/settings')
            let fullSettings = {}
            if (fullResponse.ok) {
                fullSettings = await fullResponse.json()
            }

            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...fullSettings, ...settings }),
            })

            if (response.ok) {
                showToast('Configurações de afiliados salvas com sucesso!', 'success')
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao salvar configurações')
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar configurações'
            showToast(errorMessage, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="text-center py-12">Carregando configurações...</div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Programa de Afiliados</CardTitle>
                    <CardDescription>Configure comissões e regras gerais para o programa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Ativar/Desativar Programa */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-linear-to-r from-purple-50 to-pink-50">
                        <div>
                            <Label htmlFor="affiliateEnabled" className="text-base font-semibold">
                                Programa de Afiliados
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                                Permite que vendedores promovam seus produtos e ganhem comissões
                            </p>
                        </div>
                        <Switch
                            id="affiliateEnabled"
                            checked={settings.affiliateEnabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, affiliateEnabled: checked })}
                        />
                    </div>

                    {/* Configurações de Comissão */}
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-4">Comissões</h4>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="affiliateDefaultCommission">
                                    Comissão Padrão (%)
                                </Label>
                                <Input
                                    id="affiliateDefaultCommission"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={settings.affiliateDefaultCommission}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        affiliateDefaultCommission: e.target.value
                                    })}
                                />
                                <p className="text-sm text-gray-600 mt-1">
                                    Percentual padrão de comissão para novos afiliados
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="affiliateMinPayout">
                                    Valor Mínimo para Saque (R$)
                                </Label>
                                <Input
                                    id="affiliateMinPayout"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={settings.affiliateMinPayout}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        affiliateMinPayout: e.target.value
                                    })}
                                />
                                <p className="text-sm text-gray-600 mt-1">
                                    Valor mínimo acumulado para solicitar pagamento
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="affiliateCookieDays">
                                    Duração do Cookie (dias)
                                </Label>
                                <Input
                                    id="affiliateCookieDays"
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={settings.affiliateCookieDays}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        affiliateCookieDays: parseInt(e.target.value) || 30
                                    })}
                                />
                                <p className="text-sm text-gray-600 mt-1">
                                    Tempo que o link de afiliado permanece válido após o clique
                                </p>
                            </div>
                        </div>
                    </div>

                    <Alert className="bg-purple-50 border-purple-200">
                        <AlertDescription className="text-sm">
                            <strong>💡 Dica:</strong> O sistema detecta automaticamente fraudes como auto-referral,
                            múltiplos pedidos do mesmo IP e taxas de conversão suspeitas. Comissões suspeitas
                            ficam pendentes para revisão manual.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-linear-to-r from-[#FED466] to-[#FD9555] hover:opacity-90"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    )
}
