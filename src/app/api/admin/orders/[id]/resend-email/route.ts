import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems, files, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { resend, FROM_EMAIL } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';

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
      createdAt: string | Date;
    };

    const order = orderRes[0] as OrderRow;

    // Buscar itens do pedido
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    if (items.length === 0) {
      return NextResponse.json({ message: 'Pedido sem itens' }, { status: 400 });
    }

    // Build products with download URLs - BUSCAR TODOS OS ARQUIVOS DA VARIAÇÃO/PRODUTO
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
          itemFiles.map(async file => ({
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
          name: item.name || 'Produto',
          variationName,
          downloadUrl, // URL do primeiro arquivo (para compatibilidade com template antigo)
          downloadUrls, // Todos os arquivos
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
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
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
