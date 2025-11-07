'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DownloadFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface DownloadPermission {
  id: string;
  productId: string;
  orderId: string;
  downloadsRemaining: number | null;
  downloadLimit: number | null;
  downloadCount: number;
  accessGrantedAt: string;
  accessExpiresAt: string | null;
  watermarkEnabled: boolean;
  productName: string;
  productSlug: string;
  variationName: string | null;
  orderStatus: string;
  orderTotal: string;
  orderCurrency: string;
  orderCreatedAt: string;
  files: DownloadFile[];
  hasActiveAccess: boolean;
  hasDownloadsRemaining: boolean;
}

interface DownloadsResponse {
  downloads: DownloadPermission[];
  total: number;
}

export default function DownloadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [downloads, setDownloads] = useState<DownloadPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/conta/downloads');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDownloads();
    }
  }, [status]);

  async function fetchDownloads() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/account/downloads');

      if (!response.ok) {
        throw new Error('Erro ao carregar downloads');
      }

      const data: DownloadsResponse = await response.json();
      setDownloads(data.downloads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload(fileId: string, fileName: string) {
    try {
      const response = await fetch('/api/download/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar link de download');
      }

      const data = await response.json();

      // Criar link temporário e fazer download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Recarregar lista para atualizar contadores
      fetchDownloads();
    } catch (err) {
      console.error('Erro ao fazer download:', err);
      alert('Erro ao fazer download. Tente novamente.');
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatCurrency(value: string, currency: string): string {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(num);
  }

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64 mb-2 mx-auto" />
              <Skeleton className="h-4 w-96 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] py-8">
      <div className="container max-w-6xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-[#FED466] to-[#FD9555] rounded-full">
                <Download className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Meus Downloads</CardTitle>
            <CardDescription className="text-base">
              Acesse todos os seus produtos digitais em um só lugar
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isLoading && downloads.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Download className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum download disponível
                </h3>
                <p className="text-gray-600 mb-6">
                  Você ainda não possui produtos com download liberado.
                </p>
                <Button onClick={() => router.push('/produtos')}>
                  Explorar Produtos
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {downloads.map((permission) => (
          <Card key={permission.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {permission.productName}
                    {permission.variationName && (
                      <span className="text-muted-foreground font-normal">
                        - {permission.variationName}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Comprado{' '}
                    {formatDistanceToNow(new Date(permission.orderCreatedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                    {' • '}
                    {formatCurrency(permission.orderTotal, permission.orderCurrency)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {permission.hasActiveAccess && permission.hasDownloadsRemaining ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Acesso Expirado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Info do Download */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {permission.downloadLimit !== null && (
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {permission.downloadCount} de {permission.downloadLimit} downloads
                  </div>
                )}
                {permission.accessExpiresAt && (
                  <div>
                    Expira em{' '}
                    {formatDistanceToNow(new Date(permission.accessExpiresAt), {
                      locale: ptBR,
                    })}
                  </div>
                )}
                {permission.downloadLimit === null && !permission.accessExpiresAt && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Download ilimitado
                  </div>
                )}
              </div>

              {/* Arquivos Disponíveis */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Arquivos disponíveis:</h4>
                <div className="space-y-2">
                  {permission.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.mimeType} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(file.id, file.originalName)}
                        disabled={!permission.hasActiveAccess || !permission.hasDownloadsRemaining}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
