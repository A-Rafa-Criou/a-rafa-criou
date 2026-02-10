import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DollarSign, FileText, Gift, TrendingUp, Users, Clock } from 'lucide-react';
import CommissionMural from '@/components/affiliates/CommissionMural';

export const metadata: Metadata = {
    title: 'Afiliados da Rafa - Escolha seu Plano',
    description:
        'Torne-se um afiliado da Rafa e ganhe comissões ou acesse nossos produtos com licença comercial',
};

export default function AfiliadosDaRafaPage() {
    return (
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-12">
            {/* Header */}
            <div className="mb-8 sm:mb-12 text-center">
                <Badge className="mb-3 sm:mb-4 bg-primary text-primary-foreground text-xs sm:text-sm">Programa de Afiliados</Badge>
                <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold">Afiliados da Rafa</h1>
                <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground px-4">
                    Escolha o tipo de parceria que melhor se adapta ao seu negócio
                </p>
            </div>

            {/* Mural de Comissão - atrair novos afiliados */}
            <div className="mb-8 sm:mb-12 max-w-3xl mx-auto">
                <CommissionMural />
            </div>

            {/* Cards de tipos de afiliado */}
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                {/* Afiliado Comum */}
                <Card className="relative flex flex-col border-2 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">Mais Popular</Badge>
                            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl">Afiliado Comum</CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                            Ganhe comissões por cada venda realizada através do seu link
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-4 sm:mb-6 space-y-2.5 sm:space-y-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <TrendingUp className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Comissões Automáticas</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Receba suas comissões por vendas realizadas
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Users className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Dashboard com Vendas</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Acompanhe suas vendas, clientes e ganhos
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Gift className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Kit de Materiais Grátis</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Receba materiais de divulgação assim que aprovado
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Aprovação Automática</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Comece a divulgar imediatamente após cadastro
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 rounded-lg bg-muted p-3 sm:p-4">
                            <p className="mb-2 text-xs sm:text-sm font-medium">O que você recebe:</p>
                            <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                <li>• Link exclusivo de divulgação</li>
                                <li>• Comissões por cada venda</li>
                                <li>• Dashboard para acompanhamento</li>
                                <li>• Dados dos clientes que compraram</li>
                                <li>• Pagamento via PIX</li>
                            </ul>
                        </div>

                        <Button className="mt-4 sm:mt-6 w-full text-sm sm:text-base" size="lg" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/comum">Quero ser Afiliado Comum</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Licença Comercial */}
                <Card className="relative flex flex-col border-2 border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <Badge className="bg-primary text-primary-foreground text-xs">Licença Comercial</Badge>
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl sm:text-2xl">Licença Comercial</CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                            Acesse temporariamente nossos produtos após suas vendas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="mb-4 sm:mb-6 space-y-2.5 sm:space-y-3">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <FileText className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Acesso Temporário aos Arquivos</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        5 dias de acesso após cada venda realizada
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Users className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-purple-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Dashboard Avançado</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Visualize pedidos, receitas e contate clientes
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Gift className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Kit de Materiais Exclusivo</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Materiais especiais para licença comercial
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3">
                                <Clock className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium text-sm sm:text-base">Aprovação Manual</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Análise cuidadosa com assinatura de contrato
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 rounded-lg bg-muted p-3 sm:p-4">
                            <p className="mb-2 text-xs sm:text-sm font-medium">O que você recebe:</p>
                            <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                <li>• Acesso temporário aos arquivos (5 dias)</li>
                                <li>• Visualização permitida (impressão sim, download não)</li>
                                <li>• Dashboard com estatísticas de receita</li>
                                <li>• Botões para contato direto com clientes</li>
                                <li>• Contrato digital assinado</li>
                            </ul>
                        </div>

                        <Button className="mt-4 sm:mt-6 w-full text-sm sm:text-base" size="lg" variant="default" asChild>
                            <Link href="/afiliados-da-rafa/cadastro/licenca-comercial">
                                Quero Licença Comercial
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ ou informações adicionais */}
            <div className="mt-8 sm:mt-12 rounded-lg bg-muted p-4 sm:p-6 text-center">
                <h2 className="mb-2 text-lg sm:text-xl font-semibold">Dúvidas sobre qual escolher?</h2>
                <p className="mx-auto max-w-2xl text-xs sm:text-sm md:text-base text-muted-foreground px-2">
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
