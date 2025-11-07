/**
 * Script para verificar status de um pagamento do Mercado Pago manualmente
 * Útil quando o webhook não chega ou demora
 * 
 * USO: npx tsx scripts/force-check-payment.ts <payment_id>
 * EXEMPLO: npx tsx scripts/force-check-payment.ts 132233383851
 */

const paymentId = process.argv[2];

if (!paymentId) {
  console.error('❌ Erro: Payment ID obrigatório');
  console.error('Uso: npx tsx scripts/force-check-payment.ts <payment_id>');
  process.exit(1);
}

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

console.log('🔍 Verificando pagamento:', paymentId);
console.log('🌐 URL:', `${APP_URL}/api/mercado-pago/check-payment?paymentId=${paymentId}`);

async function checkPayment() {
  try {
    const response = await fetch(
      `${APP_URL}/api/mercado-pago/check-payment?paymentId=${paymentId}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na API:', response.status);
      console.error(error);
      process.exit(1);
    }

    const data = await response.json();

    console.log('\n✅ Resultado:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 Atualizado:', data.updated ? 'SIM' : 'NÃO');
    console.log('\n📊 Mercado Pago:');
    console.log('  • ID:', data.mercadoPago?.id);
    console.log('  • Status:', data.mercadoPago?.status);
    console.log('  • Status Detail:', data.mercadoPago?.status_detail);
    console.log('  • Valor:', `R$ ${data.mercadoPago?.transaction_amount}`);
    console.log('  • Data Aprovação:', data.mercadoPago?.date_approved || 'Não aprovado');
    console.log('\n💾 Banco de Dados:');
    console.log('  • Order ID:', data.database?.orderId);
    console.log('  • Status:', data.database?.status);
    console.log('  • Payment Status:', data.database?.paymentStatus);
    console.log('  • Pago em:', data.database?.paidAt || 'Não pago');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (data.mercadoPago?.status === 'approved') {
      console.log('\n🎉 PAGAMENTO APROVADO!');
      console.log(`🔗 Ver pedido: ${APP_URL}/obrigado?payment_id=${paymentId}`);
    } else if (data.mercadoPago?.status === 'pending') {
      console.log('\n⏳ Pagamento pendente');
      console.log('💡 Aguarde a confirmação do banco ou execute este script novamente');
    } else {
      console.log('\n⚠️ Status:', data.mercadoPago?.status);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento:', error);
    process.exit(1);
  }
}

checkPayment();
