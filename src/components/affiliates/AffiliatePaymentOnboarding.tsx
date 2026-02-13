'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PaymentMethod = 'stripe_connect' | 'mercadopago_split';

interface OnboardingStatus {
  stripe: {
    connected: boolean;
    status: string;
  };
  mercadopago: {
    connected: boolean;
    status: string;
  };
}

export default function AffiliatePaymentOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('stripe_connect');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus>({
    stripe: { connected: false, status: 'not_started' },
    mercadopago: { connected: false, status: 'not_started' },
  });
  const [servicesAvailable, setServicesAvailable] = useState({
    stripe: true,
    mercadopago: true,
  });

  // Carregar status ao montar
  useEffect(() => {
    loadStatus();
  }, []);

  // Processar callbacks
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const refresh = searchParams.get('refresh');

    if (success === 'true') {
      setStep(3);
      toast({
        title: 'Conectado com sucesso!',
        description: 'Sua conta foi conectada e pagamentos automáticos estão ativos.',
      });
      // Limpar URL
      router.replace('/afiliados-da-rafa/configurar-pagamentos');
    } else if (success === 'mercadopago') {
      setStep(3);
      toast({
        title: 'Mercado Pago conectado!',
        description: 'Você receberá suas comissões automaticamente.',
      });
      router.replace('/afiliados-da-rafa/configurar-pagamentos');
    } else if (error) {
      toast({
        title: 'Erro ao conectar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      router.replace('/afiliados-da-rafa/configurar-pagamentos');
    } else if (refresh === 'true') {
      // Stripe redirect refresh
      loadStatus();
      router.replace('/afiliados-da-rafa/configurar-pagamentos');
    }
  }, [searchParams]);

  async function loadStatus() {
    try {
      const [stripeRes, mpRes] = await Promise.all([
        fetch('/api/affiliates/onboarding/stripe/status'),
        fetch('/api/affiliates/onboarding/mercadopago/status'),
      ]);

      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        setStatus(prev => ({ ...prev, stripe: stripeData }));
      } else if (stripeRes.status === 503) {
        setServicesAvailable(prev => ({ ...prev, stripe: false }));
      }

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        setStatus(prev => ({ ...prev, mercadopago: mpData }));
      } else if (mpRes.status === 503) {
        setServicesAvailable(prev => ({ ...prev, mercadopago: false }));
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  }

  async function handleConnectStripe() {
    setLoading(true);
    try {
      const response = await fetch('/api/affiliates/onboarding/stripe/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao conectar com Stripe');
      }

      // Redirecionar para Stripe
      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao conectar Stripe',
        description: err.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }

  async function handleConnectMercadoPago() {
    setLoading(true);
    try {
      const response = await fetch('/api/affiliates/onboarding/mercadopago/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao conectar com Mercado Pago');
      }

      // Redirecionar para Mercado Pago
      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao conectar Mercado Pago',
        description: err.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (selectedMethod === 'stripe_connect') {
        handleConnectStripe();
      } else if (selectedMethod === 'mercadopago_split') {
        handleConnectMercadoPago();
      }
    }
  }

  function getErrorMessage(error: string): string {
    const messages: Record<string, string> = {
      denied: 'Você negou a autorização. Tente novamente quando estiver pronto.',
      invalid_params: 'Parâmetros inválidos. Tente novamente.',
      affiliate_not_found: 'Afiliado não encontrado.',
      token_exchange_failed: 'Falha ao trocar token de autorização.',
      user_fetch_failed: 'Erro ao buscar dados do usuário.',
      internal_error: 'Erro interno. Tente novamente mais tarde.',
    };
    return messages[error] || 'Erro desconhecido';
  }

  return (
    <div className="container max-w-4xl mx-auto py-4 sm:py-8 px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Configurar Pagamentos Automáticos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configure como você deseja receber suas comissões de afiliado
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-4 min-w-max px-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : '1'}
            </div>
            <span className="text-xs sm:text-sm font-medium">Escolher Método</span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-muted" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
            >
              {step > 2 ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : '2'}
            </div>
            <span className="text-xs sm:text-sm font-medium">Conectar Conta</span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-muted" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
            >
              {step === 3 ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : '3'}
            </div>
            <span className="text-xs sm:text-sm font-medium">Confirmação</span>
          </div>
        </div>
      </div>

      {/* Step 1: Escolher Método */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Escolha como deseja receber</CardTitle>
            <CardDescription>
              Selecione o método de pagamento que melhor atende suas necessidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alerta se nenhum serviço estiver disponível */}
            {!servicesAvailable.stripe && !servicesAvailable.mercadopago && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Serviços de pagamento não configurados</strong>
                  <p className="mt-1 text-xs">
                    Nenhum serviço de pagamento automático está disponível no momento. Entre em contato com o suporte.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
              {/* Stripe Connect */}
              <div className={`flex items-start space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 transition-colors ${!servicesAvailable.stripe
                  ? 'opacity-60 cursor-not-allowed bg-muted'
                  : selectedMethod === 'stripe_connect'
                    ? 'bg-primary/10 border-primary cursor-pointer'
                    : 'hover:bg-accent cursor-pointer'
                }`}>
                <RadioGroupItem
                  value="stripe_connect"
                  id="stripe"
                  className="mt-0.5"
                  disabled={!servicesAvailable.stripe}
                />
                <Label htmlFor="stripe" className={`flex-1 ${servicesAvailable.stripe ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="font-semibold text-sm sm:text-base">Stripe Connect</span>
                    <Badge variant="secondary" className="text-xs">Recomendado</Badge>
                    {!servicesAvailable.stripe && (
                      <Badge variant="destructive" className="text-xs">
                        Indisponível
                      </Badge>
                    )}
                    {status.stripe.connected && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Receba em PIX, transferência bancária ou cartão. Funciona internacionalmente.
                  </p>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>✓ Pagamentos automáticos diários</li>
                    <li>✓ Transferência direto na sua conta</li>
                    <li>✓ Suporte para múltiplas moedas</li>
                    <li>✓ Dashboard completo de pagamentos</li>
                  </ul>
                </Label>
              </div>

              {/* Mercado Pago Split */}
              <div className={`flex items-start space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 transition-colors ${!servicesAvailable.mercadopago
                  ? 'opacity-60 cursor-not-allowed bg-muted'
                  : selectedMethod === 'mercadopago_split'
                    ? 'bg-primary/10 border-primary cursor-pointer'
                    : 'hover:bg-accent cursor-pointer'
                }`}>
                <RadioGroupItem
                  value="mercadopago_split"
                  id="mercadopago"
                  className="mt-0.5"
                  disabled={!servicesAvailable.mercadopago}
                />
                <Label htmlFor="mercadopago" className={`flex-1 ${servicesAvailable.mercadopago ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span className="font-semibold text-sm sm:text-base">Mercado Pago Split</span>
                    <Badge variant="outline" className="text-xs">Brasil</Badge>
                    {!servicesAvailable.mercadopago && (
                      <Badge variant="destructive" className="text-xs">
                        Indisponível
                      </Badge>
                    )}
                    {status.mercadopago.connected && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Receba via PIX ou transferência. Ideal para quem já usa Mercado Pago.
                  </p>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>✓ Pagamentos automáticos diários</li>
                    <li>✓ PIX instantâneo</li>
                    <li>✓ Interface em português</li>
                    <li>✓ Integração com conta MP existente</li>
                  </ul>
                </Label>
              </div>


            </RadioGroup>

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4">
              <Button variant="outline" onClick={() => router.push('/afiliados-da-rafa')} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleNext}
                className="w-full sm:w-auto"
                disabled={
                  (selectedMethod === 'stripe_connect' && !servicesAvailable.stripe) ||
                  (selectedMethod === 'mercadopago_split' && !servicesAvailable.mercadopago)
                }
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Conectar Conta */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Conectar sua conta</CardTitle>
            <CardDescription>
              {selectedMethod === 'stripe_connect' && 'Você será redirecionado para o Stripe para criar ou conectar sua conta'}
              {selectedMethod === 'mercadopago_split' && 'Você será redirecionado para o Mercado Pago para autorizar a aplicação'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMethod === 'stripe_connect' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No Stripe, você precisará fornecer:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Nome completo ou Razão Social</li>
                    <li>CPF ou CNPJ</li>
                    <li>Endereço completo</li>
                    <li>Data de nascimento</li>
                    <li>Dados bancários (para receber)</li>
                  </ul>
                  <p className="mt-2 text-sm">O processo leva cerca de 5 minutos.</p>
                </AlertDescription>
              </Alert>
            )}

            {selectedMethod === 'mercadopago_split' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você precisará de uma conta no Mercado Pago. Se não tiver, pode criar durante o processo.
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Login na sua conta Mercado Pago</li>
                    <li>Autorizar a aplicação A Rafa Criou</li>
                    <li>Confirmar dados de recebimento</li>
                  </ul>
                  <p className="mt-2 text-sm">Processo rápido, em português.</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleNext} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Conectar Agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmação */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <CardTitle>Tudo pronto!</CardTitle>
            </div>
            <CardDescription>
              Sua conta foi conectada e você está pronto para receber comissões automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong className="block mb-2">Pagamentos Automáticos Ativados</strong>
                Você receberá suas comissões automaticamente assim que elas forem aprovadas. Não é necessário fazer mais nada!
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 pt-4">
              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">📊 Próximos Passos</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li>• Compartilhe seus links de afiliado</li>
                  <li>• Acompanhe suas vendas no dashboard</li>
                  <li>• Comissões são aprovadas automaticamente após 7 dias</li>
                  <li>• Pagamentos são processados diariamente às 10h</li>
                </ul>
              </div>

              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">💰 Como Funciona</h3>
                <ol className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <li>1. Cliente compra com seu link</li>
                  <li>2. Comissão é gerada e aguarda aprovação (7 dias)</li>
                  <li>3. Sistema processa pagamento automaticamente</li>
                  <li>4. Você recebe na conta conectada</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => router.push('/afiliados-da-rafa/dashboard')} size="lg" className="w-full sm:w-auto">
                Ir para Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
