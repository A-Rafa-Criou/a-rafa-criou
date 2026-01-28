import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateFileAccess, affiliates, products, orders } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

/**
 * GET /api/admin/affiliates/file-access
 *
 * Lista todos os acessos a arquivos de afiliados com licença comercial
 * Mostra quantas vezes cada afiliado visualizou e imprimiu
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os acessos com informações do afiliado e produto
    const fileAccesses = await db
      .select({
        // Acesso
        accessId: affiliateFileAccess.id,
        grantedAt: affiliateFileAccess.grantedAt,
        expiresAt: affiliateFileAccess.expiresAt,
        isActive: affiliateFileAccess.isActive,
        viewCount: affiliateFileAccess.viewCount,
        printCount: affiliateFileAccess.printCount,
        lastAccessedAt: affiliateFileAccess.lastAccessedAt,

        // Comprador
        buyerName: affiliateFileAccess.buyerName,
        buyerEmail: affiliateFileAccess.buyerEmail,
        buyerPhone: affiliateFileAccess.buyerPhone,

        // Afiliado
        affiliateId: affiliates.id,
        affiliateName: affiliates.name,
        affiliateEmail: affiliates.email,
        affiliateType: affiliates.affiliateType,

        // Produto
        productId: products.id,
        productName: products.name,

        // Pedido
        orderId: orders.id,
        orderTotal: orders.total,
        orderCurrency: orders.currency,
      })
      .from(affiliateFileAccess)
      .innerJoin(affiliates, eq(affiliateFileAccess.affiliateId, affiliates.id))
      .innerJoin(products, eq(affiliateFileAccess.productId, products.id))
      .innerJoin(orders, eq(affiliateFileAccess.orderId, orders.id))
      .orderBy(desc(affiliateFileAccess.grantedAt));

    // Calcular estatísticas gerais
    const stats = {
      totalAccesses: fileAccesses.length,
      activeAccesses: fileAccesses.filter(a => a.isActive && new Date(a.expiresAt) > new Date())
        .length,
      expiredAccesses: fileAccesses.filter(a => !a.isActive || new Date(a.expiresAt) <= new Date())
        .length,
      totalViews: fileAccesses.reduce((sum, a) => sum + (a.viewCount || 0), 0),
      totalPrints: fileAccesses.reduce((sum, a) => sum + (a.printCount || 0), 0),
    };

    // Agrupar por afiliado para ver quem está imprimindo mais
    const byAffiliate = fileAccesses.reduce((acc: any, access) => {
      const key = access.affiliateId;
      if (!acc[key]) {
        acc[key] = {
          affiliateId: access.affiliateId,
          affiliateName: access.affiliateName,
          affiliateEmail: access.affiliateEmail,
          totalAccesses: 0,
          totalViews: 0,
          totalPrints: 0,
          accesses: [],
        };
      }
      acc[key].totalAccesses++;
      acc[key].totalViews += access.viewCount || 0;
      acc[key].totalPrints += access.printCount || 0;
      acc[key].accesses.push({
        accessId: access.accessId,
        productName: access.productName,
        buyerName: access.buyerName,
        buyerEmail: access.buyerEmail,
        viewCount: access.viewCount,
        printCount: access.printCount,
        grantedAt: access.grantedAt,
        expiresAt: access.expiresAt,
        lastAccessedAt: access.lastAccessedAt,
        expired: new Date(access.expiresAt) <= new Date(),
      });
      return acc;
    }, {});

    const affiliatesData = Object.values(byAffiliate).sort(
      (a: any, b: any) => b.totalPrints - a.totalPrints // Ordenar por quem imprime mais
    );

    return NextResponse.json({
      stats,
      affiliates: affiliatesData,
      allAccesses: fileAccesses.map(a => ({
        ...a,
        expired: new Date(a.expiresAt) <= new Date(),
      })),
    });
  } catch (error) {
    console.error('Error fetching file access data:', error);
    return NextResponse.json({ message: 'Erro ao buscar dados de acesso' }, { status: 500 });
  }
}
