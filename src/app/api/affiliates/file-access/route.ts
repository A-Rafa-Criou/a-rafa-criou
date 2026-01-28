import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateFileAccess } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/affiliates/file-access
 *
 * Lista todos os acessos temporários a arquivos do afiliado com licença comercial
 * Inclui: status de expiração, dados do comprador, contadores de visualização/impressão
 */
export async function GET() {
  try {
    console.log('[API FILE-ACCESS] Iniciando busca de acessos...');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[API FILE-ACCESS] Usuário não autenticado');
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    console.log('[API FILE-ACCESS] Usuário autenticado:', session.user.id);

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      console.log('[API FILE-ACCESS] Usuário não é afiliado');
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    console.log('[API FILE-ACCESS] Afiliado encontrado:', {
      id: affiliate.id,
      type: affiliate.affiliateType,
    });

    // Verificar se é licença comercial
    if (affiliate.affiliateType !== 'commercial_license') {
      console.log('[API FILE-ACCESS] Tipo de afiliado incorreto:', affiliate.affiliateType);
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

    console.log('[API FILE-ACCESS] Acessos encontrados:', fileAccesses.length);

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
