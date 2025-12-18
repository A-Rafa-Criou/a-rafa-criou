'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    TrendingUp,
    Users,
    DollarSign,
    Link as LinkIcon,
    Download,
    Copy,
    Check,
    Eye,
    Mail,
    Phone
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AffiliateData {
    id: string;
    code: string;
    name: string;
    email: string;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: string;
    totalCommission: string;
    pendingCommission: string;
    paidCommission: string;
    commissionValue: string;
    contractDocumentUrl?: string | null;
}

interface Sale {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    orderTotal: string;
    commissionAmount: string;
    status: string;
    createdAt: string;
}

interface Material {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileName: string;
    fileType: string | null;
}

export default function CommonAffiliateDashboard({ affiliate }: { affiliate: AffiliateData }) {
    const [sales, setSales] = useState<Sale[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const affiliateLink = `${window.location.origin}?ref=${affiliate.code}`;

    useEffect(() => {
        fetchSales();
        fetchMaterials();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await fetch('/api/affiliates/sales');
            const data = await response.json();
            if (response.ok) {
                setSales(data.sales || []);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await fetch('/api/affiliates/materials');
            const data = await response.json();
            if (response.ok) {
                setMaterials(data.materials || []);
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(affiliateLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard de Afiliado</h1>
                        <p className="text-muted-foreground">Bem-vindo, {affiliate.name}!</p>
                    </div>
                    <Badge className="bg-green-600">Afiliado Comum</Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.totalClicks}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Pendente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(parseFloat(affiliate.pendingCommission))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Paga</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(parseFloat(affiliate.paidCommission))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Link de Afiliado */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Seu Link de Afiliado
                    </CardTitle>
                    <CardDescription>Compartilhe este link para ganhar comissões</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={affiliateLink}
                            readOnly
                            aria-label="Link de afiliado"
                            placeholder="Seu link de afiliado"
                            className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                        />
                        <Button onClick={copyLink} variant="outline">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="sales" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="sales">Minhas Vendas</TabsTrigger>
                    <TabsTrigger value="materials">Materiais</TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Vendas</CardTitle>
                            <CardDescription>Clientes que compraram através do seu link</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sales.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    Nenhuma venda ainda. Comece a divulgar seu link!
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {sales.map(sale => (
                                        <div
                                            key={sale.id}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{sale.customerName}</h3>
                                                    <Badge variant="outline">#{sale.orderNumber}</Badge>
                                                </div>
                                                <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {sale.customerEmail}
                                                    </span>
                                                    {sale.customerPhone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {sale.customerPhone}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Valor da Venda</p>
                                                <p className="font-semibold">{formatCurrency(parseFloat(sale.orderTotal))}</p>
                                                <p className="text-sm text-green-600">
                                                    +{formatCurrency(parseFloat(sale.commissionAmount))}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Materiais de Divulgação</CardTitle>
                            <CardDescription>
                                Baixe materiais para divulgar seus links nas redes sociais
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {materials.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    Nenhum material disponível no momento
                                </p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {materials.map(material => (
                                        <div key={material.id} className="flex items-start gap-4 rounded-lg border p-4">
                                            <Download className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{material.title}</h3>
                                                {material.description && (
                                                    <p className="mt-1 text-sm text-muted-foreground">{material.description}</p>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="mt-3"
                                                    asChild
                                                >
                                                    <a href={material.fileUrl} download target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Baixar {material.fileType?.toUpperCase()}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
