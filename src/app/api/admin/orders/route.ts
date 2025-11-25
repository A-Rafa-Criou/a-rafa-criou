import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems, users } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

// Taxas de câmbio fixas (BRL como base)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.65,
  EUR: 6.1,
};

// Função para converter valores para BRL
function convertToBRL(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

// Extrai um nome amigável do email (ex: "joao.silva@email.com" -> "Joao Silva")
function extractNameFromEmail(email: string | null): string {
  if (!email) return 'Cliente';
  const localPart = email.split('@')[0];
  if (!localPart) return email;

  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Buscar TODOS os pedidos (sem paginação no backend)
    // JOIN pelo userId OU pelo email para encontrar o nome do cliente
    let query = db
      .select({
        order: orders,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(orders)
      .leftJoin(users, sql`${users.id} = ${orders.userId} OR ${users.email} = ${orders.email}`)
      .orderBy(desc(orders.createdAt));

    // Filtrar por status se fornecido
    if (status && status !== 'all') {
      query = query.where(eq(orders.status, status)) as typeof query;
    }

    const results = await query;

    // OTIMIZAÇÃO: Buscar contagem de itens em uma única query
    const allOrderIds = results.map(({ order }) => order.id);

    let itemsCountMap = new Map<string, number>();
    if (allOrderIds.length > 0) {
      const allItems = await db
        .select({
          orderId: orderItems.orderId,
          count: sql<number>`count(*)::int`,
        })
        .from(orderItems)
        .where(
          sql`${orderItems.orderId} IN (${sql.join(
            allOrderIds.map(id => sql`${id}`),
            sql`, `
          )})`
        )
        .groupBy(orderItems.orderId);

      itemsCountMap = new Map(allItems.map(item => [item.orderId, item.count]));
    }

    // Montar resposta
    const ordersWithItems = results.map(({ order, user }) => ({
      id: order.id,
      email: order.email || user?.email || '',
      user: user?.name || extractNameFromEmail(order.email),
      status: order.status,
      total: order.total.toString(),
      currency: order.currency || 'BRL',
      itemsCount: itemsCountMap.get(order.id) || 0,
      createdAt: order.createdAt.toISOString(),
      paymentProvider: order.paymentProvider || null,
    }));

    // Buscar estatísticas básicas
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`sum(case when ${orders.status} = 'pending' then 1 else 0 end)::int`,
        completed: sql<number>`sum(case when ${orders.status} = 'completed' then 1 else 0 end)::int`,
        cancelled: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)::int`,
      })
      .from(orders);

    // Calcular receita por moeda
    const revenueByCurrency = await db
      .select({
        currency: orders.currency,
        total: sql<number>`sum(${orders.total})::decimal`,
      })
      .from(orders)
      .groupBy(orders.currency);

    // Converter todas as receitas para BRL e preparar detalhamento
    const receitaDetalhada = revenueByCurrency.map(item => {
      const amount = parseFloat(item.total?.toString() || '0');
      const currency = item.currency || 'BRL';
      const exchangeRate = EXCHANGE_RATES[currency] || 1;
      const amountBRL = convertToBRL(amount, currency);

      return {
        currency,
        amount: parseFloat(amount.toFixed(2)),
        amountBRL: parseFloat(amountBRL.toFixed(2)),
        exchangeRate,
      };
    });

    // Calcular receita total em BRL
    const totalRevenue = receitaDetalhada.reduce((sum, item) => sum + item.amountBRL, 0);

    return NextResponse.json({
      orders: ordersWithItems,
      stats: {
        ...stats[0],
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        receitaDetalhada,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
