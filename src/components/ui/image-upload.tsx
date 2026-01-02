'use client';

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    disabled?: boolean;
}

// Constantes para compressão
const MAX_WIDTH = 300; // Largura máxima em pixels
const MAX_HEIGHT = 300; // Altura máxima em pixels
const QUALITY = 0.8; // Qualidade para compressão (0-1)
const MAX_SIZE_KB = 50; // Tamanho máximo final em KB

// Formato preferencial: WebP (30-50% menor que JPEG com mesma qualidade)

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    /**
     * Comprime e redimensiona a imagem antes de converter para base64
     * Isso evita HTTP 431 causado por imagens muito grandes no JWT
     * Preserva o formato original (webp permanece webp, jpg permanece jpg)
     */
    const compressImage = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Calcular novas dimensões mantendo aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                        width = width * ratio;
                        height = height * ratio;
                    }

                    // Criar canvas para redimensionar
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Falha ao criar contexto do canvas'));
                        return;
                    }

                    // Desenhar imagem redimensionada
                    ctx.drawImage(img, 0, 0, width, height);

                    // Determinar formato: usar webp se disponível, senão manter original
                    // WebP gera arquivos 30-50% menores que JPEG com mesma qualidade
                    let outputFormat = 'image/webp';
                    let outputQuality = QUALITY;

                    // Verificar se o navegador suporta webp
                    const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
                    
                    if (!supportsWebp) {
                        // Fallback para JPEG se webp não suportado
                        outputFormat = 'image/jpeg';
                    } else if (file.type === 'image/png' && file.type.includes('png')) {
                        // PNG com transparência deve manter PNG
                        outputFormat = 'image/png';
                        outputQuality = 0.9;
                    }

                    // Converter para base64 com compressão
                    const base64 = canvas.toDataURL(outputFormat, outputQuality);

                    // Verificar tamanho final
                    const sizeInKB = (base64.length * 3) / 4 / 1024; // Estimar tamanho

                    if (sizeInKB > MAX_SIZE_KB) {
                        // Se ainda muito grande, tentar comprimir mais
                        const newQuality = Math.max(0.5, outputQuality * (MAX_SIZE_KB / sizeInKB));
                        const compressedBase64 = canvas.toDataURL(outputFormat, newQuality);
                        resolve(compressedBase64);
                    } else {
                        resolve(base64);
                    }
                };

                img.onerror = () => {
                    reject(new Error('Erro ao carregar a imagem'));
                };

                img.src = e.target?.result as string;
            };

            reader.onerror = () => {
                reject(new Error('Erro ao ler o arquivo'));
            };

            reader.readAsDataURL(file);
        });
    }, []);

    const uploadImage = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 10MB');
            return;
        }

        setUploading(true);
        try {
            // Comprimir e converter para base64
            const compressedBase64 = await compressImage(file);

            // Verificar tamanho e formato final
            const finalSizeKB = ((compressedBase64.length * 3) / 4 / 1024).toFixed(2);
            const detectedFormat = compressedBase64.split(';')[0].split(':')[1] || 'unknown';
            const originalSizeKB = (file.size / 1024).toFixed(2);
            const reduction = ((1 - parseFloat(finalSizeKB) / parseFloat(originalSizeKB)) * 100).toFixed(1);
            
            console.log(
                `✅ Imagem otimizada: ${finalSizeKB}KB (original: ${originalSizeKB}KB, redução: ${reduction}%)\n` +
                `   Formato: ${file.type} → ${detectedFormat}`
            );

            onChange(compressedBase64);
            setUploading(false);
        } catch (error) {
            console.error('Erro no processamento:', error);
            alert(error instanceof Error ? error.message : 'Erro ao processar a imagem');
            setUploading(false);
        }
    }, [onChange, compressImage]);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            if (disabled || uploading) return;

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                await uploadImage(files[0]);
            }
        },
        [disabled, uploading, uploadImage]
    );

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled || uploading) return;

        const files = e.target.files;
        if (files && files.length > 0) {
            await uploadImage(files[0]);
        }
    };

    const handleRemove = async () => {
        if (!disabled) {
            // Confirmar ação
            if (!confirm('Deseja realmente remover sua foto de perfil?')) {
                return;
            }

            setUploading(true);
            try {
                // Atualizar no servidor
                const response = await fetch('/api/account/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: null }),
                });

                if (!response.ok) {
                    throw new Error('Erro ao remover imagem');
                }

                // Atualizar localmente
                onChange('');

                // Recarregar página para atualizar sessão
                window.location.reload();
            } catch (error) {
                console.error('Erro ao remover imagem:', error);
                alert('Erro ao remover imagem. Tente novamente.');
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {value ? (
                <div className="relative group">
                    <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#FED466] shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={value}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {!disabled && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-0 right-1/2 translate-x-[64px] -translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleRemove}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ) : (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-[#FD9555] bg-orange-50'
                        : 'border-gray-300 hover:border-[#FED466]'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={disabled || uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Upload de imagem de perfil"
                    />

                    <div className="flex flex-col items-center gap-3">
                        {uploading ? (
                            <>
                                <div className="w-16 h-16 border-4 border-[#FED466] border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-600">Fazendo upload...</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FED466] to-[#FD9555] flex items-center justify-center">
                                    {isDragging ? (
                                        <Upload className="w-8 h-8 text-white" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-white" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {isDragging ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        PNG, JPG ou WEBP (máx. 10MB)
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Será comprimida automaticamente para melhor performance
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
