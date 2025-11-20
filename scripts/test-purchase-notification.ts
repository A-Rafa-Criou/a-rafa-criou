/**
 * Script para testar o fluxo completo de notificações quando uma compra é feita
 *
 * Executa: npx tsx scripts/test-purchase-notification.ts
 */

// Carregar env antes de importar qualquer módulo
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('🔍 Verificando variáveis de ambiente...');
console.log('ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID ? '✅ Configurado' : '❌ Faltando');
console.log(
  'ONESIGNAL_REST_API_KEY:',
  process.env.ONESIGNAL_REST_API_KEY ? '✅ Configurado' : '❌ Faltando'
);
console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || '❌ Faltando');
console.log('');

import { sendOrderConfirmation } from '@/lib/notifications/helpers';

async function testPurchaseNotification() {
  console.log('🧪 TESTE: Simulando notificação de compra...\n');

  try {
    await sendOrderConfirmation({
      userId: 'user_test_123',
      customerName: 'Cliente Teste',
      customerEmail: 'edduardooo2011@gmail.com',
      orderId: 'test_order_' + Date.now(),
      orderTotal: 'R$ 49,90',
      orderTotalBRL: 'R$ 49,90',
      orderItems: [
        {
          name: 'Produto de Teste',
          variationName: 'Variação Teste',
          quantity: 1,
          price: 'R$ 49,90',
        },
      ],
      orderUrl: 'https://arafacriou.com.br/pedidos/test',
    });

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('📧 Email deveria ter sido enviado');
    console.log('🔔 Web Push para cliente deveria ter sido enviado');
    console.log('🔔 Web Push para admins deveria ter sido enviado');
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
  }
}

testPurchaseNotification();
