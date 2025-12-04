import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, users, orders, files, couponRedemptions, coupons } from '@/lib/db/schema';
import { eq, gte, lte, count, and, desc, sql } from 'drizzle-orm';

// Sem cache para permitir filtros dinâmicos
export const dynamic = 'force-dynamic';

// Taxas de conversão
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.65,
  EUR: 6.1,
  MXN: 0.29,
};

function convertToBRL(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

// Extrai um nome amigável do email (ex: "joao.silva@email.com" -> "Joao Silva")
function extractNameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const localPart = email.split('@')[0];
  if (!localPart) return email;

  // Substitui pontos, underscores e hífens por espaços e capitaliza
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Parse dates - default to current month
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    // End date: add 1 day to include the full end day
    const endDate = endDateParam
      ? new Date(new Date(endDateParam).setHours(23, 59, 59, 999))
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build date conditions
    const dateCondition = and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate));

    const completedDateCondition = and(
      gte(orders.createdAt, startDate),
      lte(orders.createdAt, endDate),
      eq(orders.status, 'completed')
    );

    // Execute queries in parallel
    const [
      totalProductsResult,
      totalUsersResult,
      ordersInPeriodResult,
      totalFilesResult,
      completedOrdersData,
      couponRedemptionsData,
      recentOrdersResult,
    ] = await Promise.all([
      // Total products (not filtered by date)
      db.select({ count: count() }).from(products).where(eq(products.isActive, true)),

      // Total users (not filtered by date)
      db.select({ count: count() }).from(users),

      // Orders in period
      db.select({ count: count() }).from(orders).where(dateCondition),

      // Total files (not filtered by date)
      db.select({ count: count() }).from(files),

      // Completed orders with discount info
      db
        .select({
          total: orders.total,
          subtotal: orders.subtotal,
          discountAmount: orders.discountAmount,
          currency: orders.currency,
          couponCode: orders.couponCode,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(completedDateCondition),

      // Coupon redemptions in period
      db
        .select({
          couponId: couponRedemptions.couponId,
          amountDiscounted: couponRedemptions.amountDiscounted,
          couponCode: coupons.code,
          usedAt: couponRedemptions.usedAt,
        })
        .from(couponRedemptions)
        .leftJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
        .where(
          and(gte(couponRedemptions.usedAt, startDate), lte(couponRedemptions.usedAt, endDate))
        ),

      // Recent orders in period - busca nome pelo userId OU pelo email do pedido
      db
        .select({
          id: orders.id,
          customerName: users.name,
          orderEmail: orders.email,
          total: orders.total,
          subtotal: orders.subtotal,
          discountAmount: orders.discountAmount,
          currency: orders.currency,
          status: orders.status,
          couponCode: orders.couponCode,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(users, sql`${users.id} = ${orders.userId} OR ${users.email} = ${orders.email}`)
        .where(dateCondition)
        .orderBy(desc(orders.createdAt))
        .limit(20),
    ]);

    // Calculate revenues and discounts
    let totalRevenueBRL = 0; // Líquido (total após desconto)
    let totalSubtotalBRL = 0; // Bruto (antes do desconto)
    let totalDiscountBRL = 0; // Total de descontos
    let ordersWithCoupon = 0;
    const revenueByCurrency: Record<string, number> = {};

    for (const order of completedOrdersData) {
      const total = parseFloat(order.total); // Líquido (valor pago)
      // discountAmount pode vir negativo do banco, pega valor absoluto
      const discount = Math.abs(parseFloat(order.discountAmount || '0'));

      // SEMPRE calcula bruto = líquido + desconto
      const subtotal = total + discount;
      const currency = order.currency || 'BRL';

      // Revenue by currency (líquido)
      if (!revenueByCurrency[currency]) {
        revenueByCurrency[currency] = 0;
      }
      revenueByCurrency[currency] += total;

      // Convert to BRL
      totalRevenueBRL += convertToBRL(total, currency);
      totalSubtotalBRL += convertToBRL(subtotal, currency);
      totalDiscountBRL += convertToBRL(discount, currency);

      // Count orders with coupon
      if (order.couponCode) {
        ordersWithCoupon++;
      }
    }

    // Calculate coupon statistics - usar dados dos pedidos, não couponRedemptions
    // Conta cupons únicos e total descontado a partir dos pedidos completados
    let totalCouponDiscountBRL = 0;
    const couponUsageMap = new Map<string, { code: string; count: number; total: number }>();

    for (const order of completedOrdersData) {
      if (order.couponCode) {
        const discount = Math.abs(parseFloat(order.discountAmount || '0'));
        const currency = order.currency || 'BRL';
        const discountBRL = convertToBRL(discount, currency);

        totalCouponDiscountBRL += discountBRL;

        const code = order.couponCode;
        const existing = couponUsageMap.get(code) || { code, count: 0, total: 0 };
        existing.count++;
        existing.total += discountBRL;
        couponUsageMap.set(code, existing);
      }
    }

    const topCoupons = Array.from(couponUsageMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Format revenue breakdown
    const revenueBreakdown = Object.entries(revenueByCurrency).map(([currency, amount]) => ({
      currency,
      amount,
      amountBRL: convertToBRL(amount, currency),
      exchangeRate: EXCHANGE_RATES[currency] || 1,
    }));

    // Recalcular dailyStats a partir de completedOrdersData (com conversão de moeda)
    const dailyDataMap = new Map<
      string,
      { liquido: number; bruto: number; desconto: number; orders: number }
    >();

    for (const order of completedOrdersData) {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const total = parseFloat(order.total);
      const discount = Math.abs(parseFloat(order.discountAmount || '0'));
      const subtotal = total + discount;
      const currency = order.currency || 'BRL';

      // Converter para BRL
      const totalBRL = convertToBRL(total, currency);
      const discountBRL = convertToBRL(discount, currency);
      const subtotalBRL = convertToBRL(subtotal, currency);

      const existing = dailyDataMap.get(dateKey) || {
        liquido: 0,
        bruto: 0,
        desconto: 0,
        orders: 0,
      };
      existing.liquido += totalBRL;
      existing.bruto += subtotalBRL;
      existing.desconto += discountBRL;
      existing.orders += 1;
      dailyDataMap.set(dateKey, existing);
    }

    // Converter Map para array ordenado
    const dailyStats = Array.from(dailyDataMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.liquido,
        bruto: data.bruto,
        discount: data.desconto,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats = {
      // Period info
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },

      // Overview
      totalProdutos: totalProductsResult[0]?.count || 0,
      totalClientes: totalUsersResult[0]?.count || 0,
      pedidosPeriodo: ordersInPeriodResult[0]?.count || 0,
      pedidosCompletados: completedOrdersData.length,
      arquivosUpload: totalFilesResult[0]?.count || 0,

      // Revenue - valores separados para clareza
      receitaBruta: totalSubtotalBRL, // Valor antes dos descontos
      receitaPeriodo: totalRevenueBRL, // Valor líquido (após descontos)
      receitaDetalhada: revenueBreakdown,

      // Discounts
      descontoTotal: totalDiscountBRL,
      pedidosComCupom: ordersWithCoupon,
      totalCuponsUsados: topCoupons.length, // Cupons únicos usados
      descontoCupons: totalCouponDiscountBRL,

      // Top coupons
      topCupons: topCoupons,

      // Daily breakdown
      dadosDiarios: dailyStats,

      // Recent orders
      recentOrders: recentOrdersResult.map(order => ({
        id: order.id,
        customerName: order.customerName || extractNameFromEmail(order.orderEmail) || 'Cliente',
        email: order.orderEmail,
        total: parseFloat(order.total),
        subtotal: parseFloat(order.subtotal),
        discount: Math.abs(parseFloat(order.discountAmount || '0')),
        currency: order.currency || 'BRL',
        totalBRL: convertToBRL(parseFloat(order.total), order.currency || 'BRL'),
        status: (order.status || '').toLowerCase(),
        couponCode: order.couponCode,
        createdAt: order.createdAt,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching filtered stats:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
