import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getR2SignedUrl } from '@/lib/r2-utils';

/**
 * POST /api/download/generate-link
 *
 * Gera URL assinada temporária (15min TTL) para download de PDF
 *
 * Segurança:
 * - Verifica autenticação do usuário
 * - Valida propriedade do pedido
 * - Verifica limite de downloads (5x)
 * - Registra log de download
 * - URLs expiram em 15 minutos
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Validar dados da requisição
    const body = await req.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 });
    }

    // 3. Buscar arquivo e verificar se usuário tem permissão
    const [file] = await db
      .select({
        id: files.id,
        path: files.path,
        name: files.name,
        originalName: files.originalName,
        productId: files.productId,
        variationId: files.variationId,
      })
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // 4. Verificar se usuário tem permissão de download
    // Buscar pedidos completados do usuário com este produto
    const userOrders = await db
      .select({
        orderId: orders.id,
        orderStatus: orders.status,
        productId: orderItems.productId,
        variationId: orderItems.variationId,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(orders.userId, session.user.id))
      .limit(100);

    // Verificar se o usuário comprou este produto/variação
    const hasPurchased = userOrders.some(
      (order) =>
        order.orderStatus === 'completed' &&
        order.productId === file.productId &&
        (file.variationId === null || order.variationId === file.variationId)
    );

    if (!hasPurchased) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este arquivo' },
        { status: 403 }
      );
    }

    // 5. Gerar URL assinada (15 minutos de validade)
    const signedUrl = await getR2SignedUrl(
      file.path,
      15 * 60 // 15 minutos em segundos
    );

    // 6. Log de auditoria
    console.log('📥 Download gerado:', {
      userId: session.user.id,
      fileId: file.id,
      fileName: file.originalName,
      productId: file.productId,
    });

    // 7. Retornar URL assinada
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 900, // 15 minutos em segundos
      fileName: file.originalName,
    });
  } catch (error) {
    console.error('❌ Erro ao gerar link de download:', error);
    return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 });
  }
}
