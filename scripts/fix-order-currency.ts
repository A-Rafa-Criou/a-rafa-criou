import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Script para corrigir valores de pedidos em moeda estrangeira
 * 
 * Uso: npx tsx scripts/fix-order-currency.ts <order-id>
 */

async function fixOrderCurrency(orderId: string) {
  console.log(`🔧 Corrigindo pedido ${orderId}...`);

  // 1. Buscar pedido
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    console.error('❌ Pedido não encontrado');
    process.exit(1);
  }

  console.log('📦 Pedido encontrado:');
  console.log(`   Subtotal: ${order.subtotal} ${order.currency}`);
  console.log(`   Desconto: ${order.discountAmount || '0'} ${order.currency}`);
  console.log(`   Total: ${order.total} ${order.currency}`);
  console.log(`   Moeda: ${order.currency}`);

  // 2. Se for BRL, não precisa corrigir
  if (order.currency === 'BRL') {
    console.log('✅ Pedido já está em BRL, não precisa corrigir');
    process.exit(0);
  }

  // 3. Buscar itens do pedido
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  console.log(`\n📋 ${items.length} itens encontrados:`);
  
  let totalCalculadoBRL = 0;
  for (const item of items) {
    const precoItem = parseFloat(item.price);
    const subtotalItem = precoItem * item.quantity;
    totalCalculadoBRL += subtotalItem;
    
    console.log(`   - ${item.name}: ${item.quantity}x R$ ${precoItem.toFixed(2)} = R$ ${subtotalItem.toFixed(2)}`);
  }

  console.log(`\n💰 Total calculado em BRL: R$ ${totalCalculadoBRL.toFixed(2)}`);

  // 4. Calcular taxa de conversão a partir do total pago
  const totalPago = parseFloat(order.total);
  const conversionRate = totalPago / totalCalculadoBRL;

  console.log(`📊 Taxa de conversão: ${conversionRate.toFixed(6)} (1 BRL = ${conversionRate.toFixed(6)} ${order.currency})`);

  // 5. Atualizar cada item
  console.log('\n🔄 Atualizando itens...');
  for (const item of items) {
    const precoBRL = parseFloat(item.price);
    const precoConvertido = precoBRL * conversionRate;
    const totalConvertido = precoConvertido * item.quantity;

    console.log(`   - ${item.name}:`);
    console.log(`     Preço BRL: R$ ${precoBRL.toFixed(2)}`);
    console.log(`     Preço ${order.currency}: ${order.currency === 'USD' ? '$' : '€'}${precoConvertido.toFixed(2)}`);
    console.log(`     Total: ${order.currency === 'USD' ? '$' : '€'}${totalConvertido.toFixed(2)}`);

    await db
      .update(orderItems)
      .set({
        price: precoConvertido.toFixed(2),
        total: totalConvertido.toFixed(2),
      })
      .where(eq(orderItems.id, item.id));
  }

  console.log('\n✅ Pedido corrigido com sucesso!');
  console.log(`\n🔗 Acesse: http://localhost:3000/obrigado?payment_intent=${order.stripePaymentIntentId || order.paymentId}`);
}

// Executar script
const orderId = process.argv[2];

if (!orderId) {
  console.error('❌ Uso: npx tsx scripts/fix-order-currency.ts <order-id>');
  process.exit(1);
}

fixOrderCurrency(orderId).catch((error) => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
