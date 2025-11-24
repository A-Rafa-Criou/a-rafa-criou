import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, files, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { uploadZipToR2AndGetUrl, createZipFromR2Files } from '@/lib/zip-utils';
import { resend, FROM_EMAIL } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';
import { sendOrderConfirmation } from '@/lib/notifications/helpers';
import Stripe from 'stripe';

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
      userId?: string | null;
      email: string;
      paymentStatus?: string | null;
      status?: string | null;
      total: string;
      currency?: string | null;
      stripePaymentIntentId?: string | null;
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
        // Pular items históricos sem produto
        if (!item.productId) {
          return {
            name: item.name,
            price: parseFloat(item.price),
            downloadUrl: '',
            downloadUrls: [],
          };
        }

        // Buscar arquivos (priorizar variação, fallback para produto)
        let itemFiles = item.variationId
          ? await db.select().from(files).where(eq(files.variationId, item.variationId))
          : await db.select().from(files).where(eq(files.productId, item.productId));

        // Se não encontrou arquivos na variação, buscar do produto
        if (itemFiles.length === 0 && item.variationId) {
          itemFiles = await db.select().from(files).where(eq(files.productId, item.productId));
        }

        // Se houver múltiplos arquivos (mais de 1), criar ZIP
        let downloadUrl = '';
        let downloadUrls: Array<{ name: string; url: string }> = [];
        const fileCount = itemFiles.length;

        if (itemFiles.length > 1) {
          // Criar ZIP com todos os arquivos
          const zipBuffer = await createZipFromR2Files(
            itemFiles.map(f => ({ path: f.path, originalName: f.originalName }))
          );

          // Upload do ZIP para R2 e obter URL assinada
          const zipFileName = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_${fileCount}_arquivos.zip`;
          downloadUrl = await uploadZipToR2AndGetUrl(zipBuffer, zipFileName);

          // Manter downloadUrls vazio quando for ZIP (para não mostrar botões individuais)
          downloadUrls = [];
        } else if (itemFiles.length === 1) {
          // Apenas 1 arquivo - gerar URL direta
          downloadUrl = await getR2SignedUrl(itemFiles[0].path, 24 * 60 * 60);
          downloadUrls = [
            {
              name: itemFiles[0].originalName,
              url: downloadUrl,
            },
          ];
        }

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

        return {
          name: item.name,
          variationName,
          downloadUrl, // URL do ZIP (se múltiplos) ou URL direta (se único)
          downloadUrls, // Array vazio se for ZIP, senão contém o único arquivo
          fileCount, // 🆕 Quantidade de PDFs
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
        currency: order.currency || 'BRL',
      })
    );

    try {
      const resendResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: order.email,
        subject: `✅ Pedido Confirmado #${order.id.slice(0, 8)} - A Rafa Criou`,
        html,
      });

      // 🔔 ENVIAR NOTIFICAÇÕES (Email + Web Push)
      if (order.userId) {
        // Determinar símbolo da moeda
        const currency = (order.currency || 'BRL').toUpperCase();
        const currencySymbols: Record<string, string> = {
          BRL: 'R$',
          USD: '$',
          EUR: '€',
          MXN: 'MEX$',
        };
        const symbol = currencySymbols[currency] || currency;

        // Buscar items do pedido com preços corretos do banco
        const orderItemsFromDB = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        // Calcular valor em BRL se não for BRL
        let orderTotalBRL: string | undefined;
        let conversionRate = 1;
        if (currency !== 'BRL') {
          // Tentar buscar taxa real do Stripe metadata
          if (order.stripePaymentIntentId) {
            try {
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
              const paymentIntent = await stripe.paymentIntents.retrieve(
                order.stripePaymentIntentId
              );
              if (paymentIntent.metadata.conversionRate) {
                conversionRate = parseFloat(paymentIntent.metadata.conversionRate);
              }
            } catch (error) {
              console.error('Erro ao buscar taxa do Stripe:', error);
            }
          }

          // Fallback para taxas aproximadas se não conseguiu buscar
          if (conversionRate === 1) {
            const rates: Record<string, number> = {
              USD: 5.33,
              EUR: 5.85,
              MXN: 0.29,
            };
            conversionRate = rates[currency] || 1;
          }

          const totalBRL = parseFloat(order.total) * conversionRate;
          orderTotalBRL = `R$ ${totalBRL.toFixed(2)}`;
        }

        console.log('🚀 [SEND-CONFIRMATION] Iniciando envio de notificações...');
        console.log('🔑 [SEND-CONFIRMATION] Verificando env vars:');
        console.log('   ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID ? '✅' : '❌');
        console.log('   ONESIGNAL_REST_API_KEY:', process.env.ONESIGNAL_REST_API_KEY ? '✅' : '❌');

        await sendOrderConfirmation({
          userId: order.userId,
          customerName: order.email.split('@')[0] || 'Cliente',
          customerEmail: order.email,
          orderId: order.id,
          orderTotal: `${symbol} ${parseFloat(order.total).toFixed(2)}`,
          orderTotalBRL,
          orderItems: orderItemsFromDB.map(item => {
            // Buscar variationName do produto correspondente
            const product = products.find(p => p.name === item.name);
            return {
              name: item.name,
              variationName: product?.variationName,
              quantity: item.quantity,
              price: `${symbol} ${parseFloat(item.price).toFixed(2)}`,
            };
          }),
          orderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${order.id}`,
        });
        console.log('✅ Notificações enviadas (Email + Web Push)');
      }

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
