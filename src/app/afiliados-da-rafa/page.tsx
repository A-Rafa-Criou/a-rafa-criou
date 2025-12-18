import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DollarSign, FileText, Gift, TrendingUp, Users, Clock } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Afiliados da Rafa - Escolha seu Plano',
    description:
        'Torne-se um afiliado da Rafa e ganhe comissões ou acesse nossos produtos com licença comercial',
};

export default function AfiliadosDaRafaPage() {
    return (
        <div className="container mx-auto max-w-7xl px-4 py-12">
            {/* Header */}
            <div className="mb-12 text-center">
                <Badge className="mb-4 bg-primary text-primary-foreground">Programa de Afiliados</Badge>
                <h1 className="mb-4 text-4xl font-bold md:text-5xl">Afiliados da Rafa</h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                    Escolha o tipo de parceria que melhor se adapta ao seu negócio
                </p>
            </div>

            {/* Cards de tipos de afiliado */}
            <div className="grid gap-8 md:grid-cols-2">
                {/* Afiliado Comum */}
                <Card className="relative flex flex-col border-2 transition-all hover:shadow-lg">
                    <CardHeader>
                        <div className="mb-4 flex items-center justify-between">
                            <Badge variant="secondary">Mais Popular</Badge>
                            <DollarSign className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Afiliado Comum</CardTitle>
                        <CardDescription className="text-base">
                            Ganhe comissões por cada venda realizada através do seu link
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-6 space-y-3">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium">Comissões Automáticas</p>
                                    <p className="text-sm text-muted-foreground">
                                        Receba suas comissões por vendas realizadas
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium">Dashboard com Vendas</p>
                                    <p className="text-sm text-muted-foreground">
                                        Acompanhe suas vendas, clientes e ganhos
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Gift className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium">Kit de Materiais Grátis</p>
                                    <p className="text-sm text-muted-foreground">
                                        Receba materiais de divulgação assim que aprovado
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="mt-1 h-5 w-5 flex-shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium">Aprovação Automática</p>
                                    <p className="text-sm text-muted-foreground">
                                        Comece a divulgar imediatamente após cadastro
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-lg bg-muted p-4">
                            <p className="mb-2 text-sm font-medium">O que você recebe:</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• Link exclusivo de divulgação</li>
                                <li>• Comissões por cada venda</li>
                                <li>• Dashboard para acompanhamento</li>
                                <li>• Dados dos clientes que compraram</li>
                                <li>• Pagamento via PIX</li>
                            </ul>
                        </div>

                        <Button className="mt-6 w-full" size="lg" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/comum">Quero ser Afiliado Comum</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Licença Comercial */}
                <Card className="relative flex flex-col border-2 border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader>
                        <div className="mb-4 flex items-center justify-between">
                            <Badge className="bg-primary text-primary-foreground">Licença Comercial</Badge>
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Licença Comercial</CardTitle>
                        <CardDescription className="text-base">
                            Acesse temporariamente nossos produtos após suas vendas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-6 space-y-3">
                            <div className="flex items-start gap-3">
                                <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium">Acesso Temporário aos Arquivos</p>
                                    <p className="text-sm text-muted-foreground">
                                        5 dias de acesso após cada venda realizada
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium">Dashboard Avançado</p>
                                    <p className="text-sm text-muted-foreground">
                                        Visualize pedidos, receitas e contate clientes
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Gift className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium">Kit de Materiais Exclusivo</p>
                                    <p className="text-sm text-muted-foreground">
                                        Materiais especiais para licença comercial
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="mt-1 h-5 w-5 flex-shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium">Aprovação Manual</p>
                                    <p className="text-sm text-muted-foreground">
                                        Análise cuidadosa com assinatura de contrato
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-lg bg-muted p-4">
                            <p className="mb-2 text-sm font-medium">O que você recebe:</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• Acesso temporário aos arquivos (5 dias)</li>
                                <li>• Visualização permitida (impressão sim, download não)</li>
                                <li>• Dashboard com estatísticas de receita</li>
                                <li>• Botões para contato direto com clientes</li>
                                <li>• Contrato digital assinado</li>
                            </ul>
                        </div>

                        <Button className="mt-6 w-full" size="lg" variant="default" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/licenca-comercial">
                                Quero Licença Comercial
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ ou informações adicionais */}
            <div className="mt-12 rounded-lg bg-muted p-6 text-center">
                <h2 className="mb-2 text-xl font-semibold">Dúvidas sobre qual escolher?</h2>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                    <strong>Afiliado Comum:</strong> Ideal se você quer ganhar comissões divulgando nossos
                    produtos.
                    <br />
                    <strong>Licença Comercial:</strong> Ideal se você precisa acessar os arquivos
                    temporariamente para realizar trabalhos personalizados para seus clientes.
                </p>
            </div>
        </div>
    );
}
