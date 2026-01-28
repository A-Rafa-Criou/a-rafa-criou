import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/affiliates/sales
 *
 * Retorna lista de vendas (orders) com comissões do afiliado comum logado
 * Inclui: dados do cliente, valor da venda, comissão, status do pagamento
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Buscar vendas com comissões
    const sales = await db
      .select({
        // Dados do pedido
        id: orders.id,
        customerEmail: orders.email,
        orderTotal: orders.total,
        currency: orders.currency,
        createdAt: orders.createdAt,

        // Dados da comissão
        commissionId: affiliateCommissions.id,
        commissionAmount: affiliateCommissions.commissionAmount,
        commissionRate: affiliateCommissions.commissionRate,
        commissionStatus: affiliateCommissions.status,
        commissionPaidAt: affiliateCommissions.paidAt,
        commissionPaymentMethod: affiliateCommissions.paymentMethod,
        commissionPaymentProof: affiliateCommissions.paymentProof,
      })
      .from(orders)
      .innerJoin(affiliateCommissions, eq(orders.id, affiliateCommissions.orderId))
      .where(eq(affiliateCommissions.affiliateId, affiliate.id))
      .orderBy(desc(orders.createdAt));

    return NextResponse.json({
      success: true,
      sales,
      totalSales: sales.length,
    });
  } catch (error) {
    console.error('Error fetching affiliate sales:', error);
    return NextResponse.json({ message: 'Erro ao buscar vendas' }, { status: 500 });
  }
}
