import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/affiliates/orders
 *
 * Retorna pedidos vinculados ao afiliado com licença comercial
 * Inclui: dados completos do cliente para contato + itens do pedido
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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

    // Verificar se é licença comercial
    if (affiliate.affiliateType !== 'commercial_license') {
      return NextResponse.json(
        { message: 'Esta API é exclusiva para afiliados com licença comercial' },
        { status: 403 }
      );
    }

    // Buscar pedidos vinculados com itens e produtos
    const affiliateOrders = await db.query.orders.findMany({
      where: eq(orders.affiliateId, affiliate.id),
      orderBy: desc(orders.createdAt),
      with: {
        user: {
          columns: {
            name: true,
            phone: true,
          },
        },
        items: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Formatar resposta compatível com CommercialLicenseDashboard
    const formattedOrders = affiliateOrders.map(order => ({
      id: order.id,
      orderNumber: order.id, // Usar ID como número do pedido

      // Dados do cliente para contato (incluindo phone se disponível)
      customerName: order.user?.name || 'Cliente',
      customerEmail: order.email,
      customerPhone: order.user?.phone || null,

      // Valores
      orderTotal: order.total.toString(),
      currency: order.currency,

      // Status
      status: order.status,
      paymentStatus: order.paymentStatus,

      // Items formatados para o componente
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product?.name || item.name,
        quantity: item.quantity,
        price: item.price,
      })),

      // Datas
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      totalOrders: formattedOrders.length,
    });
  } catch (error) {
    console.error('Error fetching affiliate orders:', error);
    return NextResponse.json({ message: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}
