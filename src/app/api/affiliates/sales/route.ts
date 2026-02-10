import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/affiliates/sales
 *
 * Retorna lista de TODAS as vendas do afiliado (incluindo produtos FREE)
 * Inclui: dados do cliente, valor da venda, comissão (quando houver), status do pagamento
 * 
 * ✅ PRODUTOS GRATUITOS também aparecem (com comissão = null)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ success: false, message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }
    
    const sales = await db
      .select({
        // Dados do pedido (apenas campos que EXISTEM no schema)
        id: orders.id,
        email: orders.email,
        total: orders.total,
        currency: orders.currency,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentProvider: orders.paymentProvider,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,

        // Dados da comissão (pode ser null para produtos FREE)
        commissionId: affiliateCommissions.id,
        commissionAmount: affiliateCommissions.commissionAmount,
        commissionRate: affiliateCommissions.commissionRate,
        commissionStatus: affiliateCommissions.status,
      })
      .from(orders)
      .leftJoin(affiliateCommissions, eq(orders.id, affiliateCommissions.orderId))
      .where(eq(orders.affiliateId, affiliate.id))
      .orderBy(desc(orders.createdAt));

    // Separar vendas pagas de gratuitas para estatísticas
    const paidSales = sales.filter(s => {
      const total = parseFloat(s.total || '0');
      return !isNaN(total) && total > 0;
    });
    
    const freeSales = sales.filter(s => {
      const total = parseFloat(s.total || '0');
      return isNaN(total) || total === 0;
    });

    const totalRevenue = paidSales.reduce((sum, s) => {
      const amount = parseFloat(s.total || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const totalCommission = sales.reduce((sum, s) => {
      const amount = parseFloat(s.commissionAmount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const response = {
      success: true,
      sales: sales.map(s => ({
        id: s.id,
        orderNumber: null,
        customerEmail: s.email || '',
        customerName: s.email?.split('@')[0] || 'Cliente', // Extrair nome do email
        customerPhone: null,
        orderTotal: s.total || '0',
        currency: s.currency || 'BRL',
        status: s.status || 'unknown',
        paymentStatus: s.paymentStatus || 'unknown',
        paymentProvider: s.paymentProvider || 'unknown',
        createdAt: s.createdAt,
        paidAt: s.paidAt,
        commissionAmount: s.commissionAmount || null,
        commissionStatus: s.commissionStatus || null,
      })),
      totalSales: sales.length,
      stats: {
        totalPaid: paidSales.length,
        totalFree: freeSales.length,
        totalRevenue,
        totalCommission,
      },
    };

    console.log('[Affiliate Sales API] ✅ Resposta preparada com sucesso');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Affiliate Sales API] ❌ Erro completo:', error);
    console.error('[Affiliate Sales API] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao buscar vendas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
