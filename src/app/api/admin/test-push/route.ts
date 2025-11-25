import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { sendWebPushToAdmins } from '@/lib/notifications/channels/web-push';

/**
 * Endpoint de teste para notificações Web Push
 * GET /api/admin/test-push - Envia notificação de teste para admins
 *
 * ⚠️ APENAS PARA DESENVOLVIMENTO/TESTE
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'sale';

    console.log('🧪 [TEST PUSH] Iniciando teste de notificação...');
    console.log('🔑 ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID ? '✅ OK' : '❌ FALTANDO');
    console.log(
      '🔑 ONESIGNAL_REST_API_KEY:',
      process.env.ONESIGNAL_REST_API_KEY ? '✅ OK' : '❌ FALTANDO'
    );

    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        {
          error: 'OneSignal não configurado',
          details: {
            ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID ? 'OK' : 'FALTANDO',
            ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY ? 'OK' : 'FALTANDO',
          },
        },
        { status: 500 }
      );
    }

    // Diferentes tipos de notificação para teste
    const notifications = {
      sale: {
        title: '💰 [TESTE] Nova Venda Confirmada!',
        body: `Cliente Teste comprou: Planner Digital 2025, Agenda Semanal\nTotal: R$ 89,90`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos`,
        data: {
          type: 'test_sale',
          status: 'success',
        },
      },
      payment: {
        title: '💳 [TESTE] Pagamento Recebido!',
        body: `Cliente Teste pagou R$ 149,90 via PayPal\nPedido #TEST1234`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos`,
        data: {
          type: 'test_payment',
          status: 'success',
        },
      },
      failed: {
        title: '❌ [TESTE] Pagamento Falhou!',
        body: `Cliente Teste - R$ 99,90\nCartão recusado pelo banco`,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos`,
        data: {
          type: 'test_failed',
          status: 'failed',
        },
      },
    };

    const notification = notifications[type as keyof typeof notifications] || notifications.sale;

    await sendWebPushToAdmins(notification);

    return NextResponse.json({
      success: true,
      message: `Notificação de teste "${type}" enviada!`,
      notification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [TEST PUSH] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao enviar notificação de teste',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
