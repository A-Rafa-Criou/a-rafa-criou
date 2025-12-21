import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';

/**
 * Endpoint para verificar e corrigir pagamentos pendentes do Mercado Pago
 * APENAS consulta a API do MP e atualiza status se necessário
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar se usuário é admin
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { users } = await import('@/lib/db/schema');
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

    if (!accessToken) {
      return NextResponse.json({ error: 'Token não configurado' }, { status: 500 });
    }

    // Buscar pedidos pendentes do Mercado Pago (últimos 7 dias)
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.paymentProvider, ['mercadopago', 'pix']),
          eq(orders.status, 'pending'),
          sql`${orders.createdAt} > NOW() - INTERVAL '7 days'`
        )
      )
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(50);

    console.log(`[Check Payments] Encontrados ${pendingOrders.length} pedidos pendentes`);

    const results = [];

    for (const order of pendingOrders) {
      if (!order.paymentId) {
        results.push({ orderId: order.id, status: 'skipped', reason: 'Sem payment ID' });
        continue;
      }

      try {
        // Remover PREF_ se tiver
        const paymentId = order.paymentId.replace('PREF_', '');

        // Consultar API do Mercado Pago
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          results.push({
            orderId: order.id,
            status: 'error',
            reason: `API retornou ${response.status}`,
          });
          continue;
        }

        const payment = await response.json();

        // Determinar novo status baseado na resposta do MP
        let newStatus = order.status;
        let paymentStatus = order.paymentStatus;

        if (['approved', 'paid', 'authorized'].includes(payment.status)) {
          newStatus = 'completed';
          paymentStatus = 'paid';
        } else if (['pending', 'in_process', 'in_mediation'].includes(payment.status)) {
          newStatus = 'pending';
          paymentStatus = 'pending';
        } else if (['cancelled', 'rejected', 'expired', 'charged_back'].includes(payment.status)) {
          newStatus = 'cancelled';
          paymentStatus = 'cancelled';
        } else if (payment.status === 'refunded') {
          newStatus = 'refunded';
          paymentStatus = 'refunded';
        }

        // Atualizar apenas se status mudou
        if (newStatus !== order.status || paymentStatus !== order.paymentStatus) {
          await db
            .update(orders)
            .set({
              status: newStatus,
              paymentStatus: paymentStatus,
              updatedAt: new Date(),
              paidAt: newStatus === 'completed' && !order.paidAt ? new Date() : order.paidAt,
            })
            .where(eq(orders.id, order.id));

          // Se foi completado agora, enviar e-mail
          if (newStatus === 'completed' && order.status !== 'completed') {
            try {
              const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
              await fetch(`${APP_URL}/api/orders/send-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
              });
            } catch {
              // Email não é crítico
            }
          }

          results.push({
            orderId: order.id,
            email: order.email,
            status: 'updated',
            oldStatus: order.status,
            newStatus,
            mpStatus: payment.status,
          });
        } else {
          results.push({
            orderId: order.id,
            status: 'unchanged',
            currentStatus: order.status,
            mpStatus: payment.status,
          });
        }

        // Delay para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          orderId: order.id,
          status: 'error',
          reason: (error as Error).message,
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;

    return NextResponse.json({
      success: true,
      total: pendingOrders.length,
      updated,
      results,
    });
  } catch (error) {
    console.error('[Check Payments] Erro:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
