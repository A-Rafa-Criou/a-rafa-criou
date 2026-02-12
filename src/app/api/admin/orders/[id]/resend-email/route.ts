import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems, files, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.arafacriou.com.br';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Buscar pedido completo
    const orderRes = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (orderRes.length === 0) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 });
    }

    type OrderRow = {
      id: string;
      email: string;
      status?: string | null;
      total: string;
      currency: string;
      createdAt: string | Date;
      accessDays?: number | null;
    };

    const order = orderRes[0] as OrderRow;

    // Buscar itens do pedido
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    if (items.length === 0) {
      return NextResponse.json({ message: 'Pedido sem itens' }, { status: 400 });
    }

    // Build products with persistent download URLs (não expiram)
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

        // Usar links persistentes via API (gera URL fresca a cada clique)
        let downloadUrl = '';
        let downloadUrls: Array<{ name: string; url: string }> = [];
        const fileCount = itemFiles.length;

        if (itemFiles.length > 1) {
          // Múltiplos arquivos: link para API que gera ZIP dinamicamente
          downloadUrl = `${SITE_URL}/api/orders/download?orderId=${order.id}&itemId=${item.id}`;
          downloadUrls = [];
        } else if (itemFiles.length === 1) {
          // Arquivo único: link para API que gera URL fresca
          const fileId = itemFiles[0].id;
          downloadUrl = `${SITE_URL}/api/orders/download?orderId=${order.id}&itemId=${item.id}&fileId=${fileId}`;
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
          name: item.name || 'Produto',
          variationName,
          downloadUrl,
          downloadUrls,
          fileCount,
          price: parseFloat(item.price),
        };
      })
    );

    // Render and send email
    const emailHtml = await render(
      PurchaseConfirmationEmail({
        customerName: order.email.split('@')[0],
        orderId: order.id,
        orderDate: new Date(order.createdAt).toLocaleDateString('pt-BR'),
        products,
        totalAmount: parseFloat(order.total),
        currency: order.currency || 'BRL',
        accessDays: order.accessDays || 30,
      })
    );

    await sendEmail({
      to: order.email,
      subject: `Reenvio - Confirmação de Compra #${order.id.slice(0, 8)}`,
      html: emailHtml,
    });

    return NextResponse.json({
      message: 'Email reenviado com sucesso',
      sentTo: order.email,
    });
  } catch (error) {
    console.error('Erro ao reenviar email:', error);
    return NextResponse.json(
      { message: 'Erro ao reenviar email', error: String(error) },
      { status: 500 }
    );
  }
}
