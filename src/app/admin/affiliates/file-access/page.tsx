'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Eye, Printer, User, FileText, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface FileAccessStats {
    totalAccesses: number;
    activeAccesses: number;
    expiredAccesses: number;
    totalViews: number;
    totalPrints: number;
}

interface AffiliateData {
    affiliateId: string;
    affiliateName: string;
    affiliateEmail: string;
    totalAccesses: number;
    totalViews: number;
    totalPrints: number;
    accesses: any[];
}

export default function AdminFileAccessPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<FileAccessStats | null>(null);
    const [affiliates, setAffiliates] = useState<AffiliateData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const response = await fetch('/api/admin/affiliates/file-access');
            if (!response.ok) throw new Error('Erro ao carregar dados');

            const data = await response.json();
            setStats(data.stats);
            setAffiliates(data.affiliates);
        } catch (error) {
            console.error('Erro:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filtrar afiliados pela busca
    const filteredAffiliates = affiliates.filter(affiliate =>
        affiliate.affiliateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        affiliate.affiliateEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Monitoramento de Acessos - Licença Comercial</h1>
                <p className="text-gray-600">
                    Controle quantas vezes cada afiliado visualizou e imprimiu os arquivos
                </p>
            </div>

            {/* Estatísticas Gerais */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Total de Acessos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAccesses}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-green-600">Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.activeAccesses}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">Expirados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-500">{stats.expiredAccesses}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-blue-600">Total Views</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                <Eye className="inline w-5 h-5 mr-1" />
                                {stats.totalViews}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-purple-600">Total Prints</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                <Printer className="inline w-5 h-5 mr-1" />
                                {stats.totalPrints}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lista de Afiliados com Accordion */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Afiliados ({filteredAffiliates.length})</h2>
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Accordion type="single" collapsible className="w-full">
                            {filteredAffiliates.map((affiliate) => (
                                <AccordionItem key={affiliate.affiliateId} value={affiliate.affiliateId}>
                                    <AccordionTrigger className="px-6 hover:bg-gray-50">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <User className="w-5 h-5 text-purple-600" />
                                                <div className="text-left">
                                                    <div className="font-semibold">{affiliate.affiliateName}</div>
                                                    <div className="text-sm text-gray-500">{affiliate.affiliateEmail}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-blue-600" />
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-blue-600">{affiliate.totalViews}</div>
                                                        <div className="text-xs text-gray-500">views</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Printer className="w-4 h-4 text-purple-600" />
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-purple-600">{affiliate.totalPrints}</div>
                                                        <div className="text-xs text-gray-500">prints</div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="ml-2">
                                                    {affiliate.totalAccesses} acessos
                                                </Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-4">
                                        <div className="space-y-2 mt-2">
                                            <h4 className="font-semibold text-sm text-gray-700 mb-3">
                                                Detalhes dos Acessos:
                                            </h4>
                                            {affiliate.accesses.map((access: any) => (
                                                <div
                                                    key={access.accessId}
                                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText className="w-4 h-4 text-gray-600" />
                                                            <span className="font-medium">{access.productName}</span>
                                                            {access.expired ? (
                                                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                                    Expirado
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Ativo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            <strong>Comprador:</strong> {access.buyerName || 'N/A'} ({access.buyerEmail})
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                                                            <div>📅 Concedido: {new Date(access.grantedAt).toLocaleString('pt-BR')}</div>
                                                            <div>⏰ Expira: {new Date(access.expiresAt).toLocaleString('pt-BR')}</div>
                                                            {access.lastAccessedAt && (
                                                                <div>🕐 Último acesso: {new Date(access.lastAccessedAt).toLocaleString('pt-BR')}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-6 ml-6 items-center">
                                                        <div className="text-center">
                                                            <Eye className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                                            <div className="text-2xl font-bold text-blue-600">{access.viewCount}</div>
                                                            <div className="text-xs text-gray-500">views</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <Printer className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                                                            <div className="text-2xl font-bold text-purple-600">{access.printCount}</div>
                                                            <div className="text-xs text-gray-500">prints</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                {filteredAffiliates.length === 0 && !loading && (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-600">
                            {searchTerm ? `Nenhum afiliado encontrado com "${searchTerm}"` : 'Nenhum acesso de arquivo registrado ainda'}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
