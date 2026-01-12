import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';

// Secure download endpoint
// Accepts: orderId + itemId  OR payment_intent + itemId  OR payment_id + itemId  OR order_id + itemId
// Validates order/payment status and ownership, finds the file.path and returns a short-lived signed URL
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    console.log('🔍 [Orders Download] Request received:', {
      url: url.toString(),
      accept: req.headers.get('accept'),
    });

    const orderId = searchParams.get('orderId');
    const orderIdAlt = searchParams.get('order_id'); // PayPal (alternative parameter name)
    const paymentIntent = searchParams.get('payment_intent'); // Stripe
    const paymentId = searchParams.get('payment_id'); // Pix (Mercado Pago)
    const itemId = searchParams.get('itemId');
    const fileId = searchParams.get('fileId'); // Opcional: ID específico do arquivo
    const format = searchParams.get('format'); // 'json' ou 'redirect' (default: auto-detect)

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // ✅ Find order by orderId, order_id (PayPal), payment_intent (Stripe), or payment_id (Pix)
    let order;
    if (orderId) {
      const res = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      order = res[0];
    } else if (orderIdAlt) {
      const res = await db.select().from(orders).where(eq(orders.id, orderIdAlt)).limit(1);
      order = res[0];
    } else if (paymentIntent) {
      const res = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntent))
        .limit(1);
      order = res[0];
    } else if (paymentId) {
      const res = await db.select().from(orders).where(eq(orders.paymentId, paymentId)).limit(1);
      order = res[0];
    } else {
      return NextResponse.json(
        { error: 'orderId, order_id, payment_intent, or payment_id is required' },
        { status: 400 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    const orderStatus = (order.status || '').toLowerCase();
    const isSuccess =
      orderStatus === 'completed' || paymentStatus === 'succeeded' || paymentStatus === 'paid';

    if (!isSuccess) {
      return NextResponse.json({ error: 'Order payment not approved' }, { status: 403 });
    }

    // ✅ VERIFICAR EXPIRAÇÃO (usar accessDays do pedido, ou 30 dias padrão)
    const paidDate = order.paidAt ? new Date(order.paidAt) : new Date(order.createdAt);
    const now = new Date();
    const daysSincePurchase = Math.floor(
      (now.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const DOWNLOAD_EXPIRATION_DAYS = order.accessDays || 30;

    if (daysSincePurchase > DOWNLOAD_EXPIRATION_DAYS) {
      return NextResponse.json(
        {
          error: 'Download expirado',
          message: `O prazo de ${DOWNLOAD_EXPIRATION_DAYS} dias para download deste produto expirou.`,
          expiredAt: new Date(
            paidDate.getTime() + DOWNLOAD_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
          ).toISOString(),
          daysSincePurchase,
        },
        { status: 410 } // 410 Gone
      );
    }

    // Find the order item to determine the file. We expect files to be linked by productId/variationId -> files.path
    const items = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    const item = items[0];
    if (!item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // ✅ Buscar TODOS os arquivos do item para suportar múltiplos arquivos
    let itemFiles: (typeof files.$inferSelect)[] = [];
    if (item.variationId) {
      itemFiles = await db.select().from(files).where(eq(files.variationId, item.variationId));
    }
    if (itemFiles.length === 0 && item.productId) {
      itemFiles = await db.select().from(files).where(eq(files.productId, item.productId));
    }

    if (itemFiles.length === 0) {
      console.error('❌ [Orders Download] No files found:', {
        itemId,
        productId: item.productId,
        variationId: item.variationId,
      });
      return NextResponse.json(
        { error: 'No downloadable file found for this item' },
        { status: 404 }
      );
    }

    // ✅ Se fileId foi fornecido, buscar arquivo específico
    let file = null;
    if (fileId) {
      file = itemFiles.find(f => f.id === fileId);

      if (!file) {
        return NextResponse.json(
          { error: 'File not found or does not belong to this order item' },
          { status: 404 }
        );
      }
    } else {
      // Sem fileId: usar primeiro arquivo da lista
      file = itemFiles[0];
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No downloadable file found for this item' },
        { status: 404 }
      );
    }

    console.log('📁 [Orders Download] File found:', {
      fileId: file.id,
      path: file.path,
      productId: item.productId,
      variationId: item.variationId,
      totalFiles: itemFiles.length,
    });

    // ⚡ URLs com validade de 7 dias (máximo permitido pelo R2)
    // Links do email nunca expiram pois sempre geram URLs frescas
    const ttl = 7 * 24 * 60 * 60; // 7 dias (604800 segundos)
    const signed = await getR2SignedUrl(file.path, ttl);

    console.log('✅ [Orders Download] Generated signed URL with 7 days TTL');

    // ⚡ Detectar tipo de requisição:
    // - Navegador (clique do email): Accept header contém text/html → Redirect
    // - Front-end (fetch JavaScript): Accept */* ou outros → JSON
    const acceptHeader = req.headers.get('accept') || '';
    const isNavigatorRequest = acceptHeader.includes('text/html');

    console.log('🎯 [Orders Download] Request type:', {
      acceptHeader,
      isNavigatorRequest,
    });

    if (isNavigatorRequest) {
      // 🔗 Clique do email/navegador → Redirect direto
      console.log('🔀 [Orders Download] Returning redirect (browser request)');
      return NextResponse.redirect(signed);
    } else {
      // 📱 Fetch do front-end → JSON
      console.log('📤 [Orders Download] Returning JSON (fetch request)');
      return NextResponse.json({
        downloadUrl: signed,
        signedUrl: signed,
        fileName: file.originalName || file.name,
      });
    }
  } catch (err) {
    console.error('Error in orders/download:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
