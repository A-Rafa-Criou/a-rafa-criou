import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { invalidatePromotionsCache, invalidateProductsCache } from '@/lib/cache-invalidation';

/**
 * Endpoint para limpar todos os caches manualmente (Admin Only)
 * POST /api/admin/cache/clear
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🗑️ [ADMIN] Limpando todos os caches...');

    // Limpar cache de promoções e produtos
    await Promise.all([
      invalidatePromotionsCache(),
      invalidateProductsCache(),
    ]);

    console.log('✅ [ADMIN] Todos os caches foram limpos!');

    return NextResponse.json({
      success: true,
      message: 'Todos os caches foram limpos com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erro ao limpar caches:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar caches', details: String(error) },
      { status: 500 }
    );
  }
}
