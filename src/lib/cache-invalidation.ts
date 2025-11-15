/**
 * Utilitário para invalidação de cache
 * Usa Upstash Redis para controlar invalidação sem sobrecarregar banco
 */

import { getRedis, cacheInvalidatePattern } from '@/lib/cache/upstash';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Invalida cache de produtos
 * - Remove entradas do Redis
 * - Revalida páginas Next.js relevantes
 */
export async function invalidateProductsCache() {
  try {
    // Invalidar todas as chaves de produtos no Redis
    await cacheInvalidatePattern('products:*');

    // Revalidar páginas Next.js
    revalidatePath('/', 'page'); // Home
    revalidatePath('/produtos', 'page'); // Listagem de produtos
    revalidateTag('products'); // Tag para ISR

    console.log('[CACHE INVALIDATION] Products cache cleared and pages revalidated');

    return { success: true };
  } catch (error) {
    console.error('[CACHE INVALIDATION] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Invalida cache de um produto específico
 */
export async function invalidateProductCache(productId: string, slug: string) {
  try {
    const redis = getRedis();

    if (redis) {
      // Buscar chaves relacionadas ao produto específico
      const keys = await redis.keys(`product:${productId}:*`);
      const slugKeys = await redis.keys(`product:slug:${slug}:*`);

      const allKeys = [...keys, ...slugKeys];

      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        console.log(
          `[CACHE INVALIDATION] Removed ${allKeys.length} cache entries for product ${productId}`
        );
      }
    }

    // Revalidar página do produto
    revalidatePath(`/produtos/${slug}`, 'page');
    revalidateTag(`product-${productId}`);

    // Também invalida listas de produtos (pode estar em featured, etc)
    await invalidateProductsCache();

    return { success: true };
  } catch (error) {
    console.error('[CACHE INVALIDATION] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Invalida cache de categorias
 */
export async function invalidateCategoriesCache() {
  try {
    await cacheInvalidatePattern('categories:*');

    revalidatePath('/categorias', 'page');
    revalidateTag('categories');

    console.log('[CACHE INVALIDATION] Categories cache cleared');

    return { success: true };
  } catch (error) {
    console.error('[CACHE INVALIDATION] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Invalida todo o cache (use com cuidado!)
 */
export async function invalidateAllCache() {
  try {
    const redis = getRedis();

    if (redis) {
      await redis.flushdb();
      console.log('[CACHE INVALIDATION] All Redis cache cleared');
    }

    // Revalidar todas as páginas principais
    revalidatePath('/', 'layout'); // Revalida tudo

    return { success: true };
  } catch (error) {
    console.error('[CACHE INVALIDATION] Error:', error);
    return { success: false, error: String(error) };
  }
}
