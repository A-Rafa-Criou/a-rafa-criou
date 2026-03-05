import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * GET /api/admin/stripe-diagnostic
 * Diagnóstico completo da integração Stripe
 * Verifica: chaves, webhook, conta, últimos pedidos
 * Requer autenticação de admin
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const diagnostic: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // 1. Verificar variáveis de ambiente (sem expor valores)
    diagnostic.envVariables = {
      STRIPE_SECRET_KEY: {
        configured: !!process.env.STRIPE_SECRET_KEY,
        prefix: process.env.STRIPE_SECRET_KEY
          ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...'
          : 'NÃO CONFIGURADA',
        isLive: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || false,
        isTest: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false,
      },
      STRIPE_PUBLISHABLE_KEY: {
        configured: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        prefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
          ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 7) + '...'
          : 'NÃO CONFIGURADA',
        isLive: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_') || false,
        isTest: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') || false,
      },
      STRIPE_WEBHOOK_SECRET: {
        configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        prefix: process.env.STRIPE_WEBHOOK_SECRET
          ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...'
          : 'NÃO CONFIGURADA',
      },
    };

    // Verificar consistência das chaves (live vs test)
    const secretIsLive = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const publishableIsLive =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_');
    diagnostic.keysConsistent = secretIsLive === publishableIsLive;
    if (!diagnostic.keysConsistent) {
      diagnostic.keysWarning =
        '⚠️ ALERTA: Secret key e publishable key estão em modos diferentes (uma live, outra test)!';
    }

    // 2. Verificar conta Stripe
    try {
      const account = await stripe.accounts.retrieve();
      diagnostic.stripeAccount = {
        id: account.id,
        businessName: account.business_profile?.name || 'N/A',
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        type: account.type,
        defaultCurrency: account.default_currency,
      };
    } catch (err) {
      diagnostic.stripeAccount = {
        error: err instanceof Error ? err.message : 'Erro ao acessar conta Stripe',
        hint: 'STRIPE_SECRET_KEY pode estar inválida ou expirada',
      };
    }

    // 3. Verificar webhooks registrados na conta
    try {
      const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
      diagnostic.webhooks = webhookEndpoints.data.map(wh => ({
        id: wh.id,
        url: wh.url,
        status: wh.status,
        enabledEvents: wh.enabled_events,
        apiVersion: wh.api_version,
        created: new Date((wh.created || 0) * 1000).toISOString(),
      }));

      // Verificar se tem webhook apontando para o domínio correto
      const siteUrl = process.env.NEXTAUTH_URL || 'https://arafacriou.com.br';
      const hasCorrectWebhook = webhookEndpoints.data.some(
        wh =>
          wh.url?.includes(siteUrl.replace('https://', '').replace('http://', '')) &&
          wh.enabled_events?.includes('payment_intent.succeeded') &&
          wh.status === 'enabled'
      );
      diagnostic.webhookConfigured = hasCorrectWebhook;
      if (!hasCorrectWebhook) {
        diagnostic.webhookWarning = `⚠️ Nenhum webhook ativo encontrado apontando para ${siteUrl}/api/stripe/webhook com evento payment_intent.succeeded`;
      }
    } catch (err) {
      diagnostic.webhooks = {
        error: err instanceof Error ? err.message : 'Erro ao listar webhooks',
      };
    }

    // 4. Últimos pagamentos no Stripe (verificar se batem com pedidos no BD)
    try {
      const recentPayments = await stripe.paymentIntents.list({
        limit: 5,
        expand: ['data.latest_charge'],
      });

      const paymentSummary = [];
      for (const pi of recentPayments.data) {
        // Verificar se existe pedido no banco para este payment
        const [dbOrder] = await db
          .select({
            id: orders.id,
            status: orders.status,
            total: orders.total,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(eq(orders.stripePaymentIntentId, pi.id))
          .limit(1);

        paymentSummary.push({
          paymentIntentId: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          status: pi.status,
          created: new Date((pi.created || 0) * 1000).toISOString(),
          hasMetadata: Object.keys(pi.metadata || {}).length > 0,
          metadataItems: pi.metadata?.items ? 'present' : 'MISSING',
          // Verificar se tem pedido no banco
          orderInDB: dbOrder
            ? {
                orderId: dbOrder.id,
                status: dbOrder.status,
                total: dbOrder.total,
              }
            : '❌ PEDIDO NÃO ENCONTRADO NO BANCO - Webhook pode não estar funcionando!',
        });
      }
      diagnostic.recentPayments = paymentSummary;
    } catch (err) {
      diagnostic.recentPayments = {
        error: err instanceof Error ? err.message : 'Erro ao listar pagamentos',
      };
    }

    // 5. Últimos pedidos Stripe no banco
    try {
      const recentOrders = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          currency: orders.currency,
          paymentProvider: orders.paymentProvider,
          stripePaymentIntentId: orders.stripePaymentIntentId,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.paymentProvider, 'stripe'))
        .orderBy(desc(orders.createdAt))
        .limit(5);

      diagnostic.recentDBOrders = recentOrders;
    } catch (err) {
      diagnostic.recentDBOrders = {
        error: err instanceof Error ? err.message : 'Erro ao buscar pedidos',
      };
    }

    // 6. Contagem de pedidos por status (Stripe apenas)
    try {
      const orderCounts = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(eq(orders.paymentProvider, 'stripe'))
        .groupBy(orders.status);

      diagnostic.orderCountsByStatus = orderCounts;
    } catch {
      // ignore
    }

    // 7. Versão do SDK Stripe
    diagnostic.stripeSDK = {
      note: 'Usando stripe@^20.3.1 (SDK define a apiVersion automaticamente)',
    };

    // 8. Resumo e recomendações
    const issues: string[] = [];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      issues.push('STRIPE_WEBHOOK_SECRET não está configurada');
    }
    if (!diagnostic.keysConsistent) {
      issues.push('Chaves Stripe em modos diferentes (live vs test)');
    }
    if (diagnostic.webhookConfigured === false) {
      issues.push(
        'Webhook não encontrado no Stripe Dashboard - crie um novo endpoint apontando para /api/stripe/webhook'
      );
    }
    if (
      Array.isArray(diagnostic.recentPayments) &&
      diagnostic.recentPayments.some(
        (p: Record<string, unknown>) => typeof p.orderInDB === 'string'
      )
    ) {
      issues.push(
        'Existem pagamentos no Stripe SEM pedido correspondente no banco - confirma que o webhook não está funcionando'
      );
    }

    diagnostic.issues = issues.length > 0 ? issues : ['✅ Nenhum problema detectado'];
    diagnostic.recommendation =
      issues.length > 0
        ? '🔧 Verifique os issues acima. O problema mais comum após trocar de conta Stripe é: 1) Webhook não registrado na nova conta, 2) STRIPE_WEBHOOK_SECRET desatualizado no Vercel'
        : '✅ Configuração parece correta';

    return NextResponse.json(diagnostic, { status: 200 });
  } catch (error) {
    console.error('Erro no diagnóstico Stripe:', error);
    return NextResponse.json(
      {
        error: 'Erro ao executar diagnóstico',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
