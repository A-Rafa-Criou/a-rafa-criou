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
import { nanoid } from 'nanoid';
import { uploadToR2 } from '@/lib/r2-utils';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { sendEmail } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Parse FormData
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const price = formData.get('price') as string;
    const description = formData.get('description') as string;
    const orderId = formData.get('orderId') as string;
    const userEmail = formData.get('userEmail') as string;
    const pdfFile = formData.get('pdf') as File;

    console.log('📦 Produto Personalizado - Dados recebidos:', {
      name,
      price,
      orderId,
      userEmail,
      hasPdf: !!pdfFile,
    });

    // Validações
    if (!name || !price || !orderId || !userEmail || !pdfFile) {
      return NextResponse.json(
        {
          message: 'Campos obrigatórios faltando',
        },
        { status: 400 }
      );
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        {
          message: 'Preço inválido',
        },
        { status: 400 }
      );
    }

    console.log('💰 Preço convertido:', priceNum);

    // Validar que é PDF
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json(
        {
          message: 'Apenas arquivos PDF são permitidos',
        },
        { status: 400 }
      );
    }

    // Validar tamanho (50MB)
    if (pdfFile.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        {
          message: 'Arquivo muito grande (máximo 50MB)',
        },
        { status: 400 }
      );
    }

    // Buscar pedido
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json(
        {
          message: 'Pedido não encontrado',
        },
        { status: 404 }
      );
    }

    // Gerar slug único
    const slug = `custom-${nanoid(10)}`;

    // Criar produto (INATIVO - não aparece no catálogo)
    const [product] = await db
      .insert(products)
      .values({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        shortDescription: 'Produto personalizado',
        // Removed: price - now only in variations
        categoryId: null, // Sem categoria
        isActive: false, // INATIVO - não aparece no frontend
        isFeatured: false,
        seoTitle: null,
        seoDescription: null,
      })
      .returning();

    if (!product) {
      return NextResponse.json(
        {
          message: 'Erro ao criar produto',
        },
        { status: 500 }
      );
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
      return NextResponse.json(
        {
          message: 'Erro ao criar variação do produto',
        },
        { status: 500 }
      );
    }

    // Upload do PDF para R2
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    const fileName = `${product.id}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const r2Key = `products/${product.id}/${fileName}`;

    await uploadToR2(r2Key, buffer, pdfFile.type);

    // Criar registro do arquivo vinculado à variação
    const [file] = await db
      .insert(files)
      .values({
        productId: product.id,
        variationId: variation.id,
        name: pdfFile.name,
        originalName: pdfFile.name,
        path: r2Key,
        size: pdfFile.size,
        mimeType: pdfFile.type,
      })
      .returning();

    if (!file) {
      return NextResponse.json(
        {
          message: 'Erro ao salvar arquivo',
        },
        { status: 500 }
      );
    }

    // Criar item no pedido
    const quantity = 1;
    const itemTotal = priceNum * quantity;

    const [orderItem] = await db
      .insert(orderItems)
      .values({
        // id é gerado automaticamente pelo banco (UUID)
        orderId: order.id,
        productId: product.id,
        variationId: variation.id, // Vincular à variação criada
        name: product.name,
        price: price,
        quantity,
        total: itemTotal.toString(),
      })
      .returning();

    if (!orderItem) {
      return NextResponse.json(
        {
          message: 'Erro ao adicionar item ao pedido',
        },
        { status: 500 }
      );
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

    // Gerar URL de download assinada
    const downloadUrl = await getR2SignedUrl(r2Key, 7 * 24 * 60 * 60); // 7 dias

    // Enviar email ao cliente
    const emailHtml = await render(
      PurchaseConfirmationEmail({
        customerName: userEmail.split('@')[0], // Usar parte antes do @
        orderId: order.id,
        orderDate: new Date(order.createdAt).toLocaleDateString('pt-BR'),
        products: [
          {
            name: product.name,
            downloadUrl,
            price: priceNum,
          },
        ],
        totalAmount: newTotal,
      })
    );

    await sendEmail({
      to: userEmail,
      subject: `Novo Produto Adicionado ao Pedido #${order.id.slice(0, 8)}`,
      html: emailHtml,
    });

    return NextResponse.json({
      message: 'Produto personalizado criado com sucesso',
      product: {
        id: product.id,
        name: product.name,
        price: variation.price, // Price from variation
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
    console.error('Erro ao criar produto personalizado:', error);
    return NextResponse.json(
      { message: 'Erro ao criar produto personalizado', error: String(error) },
      { status: 500 }
    );
  }
}

// Configuração para suportar uploads grandes (até 50MB)
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
