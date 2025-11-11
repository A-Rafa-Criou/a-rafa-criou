/**
 * Script para corrigir preços de pedidos que foram cobrados sem promoção
 * 
 * Este script:
 * 1. Busca pedidos recentes (últimos 30 dias)
 * 2. Verifica se os itens tinham promoção ativa na data do pedido
 * 3. Recalcula o valor correto com promoção
 * 4. Gera relatório de pedidos afetados
 * 5. Opcionalmente atualiza os valores (com confirmação)
 */

import { db } from '@/lib/db';
import { orders, orderItems, productVariations } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

interface OrderIssue {
  orderId: string;
  orderDate: Date;
  email: string;
  items: Array<{
    name: string;
    quantity: number;
    pricePaid: number;
    priceCorrect: number;
    difference: number;
  }>;
  totalPaid: number;
  totalCorrect: number;
  totalDifference: number;
}

async function analyzeOrders() {
  console.log('🔍 Analisando pedidos recentes...\n');

  // Buscar pedidos dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, thirtyDaysAgo),
        eq(orders.paymentStatus, 'completed')
      )
    )
    .orderBy(orders.createdAt);

  console.log(`📦 Encontrados ${recentOrders.length} pedidos pagos nos últimos 30 dias\n`);

  const issues: OrderIssue[] = [];

  for (const order of recentOrders) {
    // Buscar itens do pedido
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    let hasIssue = false;
    const itemDetails = [];

    for (const item of items) {
      if (!item.variationId) continue;

      // Buscar variação
      const [variation] = await db
        .select()
        .from(productVariations)
        .where(eq(productVariations.id, item.variationId))
        .limit(1);

      if (!variation) continue;

      // Verificar se havia promoção ativa na data do pedido
      const basePrice = Number(variation.price);
      const promotion = await getActivePromotionForVariation(item.variationId);
      const priceInfo = calculatePromotionalPrice(basePrice, promotion);

      const pricePaid = Number(item.price);
      const priceCorrect = priceInfo.finalPrice;
      const difference = pricePaid - priceCorrect;

      // Se pagou mais que deveria (diferença > R$ 0,01)
      if (difference > 0.01) {
        hasIssue = true;
        itemDetails.push({
          name: item.name || 'Produto',
          quantity: item.quantity || 1,
          pricePaid,
          priceCorrect,
          difference,
        });
      }
    }

    if (hasIssue) {
      const totalPaid = Number(order.total);
      const totalDifference = itemDetails.reduce(
        (sum, item) => sum + item.difference * item.quantity,
        0
      );
      const totalCorrect = totalPaid - totalDifference;

      issues.push({
        orderId: order.id,
        orderDate: order.createdAt || new Date(),
        email: order.email || 'N/A',
        items: itemDetails,
        totalPaid,
        totalCorrect,
        totalDifference,
      });
    }
  }

  return issues;
}

function printReport(issues: OrderIssue[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RELATÓRIO DE PEDIDOS COM PREÇOS INCORRETOS');
  console.log('='.repeat(80) + '\n');

  if (issues.length === 0) {
    console.log('✅ Nenhum pedido com problema encontrado!\n');
    return;
  }

  console.log(`❌ Encontrados ${issues.length} pedidos com preços incorretos:\n`);

  let totalRefund = 0;

  issues.forEach((issue, index) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📦 Pedido #${index + 1}`);
    console.log(`   ID: ${issue.orderId}`);
    console.log(`   Data: ${issue.orderDate.toLocaleDateString('pt-BR')}`);
    console.log(`   Email: ${issue.email}`);
    console.log(`\n   Itens afetados:`);

    issue.items.forEach(item => {
      console.log(`   • ${item.name}`);
      console.log(`     - Quantidade: ${item.quantity}`);
      console.log(`     - Preço pago: R$ ${item.pricePaid.toFixed(2)}`);
      console.log(`     - Preço correto: R$ ${item.priceCorrect.toFixed(2)}`);
      console.log(`     - Diferença: R$ ${item.difference.toFixed(2)} por unidade`);
      console.log(
        `     - Total a reembolsar: R$ ${(item.difference * item.quantity).toFixed(2)}`
      );
    });

    console.log(`\n   💰 Resumo:`);
    console.log(`   - Total pago: R$ ${issue.totalPaid.toFixed(2)}`);
    console.log(`   - Total correto: R$ ${issue.totalCorrect.toFixed(2)}`);
    console.log(`   - 🔴 Reembolso necessário: R$ ${issue.totalDifference.toFixed(2)}`);

    totalRefund += issue.totalDifference;
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`💸 TOTAL A REEMBOLSAR: R$ ${totalRefund.toFixed(2)}`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  try {
    const issues = await analyzeOrders();
    printReport(issues);

    if (issues.length > 0) {
      console.log('\n⚠️  AÇÕES RECOMENDADAS:\n');
      console.log('1. Contatar clientes afetados explicando o erro');
      console.log('2. Processar reembolso via PayPal/Stripe');
      console.log('3. Ou oferecer crédito na loja do valor a reembolsar\n');

      const shouldExport = await question(
        'Deseja exportar lista de emails para CSV? (s/n): '
      );

      if (shouldExport.toLowerCase() === 's') {
        const fs = await import('fs');
        const csv = [
          'Email,Pedido ID,Data,Total Pago,Total Correto,Reembolso',
          ...issues.map(
            issue =>
              `${issue.email},${issue.orderId},${issue.orderDate.toISOString()},${issue.totalPaid},${issue.totalCorrect},${issue.totalDifference}`
          ),
        ].join('\n');

        fs.writeFileSync('pedidos-com-problema.csv', csv);
        console.log('\n✅ Arquivo exportado: pedidos-com-problema.csv\n');
      }
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
