import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Aguardando Aprovação - Licença Comercial',
    description: 'Sua solicitação de licença comercial está sendo analisada',
};

export default function AguardandoAprovacaoPage() {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div>
                            <CardTitle className="text-orange-900">Solicitação Enviada com Sucesso!</CardTitle>
                            <CardDescription className="text-orange-700">
                                Aguardando análise da equipe
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border border-orange-200 bg-white p-4">
                        <p className="mb-4 text-sm text-gray-700">
                            Sua solicitação de <strong>Licença Comercial</strong> foi enviada com sucesso e está
                            sendo analisada por nossa equipe.
                        </p>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                <div>
                                    <p className="font-medium">Formulário Recebido</p>
                                    <p className="text-xs text-muted-foreground">
                                        Seus dados e assinatura digital foram salvos
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-medium">Email de Confirmação Enviado</p>
                                    <p className="text-xs text-muted-foreground">
                                        Verifique sua caixa de entrada (e spam)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="font-medium">Análise em Andamento</p>
                                    <p className="text-xs text-muted-foreground">
                                        Nossa equipe está analisando sua solicitação
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-4">
                        <p className="mb-2 text-sm font-medium text-blue-900">Próximos Passos:</p>
                        <ul className="space-y-1.5 text-xs text-blue-800">
                            <li>1. Aguarde o email de aprovação (pode levar até 48 horas úteis)</li>
                            <li>2. Após aprovação, você receberá acesso ao dashboard exclusivo</li>
                            <li>3. Poderá visualizar arquivos por 5 dias após cada venda realizada</li>
                            <li>4. Receberá materiais exclusivos para licença comercial</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Button className="w-full" asChild>
                            <Link href="/">Voltar para Home</Link>
                        </Button>
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/conta">Ir para Minha Conta</Link>
                        </Button>
                    </div>

                    <div className="rounded-lg border bg-white p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            Dúvidas? Entre em contato pelo email{' '}
                            <a href="mailto:contato@arafacriou.com.br" className="font-medium underline">
                                contato@arafacriou.com.br
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
