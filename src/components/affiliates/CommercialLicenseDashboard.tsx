'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DollarSign,
    ShoppingBag,
    FileText,
    Mail,
    MessageCircle,
    Download,
    Eye,
    Printer,
    Clock,
    ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AffiliateData {
    id: string;
    code: string;
    name: string;
    email: string;
    totalOrders: number;
    totalRevenue: string;
    contractDocumentUrl: string | null;
}

interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    orderTotal: string;
    status: string;
    items: Array<{ productName: string; quantity: number }>;
    createdAt: string;
}

interface FileAccess {
    id: string;
    productName: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string | null;
    grantedAt: string;
    expiresAt: string;
    viewCount: number;
    printCount: number;
    isActive: boolean;
    expired: boolean;
}

interface Material {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileName: string;
    fileType: string | null;
}

export default function CommercialLicenseDashboard({ affiliate }: { affiliate: AffiliateData }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [fileAccess, setFileAccess] = useState<FileAccess[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
        fetchFileAccess();
        fetchMaterials();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/affiliates/orders');
            const data = await response.json();
            if (response.ok) {
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFileAccess = async () => {
        try {
            const response = await fetch('/api/affiliates/file-access');
            const data = await response.json();
            if (response.ok) {
                setFileAccess(data.fileAccess || []);
            }
        } catch (error) {
            console.error('Error fetching file access:', error);
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

    const openFile = (accessId: string) => {
        window.open(`/api/affiliates/file-access/${accessId}`, '_blank');
    };

    const contactCustomer = (email: string, phone: string | null, type: 'email' | 'whatsapp') => {
        if (type === 'email') {
            window.location.href = `mailto:${email}`;
        } else if (type === 'whatsapp' && phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard - Licença Comercial</h1>
                        <p className="text-muted-foreground">Bem-vindo, {affiliate.name}!</p>
                    </div>
                    <Badge className="bg-primary">Licença Comercial</Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliate.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(parseFloat(affiliate.totalRevenue))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Arquivos Ativos</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {fileAccess.filter(f => f.isActive && !f.expired).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Contrato Assinado */}
            {affiliate.contractDocumentUrl && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Seu Contrato Assinado
                        </CardTitle>
                        <CardDescription>Contrato de licença comercial digitalmente assinado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <a href={affiliate.contractDocumentUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Contrato
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="orders" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="orders">Pedidos</TabsTrigger>
                    <TabsTrigger value="files">Acesso aos Arquivos</TabsTrigger>
                    <TabsTrigger value="materials">Materiais</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Pedidos</CardTitle>
                            <CardDescription>
                                Pedidos realizados através dos seus canais de venda
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    Nenhum pedido registrado ainda
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map(order => (
                                        <div key={order.id} className="rounded-lg border p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{order.customerName}</h3>
                                                        <Badge variant="outline">#{order.orderNumber}</Badge>
                                                    </div>
                                                    <div className="mt-2 text-sm">
                                                        <p className="text-muted-foreground">
                                                            {order.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                                                        </p>
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Valor Total</p>
                                                    <p className="text-lg font-semibold">{formatCurrency(parseFloat(order.orderTotal))}</p>
                                                    <div className="mt-2 flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => contactCustomer(order.customerEmail, order.customerPhone, 'email')}
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                        </Button>
                                                        {order.customerPhone && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => contactCustomer(order.customerEmail, order.customerPhone, 'whatsapp')}
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="files" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Acesso Temporário aos Arquivos</CardTitle>
                            <CardDescription>
                                Arquivos disponíveis por 5 dias após cada venda (visualização e impressão apenas)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {fileAccess.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    Nenhum acesso disponível no momento
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {fileAccess.map(access => (
                                        <div
                                            key={access.id}
                                            className={`rounded-lg border p-4 ${access.expired || !access.isActive ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{access.productName}</h3>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Cliente: {access.buyerName} ({access.buyerEmail})
                                                    </p>
                                                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="h-3 w-3" />
                                                            {access.viewCount} visualizações
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Printer className="h-3 w-3" />
                                                            {access.printCount} impressões
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Expira: {new Date(access.expiresAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    {access.isActive && !access.expired ? (
                                                        <Button size="sm" onClick={() => openFile(access.id)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Visualizar
                                                        </Button>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            {access.expired ? 'Expirado' : 'Inativo'}
                                                        </Badge>
                                                    )}
                                                </div>
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
                            <CardTitle>Materiais Exclusivos</CardTitle>
                            <CardDescription>Materiais para licença comercial</CardDescription>
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
                                                <Button size="sm" className="mt-3" asChild>
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
