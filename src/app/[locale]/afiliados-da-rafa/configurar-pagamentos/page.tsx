import { Suspense } from 'react';
import AffiliatePaymentOnboarding from '@/components/affiliates/AffiliatePaymentOnboarding';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Configurar Pagamentos | A Rafa Criou',
  description: 'Configure como você deseja receber suas comissões de afiliado',
};

export default function ConfigurarPagamentosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AffiliatePaymentOnboarding />
    </Suspense>
  );
}
