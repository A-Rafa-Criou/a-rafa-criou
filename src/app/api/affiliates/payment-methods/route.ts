import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * GET /api/affiliates/payment-methods?code=<affiliate_code>
 * Retorna quais métodos de pagamento o afiliado tem configurados.
 * Usado pelo checkout para mostrar apenas métodos que realmente
 * encaminham a comissão ao afiliado.
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
      affiliate.mercadopagoAccountId && affiliate.mercadopagoPayoutsEnabled
    );

    // Para BRL: PIX e Cartão via MercadoPago funcionam com split MP
    // Para Internacional: Stripe funciona com destination charges
    // PayPal: comissão é associada mas pagamento manual (sempre funciona)
    return NextResponse.json({
      hasAffiliate: true,
      affiliateCode: affiliate.code,
      methods: {
        // PIX e Cartão MP: precisam do MercadoPago configurado OU aceita manual
        pix: true, // PIX sempre disponível (comissão manual se sem MP)
        mercadopago_card: true, // Cartão MP sempre disponível (comissão manual se sem MP)
        // PayPal: sempre disponível (comissão registrada independente)
        paypal: true,
        // Stripe: precisa do Stripe Connect configurado para destination charges
        stripe: hasStripe,
      },
      // Flag para informar quais métodos têm split automático
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
