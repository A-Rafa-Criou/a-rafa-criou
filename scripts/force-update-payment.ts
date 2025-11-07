/**
 * Script para forçar atualização de pagamento do Mercado Pago
 *
 * Uso: npx tsx scripts/force-update-payment.ts <payment_id>
 * Exemplo: npx tsx scripts/force-update-payment.ts 132830186492
 */

import { db } from '@/lib/db';
import { orders, coupons, couponRedemptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const paymentId = process.argv[2];

  if (!paymentId) {
    console.error('❌ Payment ID é obrigatório');
    console.log('Uso: npx tsx scripts/force-update-payment.ts <payment_id>');
    console.log('Exemplo: npx tsx scripts/force-update-payment.ts 132830186492');
    process.exit(1);
  }

  // Buscar credenciais
  const accessToken =
    process.env.MERCADOPAGO_ACCESS_TOKEN_PROD || process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ Token do Mercado Pago não encontrado no .env.local');
    process.exit(1);
  }

  console.log('🔍 Buscando pagamento:', paymentId);

  // Buscar status do pagamento no Mercado Pago
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!paymentResponse.ok) {
    const error = await paymentResponse.json();
    console.error('❌ Erro ao buscar pagamento:', error);
    process.exit(1);
  }

  const payment = await paymentResponse.json();
  console.log('📊 Status do pagamento:', payment.status);
  console.log('📊 Status detail:', payment.status_detail);
  console.log('💰 Valor:', payment.transaction_amount, payment.currency_id);
  console.log('📅 Data aprovação:', payment.date_approved || 'N/A');

  // Buscar pedido no banco
  let order = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentId, paymentId))
    .limit(1)
    .then(rows => rows[0]);

  // Se não encontrou, tenta buscar pelo external_reference
  if (!order && payment.external_reference) {
    console.log('🔍 Tentando buscar por external_reference:', payment.external_reference);
    order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, payment.external_reference))
      .limit(1)
      .then(rows => rows[0]);
  }

  if (!order) {
    console.error('❌ Pedido não encontrado no banco de dados');
    console.log('Tentou buscar por:');
    console.log('  - paymentId:', paymentId);
    console.log('  - external_reference:', payment.external_reference);
    process.exit(1);
  }

  console.log('✅ Pedido encontrado:', order.id);
  console.log('📊 Status atual no banco:', order.status);
  console.log('📊 Payment status atual:', order.paymentStatus);

  // Determinar novo status
  let newStatus = 'pending';
  let paymentStatus = 'pending';

  if (['approved', 'paid', 'authorized'].includes(payment.status)) {
    newStatus = 'completed';
    paymentStatus = 'paid';
  } else if (['pending', 'in_process', 'in_mediation'].includes(payment.status)) {
    newStatus = 'pending';
    paymentStatus = 'pending';
  } else if (['cancelled', 'rejected', 'expired', 'charged_back'].includes(payment.status)) {
    newStatus = 'cancelled';
    paymentStatus = 'cancelled';
  } else if (payment.status === 'refunded') {
    newStatus = 'refunded';
    paymentStatus = 'refunded';
  }

  console.log('🔄 Novo status:', newStatus);
  console.log('🔄 Novo payment status:', paymentStatus);

  if (order.status === newStatus && order.paymentStatus === paymentStatus) {
    console.log('ℹ️  Pedido já está atualizado, nada a fazer');
    process.exit(0);
  }

  // Atualizar pedido
  await db
    .update(orders)
    .set({
      status: newStatus,
      paymentStatus: paymentStatus,
      updatedAt: new Date(),
      paidAt: newStatus === 'completed' ? new Date() : order.paidAt,
      paymentId: paymentId, // Garantir que o payment ID está correto
    })
    .where(eq(orders.id, order.id));

  console.log('✅ Pedido atualizado com sucesso!');

  // Incrementar cupom se necessário
  if (newStatus === 'completed' && order.status !== 'completed' && order.couponCode) {
    try {
      await db
        .update(coupons)
        .set({
          usedCount: sql`${coupons.usedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.code, order.couponCode));

      if (order.userId) {
        const [couponData] = await db
          .select()
          .from(coupons)
          .where(eq(coupons.code, order.couponCode))
          .limit(1);

        if (couponData) {
          await db.insert(couponRedemptions).values({
            couponId: couponData.id,
            userId: order.userId,
            orderId: order.id,
            amountDiscounted: order.discountAmount || '0',
          });
        }
      }

      console.log('✅ Cupom incrementado:', order.couponCode);
    } catch (error) {
      console.error('⚠️  Erro ao incrementar cupom:', error);
    }
  }

  // Enviar e-mail de confirmação
  if (newStatus === 'completed' && order.status !== 'completed') {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/orders/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (response.ok) {
        console.log('✅ E-mail de confirmação enviado');
      } else {
        console.warn('⚠️  Erro ao enviar e-mail:', await response.text());
      }
    } catch (error) {
      console.error('⚠️  Erro ao enviar e-mail:', error);
    }
  }

  console.log('');
  console.log('🎉 Processo concluído!');
  console.log('📦 Order ID:', order.id);
  console.log('💳 Payment ID:', paymentId);
  console.log('✅ Status:', newStatus);
  console.log('💰 Payment Status:', paymentStatus);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
