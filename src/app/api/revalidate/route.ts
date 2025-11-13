import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { cacheInvalidatePattern } from '@/lib/cache/upstash';

/**
 * 🔄 API para revalidação manual de cache
 * 
 * Uso:
 * POST /api/revalidate?secret=xxx&path=/
 * 
 * Invalida tanto o cache Redis quanto o cache do Next.js
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const path = searchParams.get('path') || '/';
  const tag = searchParams.get('tag');

  // Verificar secret (prevenir abuso)
  const expectedSecret = process.env.REVALIDATE_SECRET || 'dev-secret';
  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Invalid secret' },
      { status: 401 }
    );
  }

  try {
    // Invalidar Redis cache
    await cacheInvalidatePattern('products:*');

    // Revalidar path do Next.js
    revalidatePath(path);

    // Revalidar tag se fornecido
    if (tag) {
      revalidateTag(tag);
    }

    return NextResponse.json({
      message: 'Revalidated successfully',
      path,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET para facilitar teste manual
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
