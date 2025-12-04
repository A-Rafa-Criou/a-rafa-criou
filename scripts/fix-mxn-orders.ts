/**
 * Script para identificar e corrigir pedidos MXN com valores errados
 *
 * Problema: Pedidos em MXN foram salvos com valores em BRL
 * Solução: Recalcular os valores corretos baseado nos itens
 */

import { db } from '../src/lib/db/index';
import { orders, orderItems } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function fixMXNOrders() {
  console.log('\n🔧 Corrigindo pedidos MXN com valores incorretos...\n');

  try {
    // Buscar todos os pedidos em MXN
    const mxnOrders = await db.select().from(orders).where(eq(orders.currency, 'MXN'));

    if (mxnOrders.length === 0) {
      console.log('❌ Nenhum pedido encontrado em MXN\n');
      return;
    }

    console.log(`📊 Encontrados ${mxnOrders.length} pedido(s) em MXN\n`);

    let fixedCount = 0;

    for (const order of mxnOrders) {
      console.log(`\n📦 Pedido ${order.id.substring(0, 8)}...`);
      console.log(`   Email: ${order.email}`);
      console.log(`   Total atual: MX$ ${order.total}`);

      // Buscar itens do pedido
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

      if (items.length === 0) {
        console.log('   ⚠️  Sem itens, pulando...');
        continue;
      }

      // Calcular total correto baseado nos itens
      const correctSubtotal = items.reduce((sum, item) => {
        return sum + parseFloat(item.price) * item.quantity;
      }, 0);

      const discount = parseFloat(order.discountAmount || '0');
      const correctTotal = correctSubtotal - discount;

      console.log(`   Itens:`);
      items.forEach(item => {
        console.log(`     - ${item.name}: ${item.quantity}x MX$ ${item.price} = MX$ ${item.total}`);
      });
      console.log(`   Subtotal correto: MX$ ${correctSubtotal.toFixed(2)}`);
      console.log(`   Desconto: MX$ ${discount.toFixed(2)}`);
      console.log(`   Total correto: MX$ ${correctTotal.toFixed(2)}`);

      // Verificar se precisa correção
      const currentTotal = parseFloat(order.total);
      const difference = Math.abs(currentTotal - correctTotal);

      if (difference > 0.01) {
        console.log(`   ⚠️  DIFERENÇA ENCONTRADA: MX$ ${difference.toFixed(2)}`);
        console.log(`   🔧 Corrigindo...`);

        // Atualizar o pedido com valores corretos
        await db
          .update(orders)
          .set({
            subtotal: correctSubtotal.toFixed(2),
            total: correctTotal.toFixed(2),
          })
          .where(eq(orders.id, order.id));

        console.log(`   ✅ Pedido corrigido!`);
        fixedCount++;
      } else {
        console.log(`   ✅ Valores já estão corretos`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Processo concluído!`);
    console.log(`📊 Total de pedidos verificados: ${mxnOrders.length}`);
    console.log(`🔧 Pedidos corrigidos: ${fixedCount}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('❌ Erro ao corrigir pedidos:', error);
  }
}

fixMXNOrders().then(() => process.exit(0));
