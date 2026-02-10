/**
 * API Cron Job - Processar Pagamentos Automáticos de Afiliados
 *
 * ⚠️ DEPRECATED: Este endpoint foi substituído por /api/cron/process-affiliate-payouts
 * que usa Stripe Connect em vez de PIX MercadoPago.
 *
 * Mantido por compatibilidade - redireciona para o novo endpoint.
 *
 * Endpoint: POST /api/cron/process-payouts
 * Novo endpoint: POST /api/cron/process-affiliate-payouts
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/process-payouts
 *
 * DEPRECATED: Redireciona para /api/cron/process-affiliate-payouts (Stripe Connect)
 */
export async function POST(req: NextRequest) {
  console.log('[Cron Payouts] ⚠️ Endpoint deprecated. Use /api/cron/process-affiliate-payouts');

  // Validar autenticação
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Chamar o novo endpoint internamente
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/cron/process-affiliate-payouts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await response.json();
    return NextResponse.json({
      ...data,
      _deprecated: 'Este endpoint foi movido para /api/cron/process-affiliate-payouts',
    });
  } catch (error) {
    console.error('[Cron Payouts] Erro ao redirecionar:', error);
    return NextResponse.json(
      {
        error: 'Falha ao redirecionar para novo endpoint',
        newEndpoint: '/api/cron/process-affiliate-payouts',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-payouts — Informação de deprecação
 */
export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'Este endpoint foi substituído por /api/cron/process-affiliate-payouts',
    newEndpoint: '/api/cron/process-affiliate-payouts',
    paymentMethod: 'Stripe Connect (anteriormente PIX MercadoPago)',
  });
}
