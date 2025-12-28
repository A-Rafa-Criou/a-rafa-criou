import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, products, orders } from '@/lib/db/schema';
import { sql, eq, desc, and, gte, lte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // 'paid' ou 'free' (se null, mostra todos)

    // Construir condições de filtro
    const conditions = [eq(orders.status, 'completed'), sql`${orderItems.productId} IS NOT NULL`];

    // Filtro de tipo: pago (total > 0) ou gratuito (total = 0)
    // Se type não for especificado, mostra TODOS
    if (type === 'paid') {
      conditions.push(sql`${orderItems.total} > 0`);
    } else if (type === 'free') {
      conditions.push(sql`${orderItems.total} = 0`);
    }
    // Se type for null/undefined, não adiciona filtro de tipo

    // Filtro de data
    if (startDate) {
      conditions.push(gte(orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, endDateTime));
    }

    // Buscar produtos mais vendidos
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})::int`,
        totalRevenue: sql<string>`SUM(${orderItems.total})`,
        orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(orderItems.productId, orderItems.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(20);

    // Buscar estatísticas gerais de vendas
    const generalStats = await db
      .select({
        totalProducts: sql<number>`COUNT(DISTINCT ${orderItems.productId})::int`,
        totalUnitsSold: sql<number>`SUM(${orderItems.quantity})::int`,
        totalRevenue: sql<string>`SUM(${orderItems.total})`,
        totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions));

    // Buscar produtos ativos do banco para enriquecer dados
    const activeProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
      })
      .from(products)
      .where(eq(products.isActive, true));

    // Criar mapa de produtos para lookup rápido
    const productsMap = new Map(activeProducts.map(p => [p.id, p]));

    // Enriquecer dados dos produtos mais vendidos
    const enrichedTopProducts = topProducts.map(item => ({
      ...item,
      productSlug: item.productId ? productsMap.get(item.productId)?.slug : null,
      currentProductName: item.productId ? productsMap.get(item.productId)?.name : null,
      averageOrderValue:
        item.orderCount > 0 ? (parseFloat(item.totalRevenue) / item.orderCount).toFixed(2) : '0',
    }));

    return NextResponse.json({
      topProducts: enrichedTopProducts,
      generalStats: generalStats[0] || {
        totalProducts: 0,
        totalUnitsSold: 0,
        totalRevenue: '0',
        totalOrders: 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de vendas:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas de vendas' }, { status: 500 });
  }
}
