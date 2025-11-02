import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, users, orders, files } from '@/lib/db/schema';
import { eq, gte, count, and, desc } from 'drizzle-orm';

// Taxas de conversão (você pode fazer isso dinâmico via API externa)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.65, // 1 USD = 5.65 BRL (atualize conforme necessário)
  EUR: 6.1, // 1 EUR = 6.10 BRL (atualize conforme necessário)
};

function convertToBRL(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

export async function GET() {
  try {
    // Get current month start date
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get stats in parallel
    const [
      totalProductsResult,
      totalUsersResult,
      ordersThisMonthResult,
      totalFilesResult,
      ordersThisMonthByStatus,
      recentOrdersResult,
    ] = await Promise.all([
      // Total products
      db.select({ count: count() }).from(products).where(eq(products.isActive, true)),

      // Total users
      db.select({ count: count() }).from(users),

      // Orders this month
      db.select({ count: count() }).from(orders).where(gte(orders.createdAt, currentMonthStart)),

      // Total files
      db.select({ count: count() }).from(files),

      // Orders this month by status (completed only for revenue)
      db
        .select({
          total: orders.total,
          currency: orders.currency,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, currentMonthStart), eq(orders.status, 'completed'))),

      // Recent orders (last 10) - fetch raw status and data for admin UI
      db
        .select({
          id: orders.id,
          customerName: users.name,
          customerEmail: users.email,
          total: orders.total,
          currency: orders.currency,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt))
        .limit(10),
    ]);

    // Calculate downloads this month (assuming each completed order = 1 download)
    const downloadsThisMonth = ordersThisMonthResult[0]?.count || 0;

    // Calculate total revenue in BRL (converting all currencies)
    let revenueBRL = 0;
    const revenueByCurrency: Record<string, number> = {};

    for (const order of ordersThisMonthByStatus) {
      const amount = parseFloat(order.total);
      const currency = order.currency || 'BRL';

      // Acumular por moeda original
      if (!revenueByCurrency[currency]) {
        revenueByCurrency[currency] = 0;
      }
      revenueByCurrency[currency] += amount;

      // Converter para BRL
      revenueBRL += convertToBRL(amount, currency);
    }

    // Formatar breakdown de receita por moeda
    const revenueBreakdown = Object.entries(revenueByCurrency).map(([currency, amount]) => ({
      currency,
      amount,
      amountBRL: convertToBRL(amount, currency),
      exchangeRate: EXCHANGE_RATES[currency] || 1,
    }));

    const stats = {
      totalProdutos: totalProductsResult[0]?.count || 0,
      totalClientes: totalUsersResult[0]?.count || 0,
      pedidosMes: ordersThisMonthResult[0]?.count || 0,
      arquivosUpload: totalFilesResult[0]?.count || 0,
      receitaMes: revenueBRL, // Total em BRL
      receitaDetalhada: revenueBreakdown, // Breakdown por moeda
      downloadsMes: downloadsThisMonth,
      recentOrders: recentOrdersResult.map(order => ({
        id: order.id,
        customerName: order.customerName || order.customerEmail || 'Cliente',
        total: parseFloat(order.total),
        currency: order.currency || 'BRL',
        totalBRL: convertToBRL(parseFloat(order.total), order.currency || 'BRL'),
        // Normalize status to canonical values expected by the admin UI
        status: (order.status || '').toLowerCase(),
        createdAt: order.createdAt,
      })),
    };

    return NextResponse.json(stats);
  } catch {
    // Return mock data on error to prevent dashboard breaking
    return NextResponse.json({
      totalProdutos: 0,
      totalClientes: 0,
      pedidosMes: 0,
      arquivosUpload: 0,
      receitaMes: 0,
      downloadsMes: 0,
      recentOrders: [],
    });
  }
}
