'use client'

import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CreateCustomProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: string
    userEmail: string
    onSuccess: () => void
}

export default function CreateCustomProductDialog({
    open,
    onOpenChange,
    orderId,
    userEmail,
    onSuccess
}: CreateCustomProductDialogProps) {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [description, setDescription] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            // Validar que é PDF
            if (selectedFile.type !== 'application/pdf') {
                alert('Por favor, selecione apenas arquivos PDF')
                return
            }
            // Validar tamanho (max 50MB)
            if (selectedFile.size > 50 * 1024 * 1024) {
                alert('O arquivo deve ter no máximo 50MB')
                return
            }
            setFile(selectedFile)
        }
    }

    const handleCreate = async () => {
        if (!name.trim() || !price || !file) {
            alert('Preencha todos os campos obrigatórios e selecione um PDF')
            return
        }

        const priceNum = parseFloat(price)
        if (isNaN(priceNum) || priceNum <= 0) {
            alert('Preço inválido')
            return
        }

        try {
            setUploading(true)

            // Criar FormData para upload
            const formData = new FormData()
            formData.append('name', name.trim())
            formData.append('price', price)
            formData.append('description', description.trim())
            formData.append('orderId', orderId)
            formData.append('userEmail', userEmail)
            formData.append('pdf', file)

            console.log('🚀 Enviando para /api/admin/products/custom:', {
                name: name.trim(),
                price,
                orderId,
                userEmail,
                pdfName: file.name
            })

            const response = await fetch('/api/admin/products/custom', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                onSuccess()
                onOpenChange(false)
                // Reset form
                setName('')
                setPrice('')
                setDescription('')
                setFile(null)
            } else {
                const error = await response.json()
                console.error('Erro da API:', error)
                alert(`Erro ao salvar produto: ${error.message || JSON.stringify(error)}`)
            }
        } catch (error) {
            console.error('Erro ao criar produto:', error)
            alert(`Erro ao criar produto personalizado: ${error}`)
        } finally {
            setUploading(false)
        }
    }

    const removeFile = () => {
        setFile(null)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Criar Produto Personalizado</DialogTitle>
                    <DialogDescription>
                        Este produto será criado apenas para este pedido e não aparecerá no catálogo público
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 overflow-y-auto flex-1">{/* Scroll aqui */}
                    {/* Nome do Produto */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Produto *</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Arte Personalizada - João Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* Preço */}
                    <div className="space-y-2">
                        <Label htmlFor="price">Preço (R$) *</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição (opcional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Adicione observações sobre este produto..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={1000}
                        />
                        <p className="text-xs text-gray-500">{description.length}/1000</p>
                    </div>

                    {/* Upload do PDF */}
                    <div className="space-y-2">
                        <Label htmlFor="pdf">Arquivo PDF *</Label>
                        {!file ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#FD9555] transition-colors cursor-pointer">
                                <input
                                    id="pdf"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="pdf" className="cursor-pointer">
                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600">
                                        Clique para selecionar o PDF
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Máximo 50MB
                                    </p>
                                </label>
                            </div>
                        ) : (
                            <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-8 h-8 text-red-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={removeFile}
                                    disabled={uploading}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Informações */}
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-900">
                            <strong>Importante:</strong>
                        </p>
                        <ul className="text-xs text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                            <li>O produto será marcado como inativo (não aparece no catálogo)</li>
                            <li>Um item será adicionado automaticamente ao pedido</li>
                            <li>O total do pedido será recalculado</li>
                            <li>Um email será enviado ao cliente: <strong>{userEmail}</strong></li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim() || !price || !file || uploading}
                    >
                        {uploading ? 'Criando...' : 'Criar e Adicionar ao Pedido'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
