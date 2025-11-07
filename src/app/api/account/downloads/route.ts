import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  downloadPermissions,
  products,
  productVariations,
  files,
  orders,
  orderItems,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todas as permissões de download ativas do usuário
    const permissions = await db
      .select({
        id: downloadPermissions.id,
        productId: downloadPermissions.productId,
        orderId: downloadPermissions.orderId,
        downloadsRemaining: downloadPermissions.downloadsRemaining,
        downloadLimit: downloadPermissions.downloadLimit,
        downloadCount: downloadPermissions.downloadCount,
        accessGrantedAt: downloadPermissions.accessGrantedAt,
        accessExpiresAt: downloadPermissions.accessExpiresAt,
        watermarkEnabled: downloadPermissions.watermarkEnabled,
        // Produto
        productName: products.name,
        productSlug: products.slug,
        // Variação do item do pedido
        variationId: orderItems.variationId,
        variationName: productVariations.name,
        // Pedido
        orderStatus: orders.status,
        orderTotal: orders.total,
        orderCurrency: orders.currency,
        orderCreatedAt: orders.createdAt,
      })
      .from(downloadPermissions)
      .innerJoin(products, eq(downloadPermissions.productId, products.id))
      .innerJoin(orders, eq(downloadPermissions.orderId, orders.id))
      .innerJoin(orderItems, eq(downloadPermissions.orderItemId, orderItems.id))
      .leftJoin(productVariations, eq(orderItems.variationId, productVariations.id))
      .where(
        and(
          eq(downloadPermissions.userId, session.user.id),
          eq(orders.status, 'completed') // Apenas pedidos completados
        )
      )
      .orderBy(downloadPermissions.accessGrantedAt);

    // Buscar arquivos disponíveis para cada permissão
    const permissionsWithFiles = await Promise.all(
      permissions.map(async permission => {
        const availableFiles = await db
          .select({
            id: files.id,
            name: files.name,
            originalName: files.originalName,
            mimeType: files.mimeType,
            size: files.size,
          })
          .from(files)
          .where(eq(files.productId, permission.productId))
          .limit(10);

        return {
          ...permission,
          files: availableFiles,
          hasActiveAccess: !permission.accessExpiresAt || permission.accessExpiresAt >= new Date(),
          hasDownloadsRemaining:
            permission.downloadsRemaining === null || permission.downloadsRemaining > 0,
        };
      })
    );

    return NextResponse.json({
      downloads: permissionsWithFiles,
      total: permissionsWithFiles.length,
    });
  } catch (error) {
    console.error('Erro ao buscar downloads:', error);
    return NextResponse.json({ error: 'Erro ao buscar downloads disponíveis' }, { status: 500 });
  }
}
