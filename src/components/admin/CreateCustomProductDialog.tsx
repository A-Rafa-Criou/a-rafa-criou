'use client'

import { useState } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'

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
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            // Validar que é PDF ou ZIP
            const validTypes = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];
            const validExtensions = ['.pdf', '.zip'];
            const hasValidType = validTypes.includes(selectedFile.type);
            const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

            if (!hasValidType && !hasValidExtension) {
                alert('Por favor, selecione apenas arquivos PDF ou ZIP')
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
            alert('Preencha todos os campos obrigatórios e selecione um arquivo')
            return
        }

        const priceNum = parseFloat(price)
        if (isNaN(priceNum) || priceNum <= 0) {
            alert('Preço inválido')
            return
        }

        try {
            setUploading(true)
            setUploadProgress(0)
            setUploadStatus('Preparando upload...')

            // ETAPA 1: Obter URL presigned para upload direto ao R2
            setUploadStatus('Gerando URL de upload...')
            setUploadProgress(10)

            const presignResponse = await fetch('/api/admin/products/custom/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type || 'application/pdf',
                    fileSize: file.size,
                }),
            })

            if (!presignResponse.ok) {
                const errorData = await presignResponse.text()
                throw new Error(`Erro ao gerar URL: ${errorData}`)
            }

            const { uploadUrl, r2Key } = await presignResponse.json()
            setUploadProgress(20)

            // ETAPA 2: Upload direto para R2 (bypassa limite do Vercel)
            setUploadStatus('Enviando arquivo...')
            
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/pdf',
                    'Content-Length': file.size.toString(),
                },
                body: file,
            })

            if (!uploadResponse.ok) {
                throw new Error(`Erro no upload: ${uploadResponse.status} ${uploadResponse.statusText}`)
            }

            setUploadProgress(70)
            setUploadStatus('Finalizando produto...')

            // ETAPA 3: Finalizar criação do produto
            const finalizeResponse = await fetch('/api/admin/products/custom/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    price,
                    description: description.trim(),
                    orderId,
                    userEmail,
                    r2Key,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type || 'application/pdf',
                }),
            })

            if (!finalizeResponse.ok) {
                const errorData = await finalizeResponse.text()
                let errorMessage = 'Erro desconhecido'
                try {
                    const error = JSON.parse(errorData)
                    errorMessage = error.message || JSON.stringify(error)
                } catch {
                    errorMessage = errorData || `Erro HTTP ${finalizeResponse.status}`
                }
                throw new Error(errorMessage)
            }

            setUploadProgress(100)
            setUploadStatus('Produto criado com sucesso!')

            // Aguardar um pouco para mostrar sucesso
            await new Promise(resolve => setTimeout(resolve, 500))

            onSuccess()
            onOpenChange(false)
            
            // Reset form
            setName('')
            setPrice('')
            setDescription('')
            setFile(null)
            setUploadProgress(0)
            setUploadStatus('')
        } catch (error) {
            console.error('Erro ao criar produto:', error)
            alert(`Erro ao criar produto personalizado: ${error instanceof Error ? error.message : String(error)}`)
            setUploadProgress(0)
            setUploadStatus('')
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
                                    accept=".pdf,.zip,application/pdf,application/zip"
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

                    {/* Barra de Progresso */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-[#FD9555]" />
                                <span className="text-sm text-gray-600">{uploadStatus}</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
                        </div>
                    )}
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
