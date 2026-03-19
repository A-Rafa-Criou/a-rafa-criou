import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateFileAccess } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/affiliates/file-access
 *
 * Lista todos os acessos temporários a arquivos do afiliado com licença comercial
 * Inclui: status de expiração, dados do comprador, contadores de visualização/impressão
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Verificar se é licença comercial
    if (affiliate.affiliateType !== 'commercial_license') {
      return NextResponse.json(
        { message: 'Esta API é exclusiva para afiliados com licença comercial' },
        { status: 403 }
      );
    }

    // Buscar acessos com dados do produto
    const fileAccesses = await db.query.affiliateFileAccess.findMany({
      where: eq(affiliateFileAccess.affiliateId, affiliate.id),
      orderBy: desc(affiliateFileAccess.grantedAt),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
        order: {
          columns: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    // Formatar resposta compatível com CommercialLicenseDashboard
    const now = new Date();
    const formattedAccesses = fileAccesses.map(access => ({
      id: access.id,

      // Status
      isActive: access.isActive,
      expired: now > access.expiresAt,

      // Datas
      grantedAt: access.grantedAt,
      expiresAt: access.expiresAt,
      lastAccessedAt: access.lastAccessedAt,

      // Contadores
      viewCount: access.viewCount,
      printCount: access.printCount,

      // Dados do comprador (formato flat esperado pelo componente)
      buyerName: access.buyerName || 'Cliente',
      buyerEmail: access.buyerEmail,
      buyerPhone: access.buyerPhone || null,

      // Produto (incluir productName diretamente)
      productName: access.product?.name || 'Produto',
      productId: access.product?.id,
      productSlug: access.product?.slug,

      // Pedido
      orderId: access.order?.id,
      orderCreatedAt: access.order?.createdAt,

      // Notas
      notes: access.notes,
    }));

    // Separar em ativos e expirados
    const activeAccesses = formattedAccesses.filter(a => !a.expired && a.isActive);
    const expiredAccesses = formattedAccesses.filter(a => a.expired || !a.isActive);

    return NextResponse.json({
      success: true,
      fileAccess: formattedAccesses, // Corrigido: era "accesses", deve ser "fileAccess"
      activeAccesses, // Separado para facilitar uso no frontend
      expiredAccesses, // Separado para facilitar uso no frontend
      summary: {
        total: formattedAccesses.length,
        active: activeAccesses.length,
        expired: expiredAccesses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching file accesses:', error);
    return NextResponse.json({ message: 'Erro ao buscar acessos aos arquivos' }, { status: 500 });
  }
}
