/**
 * API para capturar a ordem EXATA atual dos produtos
 * e salvar em product_display_order
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { products, productDisplayOrder } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📸 Capturando ordem ATUAL dos produtos...');

    // 1. Buscar TODOS os produtos na ordem atual (created_at DESC)
    const currentProducts = await db
      .select({
        id: products.id,
        name: products.name,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt)); // MESMA ORDEM QUE A API USA

    console.log(`✅ Encontrados ${currentProducts.length} produtos`);

    // 2. Criar tabela se não existir
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_display_order (
        product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
        display_order INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_product_display_order 
      ON product_display_order(display_order DESC)
    `);

    console.log('✅ Tabela verificada/criada');

    // 3. Limpar dados antigos
    await db.delete(productDisplayOrder);
    console.log('✅ Dados antigos limpos');

    // 4. Salvar ordem atual
    const totalProducts = currentProducts.length;
    const orderData = currentProducts.map((product, index) => ({
      productId: product.id,
      displayOrder: totalProducts - index, // Primeiro = maior número
      updatedAt: new Date(),
    }));

    // Inserir em lotes de 50
    const batchSize = 50;
    for (let i = 0; i < orderData.length; i += batchSize) {
      const batch = orderData.slice(i, i + batchSize);
      await db.insert(productDisplayOrder).values(batch);
    }

    console.log(`✅ Ordem salva para ${currentProducts.length} produtos`);

    return NextResponse.json({
      success: true,
      message: 'Ordem atual capturada e salva com sucesso',
      totalProducts: currentProducts.length,
      preview: currentProducts.slice(0, 10).map((p, i) => ({
        position: i + 1,
        name: p.name,
        displayOrder: totalProducts - i,
      })),
    });
  } catch (error) {
    console.error('❌ Erro ao capturar ordem:', error);
    return NextResponse.json({ error: 'Erro ao capturar ordem dos produtos' }, { status: 500 });
  }
}
