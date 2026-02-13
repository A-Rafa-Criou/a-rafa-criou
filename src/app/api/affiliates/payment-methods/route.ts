import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * GET /api/affiliates/payment-methods?code=<affiliate_code>
 * Retorna quais métodos de pagamento o afiliado tem configurados.
 * Usado pelo checkout para mostrar apenas métodos que realmente
 * encaminham a comissão ao afiliado.
 *
 * Regras:
 * - Sem afiliado: todos os métodos disponíveis
 * - Com afiliado: apenas métodos que o afiliado configurou
 *   - PIX e Cartão MP: precisam do MercadoPago conectado
 *   - Stripe: precisa do Stripe Connect conectado
 *   - PayPal: NUNCA disponível para compras de afiliado (sem split payment)
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
      // Sem afiliado = todos os métodos disponíveis
      return NextResponse.json({
        hasAffiliate: false,
        methods: {
          pix: true,
          mercadopago_card: true,
          paypal: true,
          stripe: true,
        },
      });
    }

    // Buscar afiliado pelo code ou customSlug
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        status: affiliates.status,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
        stripeAccountId: affiliates.stripeAccountId,
        mercadopagoPayoutsEnabled: affiliates.mercadopagoPayoutsEnabled,
        mercadopagoAccountId: affiliates.mercadopagoAccountId,
        mercadopagoSplitStatus: affiliates.mercadopagoSplitStatus,
      })
      .from(affiliates)
      .where(or(eq(affiliates.code, code), eq(affiliates.customSlug, code)))
      .limit(1);

    if (!affiliate || affiliate.status !== 'active') {
      // Afiliado não encontrado ou inativo = todos os métodos
      return NextResponse.json({
        hasAffiliate: false,
        methods: {
          pix: true,
          mercadopago_card: true,
          paypal: true,
          stripe: true,
        },
      });
    }

    // Determinar quais métodos de pagamento o afiliado tem configurados
    const hasStripe = !!(affiliate.stripeAccountId && affiliate.stripePayoutsEnabled);
    const hasMercadoPago = !!(
      affiliate.mercadopagoAccountId &&
      (affiliate.mercadopagoPayoutsEnabled || affiliate.mercadopagoSplitStatus === 'completed')
    );

    // Só mostrar métodos que o afiliado pode receber comissão:
    // - PIX e Cartão MP: só funcionam com split se afiliado tem MP conectado
    // - Stripe: só funciona com destination charges se afiliado tem Stripe conectado
    // - PayPal: NÃO tem mecanismo de split payment, nunca disponível para afiliados
    return NextResponse.json({
      hasAffiliate: true,
      affiliateCode: affiliate.code,
      methods: {
        pix: hasMercadoPago,
        mercadopago_card: hasMercadoPago,
        paypal: false, // PayPal não suporta split payment para afiliados
        stripe: hasStripe,
      },
      autoSplit: {
        stripe: hasStripe,
        mercadopago: hasMercadoPago,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar métodos de pagamento do afiliado:', error);
    return NextResponse.json({
      hasAffiliate: false,
      methods: {
        pix: true,
        mercadopago_card: true,
        paypal: true,
        stripe: true,
      },
    });
  }
}
