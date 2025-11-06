import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  users,
  products,
  productVariations,
  downloads,
  files,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Taxas de câmbio fixas (BRL como base)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.65,
  EUR: 6.1,
};

// Função para converter valores para BRL
function convertToBRL(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Buscar pedido com informações do usuário
    const [orderData] = await db
      .select({
        order: orders,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!orderData) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Buscar itens do pedido com detalhes dos produtos
    const items = await db
      .select({
        item: orderItems,
        product: products,
        variation: productVariations,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(productVariations, eq(orderItems.variationId, productVariations.id))
      .where(eq(orderItems.orderId, id));

    // Buscar downloads/PDFs enviados ao cliente
    const pdfDownloads = await db
      .select({
        download: downloads,
        file: files,
      })
      .from(downloads)
      .innerJoin(files, eq(downloads.fileId, files.id))
      .where(eq(downloads.orderId, id));

    // Buscar arquivos de cada item do pedido
    const itemsWithFiles = await Promise.all(
      items.map(async ({ item, product, variation }) => {
        // Buscar arquivos (priorizar variação, fallback para produto)
        let itemFiles = item.variationId
          ? await db.select().from(files).where(eq(files.variationId, item.variationId))
          : await db.select().from(files).where(eq(files.productId, item.productId));

        // Se não encontrou arquivos na variação, buscar do produto
        if (itemFiles.length === 0 && item.variationId) {
          itemFiles = await db.select().from(files).where(eq(files.productId, item.productId));
        }

        return {
          ...item,
          productName: product?.name,
          variationName: variation?.name,
          productId: item.productId,
          variationId: item.variationId,
          files: itemFiles.map(f => ({
            id: f.id,
            path: f.path,
            originalName: f.originalName,
          })),
        };
      })
    );

    // Calcular conversão para BRL se necessário
    const order = orderData.order;
    const currency = order.currency || 'BRL';
    const totalBRL =
      currency !== 'BRL'
        ? convertToBRL(parseFloat(order.total), currency)
        : parseFloat(order.total);

    return NextResponse.json({
      ...order,
      totalBRL: parseFloat(totalBRL.toFixed(2)),
      exchangeRate: EXCHANGE_RATES[currency],
      user: orderData.user,
      items: itemsWithFiles,
      pdfs: pdfDownloads.map(({ download, file }) => ({
        id: file.id,
        name: file.originalName,
        downloadedAt: download.downloadedAt,
        downloadCount: 1, // pode ser melhorado para contar múltiplos downloads
        path: file.path,
        productId: file.productId,
        variationId: file.variationId,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['pending', 'processing', 'completed', 'cancelled', 'refunded'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
