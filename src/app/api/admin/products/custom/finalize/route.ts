import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  products,
  files,
  orderItems,
  orders,
  downloadPermissions,
  productVariations,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.arafacriou.com.br';

/**
 * Finaliza a criação do produto personalizado após upload direto ao R2
 * POST /api/admin/products/custom/finalize
 *
 * Body: {
 *   name: string,
 *   price: string,
 *   description?: string,
 *   orderId: string,
 *   userEmail: string,
 *   r2Key: string,
 *   fileName: string,
 *   fileSize: number,
 *   fileType: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, price, description, orderId, userEmail, r2Key, fileName, fileSize, fileType } =
      body;

    console.log('📦 [Finalize] Produto Personalizado - Dados recebidos:', {
      name,
      price,
      orderId,
      userEmail,
      r2Key,
      fileName,
    });

    // Validações
    if (!name || !price || !orderId || !userEmail || !r2Key || !fileName) {
      return NextResponse.json({ message: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({ message: 'Preço inválido' }, { status: 400 });
    }

    // Buscar pedido
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 });
    }

    // Extrair productId do r2Key (formato: products/{productId}/{fileName})
    const productIdFromKey = r2Key.split('/')[1];

    // Gerar slug único
    const slug = `custom-${productIdFromKey}`;

    // Criar produto (INATIVO - não aparece no catálogo)
    const [product] = await db
      .insert(products)
      .values({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        shortDescription: 'Produto personalizado',
        categoryId: null,
        isActive: false,
        isFeatured: false,
        seoTitle: null,
        seoDescription: null,
      })
      .returning();

    if (!product) {
      return NextResponse.json({ message: 'Erro ao criar produto' }, { status: 500 });
    }

    // Criar variação padrão com o preço
    const [variation] = await db
      .insert(productVariations)
      .values({
        productId: product.id,
        name: 'Padrão',
        slug: 'padrao',
        price: priceNum.toString(),
        isActive: true,
        sortOrder: 0,
      })
      .returning();

    if (!variation) {
      return NextResponse.json({ message: 'Erro ao criar variação do produto' }, { status: 500 });
    }

    // Criar registro do arquivo vinculado à variação
    const [file] = await db
      .insert(files)
      .values({
        productId: product.id,
        variationId: variation.id,
        name: fileName,
        originalName: fileName,
        path: r2Key,
        size: fileSize || 0,
        mimeType: fileType || 'application/pdf',
      })
      .returning();

    if (!file) {
      return NextResponse.json({ message: 'Erro ao salvar arquivo' }, { status: 500 });
    }

    // Criar item no pedido
    const quantity = 1;
    const itemTotal = priceNum * quantity;

    const [orderItem] = await db
      .insert(orderItems)
      .values({
        orderId: order.id,
        productId: product.id,
        variationId: variation.id,
        name: product.name,
        price: price,
        quantity,
        total: itemTotal.toString(),
      })
      .returning();

    if (!orderItem) {
      return NextResponse.json({ message: 'Erro ao adicionar item ao pedido' }, { status: 500 });
    }

    // Recalcular total do pedido
    const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const newSubtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const discountAmount = parseFloat(order.discountAmount || '0');
    const newTotal = newSubtotal - discountAmount;

    // Atualizar totais do pedido
    await db
      .update(orders)
      .set({
        subtotal: newSubtotal.toString(),
        total: newTotal.toString(),
      })
      .where(eq(orders.id, orderId));

    // Criar permissão de download
    await db.insert(downloadPermissions).values({
      userId: order.userId,
      orderId: order.id,
      productId: product.id,
      orderItemId: orderItem.id,
      downloadsRemaining: null, // Ilimitado
      accessExpiresAt: null, // Nunca expira
    });

    // Gerar URL de download persistente (não expira)
    const downloadUrl = `${SITE_URL}/api/orders/download?orderId=${order.id}&itemId=${orderItem.id}&fileId=${file.id}`;

    // Enviar email ao cliente
    try {
      const emailHtml = await render(
        PurchaseConfirmationEmail({
          customerName: userEmail.split('@')[0],
          orderId: order.id,
          orderDate: new Date(order.createdAt).toLocaleDateString('pt-BR'),
          products: [
            {
              name: product.name,
              downloadUrl,
              downloadUrls: [{ name: fileName, url: downloadUrl }],
              fileCount: 1,
              price: priceNum,
            },
          ],
          totalAmount: newTotal,
          currency: order.currency || 'BRL',
          accessDays: order.accessDays || 30,
        })
      );

      await sendEmail({
        to: userEmail,
        subject: `Novo Produto Adicionado ao Pedido #${order.id.slice(0, 8)}`,
        html: emailHtml,
      });

      console.log('📧 [Finalize] Email enviado para:', userEmail);
    } catch (emailError) {
      console.error('⚠️ [Finalize] Erro ao enviar email:', emailError);
      // Não falhar por causa do email
    }

    console.log('✅ [Finalize] Produto personalizado criado com sucesso:', product.id);

    return NextResponse.json({
      message: 'Produto personalizado criado com sucesso',
      product: {
        id: product.id,
        name: product.name,
        price: variation.price,
        isActive: product.isActive,
      },
      orderItem: {
        id: orderItem.id,
        total: orderItem.total,
      },
      order: {
        subtotal: newSubtotal.toString(),
        total: newTotal.toString(),
      },
      emailSent: true,
    });
  } catch (error) {
    console.error('❌ [Finalize] Erro ao criar produto personalizado:', error);
    return NextResponse.json(
      { message: 'Erro ao criar produto personalizado', error: String(error) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
