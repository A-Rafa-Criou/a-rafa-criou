import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * GET /api/admin/env-status
 * Verifica o status das variáveis de ambiente críticas
 * Requer autenticação de admin
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar variáveis de ambiente sem expor os valores
    const envStatus = {
      // Pagamentos
      stripe:
        !!process.env.STRIPE_SECRET_KEY &&
        !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
        !!process.env.STRIPE_WEBHOOK_SECRET,

      mercadoPago:
        (!!process.env.MERCADOPAGO_ACCESS_TOKEN_PROD || !!process.env.MERCADOPAGO_ACCESS_TOKEN) &&
        (!!process.env.MERCADOPAGO_PUBLIC_KEY_PROD || !!process.env.MERCADOPAGO_PUBLIC_KEY) &&
        !!process.env.MERCADOPAGO_WEBHOOK_SECRET,

      paypal:
        !!process.env.PAYPAL_CLIENT_ID &&
        !!process.env.PAYPAL_CLIENT_SECRET &&
        !!process.env.PAYPAL_WEBHOOK_ID,

      // E-mail
      resend: !!process.env.RESEND_API_KEY,

      // Storage
      cloudflareR2:
        !!process.env.R2_ACCOUNT_ID &&
        !!process.env.R2_ACCESS_KEY_ID &&
        !!process.env.R2_SECRET_ACCESS_KEY &&
        !!process.env.R2_BUCKET,

      cloudinary:
        !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET,

      // Database
      database: !!process.env.DATABASE_URL,

      // Auth
      auth: !!process.env.AUTH_SECRET && !!process.env.NEXTAUTH_URL,
    };

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ENV Status] Verificação de variáveis:', {
        stripe: {
          secret: !!process.env.STRIPE_SECRET_KEY,
          publishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
        mercadoPago: {
          token:
            !!process.env.MERCADOPAGO_ACCESS_TOKEN_PROD || !!process.env.MERCADOPAGO_ACCESS_TOKEN,
          publicKey:
            !!process.env.MERCADOPAGO_PUBLIC_KEY_PROD || !!process.env.MERCADOPAGO_PUBLIC_KEY,
          webhook: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
        },
        resend: !!process.env.RESEND_API_KEY,
        r2: {
          account: !!process.env.R2_ACCOUNT_ID,
          key: !!process.env.R2_ACCESS_KEY_ID,
          secret: !!process.env.R2_SECRET_ACCESS_KEY,
          bucket: !!process.env.R2_BUCKET,
        },
        cloudinary: {
          cloud: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          key: !!process.env.CLOUDINARY_API_KEY,
          secret: !!process.env.CLOUDINARY_API_SECRET,
        },
      });
    }

    return NextResponse.json(envStatus);
  } catch (error) {
    console.error('Erro ao verificar variáveis de ambiente:', error);
    return NextResponse.json({ error: 'Erro ao verificar configurações' }, { status: 500 });
  }
}
