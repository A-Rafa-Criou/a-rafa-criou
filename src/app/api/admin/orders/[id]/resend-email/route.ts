import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems, files, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { uploadZipToR2AndGetUrl, createZipFromR2Files } from '@/lib/zip-utils';
import { sendEmail } from '@/lib/email';
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
      accessDays?: number | null;
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
          name: item.name || 'Produto',
          variationName,
          downloadUrl, // URL do ZIP (se múltiplos) ou URL direta (se único)
          downloadUrls, // Array vazio se for ZIP, senão contém o único arquivo
          fileCount, // 🆕 Quantidade de PDFs
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
        accessDays: order.accessDays || 30, // 🆕 Dias de acesso
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
