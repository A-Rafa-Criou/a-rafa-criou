import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, files, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { resend, FROM_EMAIL } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';

// ✅ Aceitar tanto GET quanto POST (Stripe usa POST, verificação manual pode usar GET)
async function handleConfirmation(req: NextRequest) {
  try {
    // Extrair parâmetros de GET ou POST
    let orderId: string | null = null;
    let paymentIntent: string | null = null;

    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url);
      orderId = searchParams.get('orderId');
      paymentIntent = searchParams.get('payment_intent');
    } else if (req.method === 'POST') {
      const body = await req.json();
      orderId = body.orderId || null;
      paymentIntent = body.payment_intent || null;
    }

    if (!orderId && !paymentIntent) {
      return NextResponse.json({ error: 'orderId or payment_intent required' }, { status: 400 });
    }

    // Find order
    let orderRes: unknown[] = [];
    if (orderId) {
      orderRes = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    } else if (paymentIntent) {
      orderRes = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, String(paymentIntent)))
        .limit(1);
    }

    if (orderRes.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    type OrderRow = {
      id: string;
      email: string;
      paymentStatus?: string | null;
      status?: string | null;
      total: string;
      createdAt: string;
    };
    const order = orderRes[0] as OrderRow;

    // Só envia se o pedido estiver pago/completo
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    const orderStatus = (order.status || '').toLowerCase();
    const isSuccess =
      orderStatus === 'completed' ||
      paymentStatus === 'succeeded' ||
      paymentStatus === 'paid' ||
      paymentStatus === 'approved';

    if (!isSuccess) {
      // Nunca envia e-mail de confirmação para pedidos não pagos
      return NextResponse.json({ error: 'Order payment not approved' }, { status: 403 });
    }

    // Get order items
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    // Build products with download URLs - BUSCAR TODOS OS ARQUIVOS
    const products = await Promise.all(
      items.map(async item => {
        // Buscar arquivos (priorizar variação, fallback para produto)
        let itemFiles = item.variationId
          ? await db.select().from(files).where(eq(files.variationId, item.variationId))
          : await db.select().from(files).where(eq(files.productId, item.productId));

        // Se não encontrou arquivos na variação, buscar do produto
        if (itemFiles.length === 0 && item.variationId) {
          itemFiles = await db.select().from(files).where(eq(files.productId, item.productId));
        }

        // Gerar URLs assinadas para TODOS os arquivos (24h de validade)
        const downloadUrls = await Promise.all(
          itemFiles.map(async (file) => ({
            name: file.originalName,
            url: await getR2SignedUrl(file.path, 24 * 60 * 60), // 24 horas
          }))
        );

        // Buscar nome da variação se existir
        let variationName: string | undefined;
        if (item.variationId) {
          const [variation] = await db
            .select()
            .from(productVariations)
            .where(eq(productVariations.id, item.variationId))
            .limit(1);

          if (variation) {
            variationName = variation.name;
          }
        }

        // Usar o primeiro arquivo como downloadUrl principal (compatibilidade)
        const downloadUrl = downloadUrls.length > 0 ? downloadUrls[0].url : '';

        return {
          name: item.name,
          variationName,
          downloadUrl, // URL do primeiro arquivo (para compatibilidade com template antigo)
          downloadUrls, // Todos os arquivos
          price: parseFloat(item.price),
        };
      })
    );

    // Render and send email
    const html = await render(
      PurchaseConfirmationEmail({
        customerName: order.email.split('@')[0] || 'Cliente',
        orderId: order.id,
        orderDate: new Date(order.createdAt).toLocaleDateString('pt-BR'),
        products,
        totalAmount: parseFloat(order.total),
      })
    );

    try {
      const resendResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: order.email,
        subject: `✅ Pedido Confirmado #${order.id.slice(0, 8)} - A Rafa Criou`,
        html,
      });

      // Return debug info: which products had download URLs and the resend SDK response (id/status)
      return NextResponse.json({
        ok: true,
        emailResult: resendResult,
        products: products.map(p => ({ name: p.name, hasUrl: !!p.downloadUrl })),
      });
    } catch {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Falha ao reenviar confirmação' }, { status: 500 });
  }
}

// ✅ Exportar GET e POST usando a mesma função
export async function GET(req: NextRequest) {
  return handleConfirmation(req);
}

export async function POST(req: NextRequest) {
  return handleConfirmation(req);
}

export const runtime = 'nodejs';
