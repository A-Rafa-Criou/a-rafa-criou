import { NextResponse } from 'next/server';

/**
 * Endpoint público para retornar chave pública do Mercado Pago
 * Necessário porque MERCADOPAGO_PUBLIC_KEY_PROD não tem prefixo NEXT_PUBLIC_
 * Seguro expor porque é chave PÚBLICA (não secreta)
 */
export async function GET() {
  const publicKey = 
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || 
    process.env.MERCADOPAGO_PUBLIC_KEY_PROD;

  if (!publicKey) {
    return NextResponse.json(
      { error: 'Mercado Pago não configurado' },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    publicKey,
    // Cache de 1 hora (chave não muda frequentemente)
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
