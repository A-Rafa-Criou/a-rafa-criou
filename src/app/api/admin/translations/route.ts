import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { products, productI18n } from '@/lib/db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { generateSlug } from '@/lib/deepl';

/**
 * GET /api/admin/translations
 * Lista produtos com suas traduções
 * Query params: locale (es|en), search, page, limit
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'es';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    // Buscar produtos com suas traduções
    let query = db
      .select({
        productId: products.id,
        ptName: products.name,
        ptSlug: products.slug,
        translatedName: productI18n.name,
        translatedSlug: productI18n.slug,
        translatedDescription: productI18n.description,
        translatedShortDescription: productI18n.shortDescription,
        locale: productI18n.locale,
        isActive: products.isActive,
      })
      .from(products)
      .leftJoin(
        productI18n,
        and(eq(products.id, productI18n.productId), eq(productI18n.locale, locale))
      )
      .orderBy(products.name)
      .limit(limit)
      .offset(offset);

    if (search) {
      query = query.where(
        or(like(products.name, `%${search}%`), like(productI18n.name, `%${search}%`))
      ) as typeof query;
    }

    const data = await query;

    // Contar total
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(products);

    return NextResponse.json({
      products: data,
      total: Number(countResult.count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult.count) / limit),
    });
  } catch (error) {
    console.error('Erro ao buscar traduções:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/translations
 * Atualiza tradução de um produto
 * Body: { productId, locale, name, description?, shortDescription? }
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, locale, name, description, shortDescription } = body;

    if (!productId || !locale || !name) {
      return NextResponse.json(
        { error: 'productId, locale e name são obrigatórios' },
        { status: 400 }
      );
    }

    const slug = generateSlug(name);

    // Verificar se já existe tradução
    const [existing] = await db
      .select()
      .from(productI18n)
      .where(and(eq(productI18n.productId, productId), eq(productI18n.locale, locale)))
      .limit(1);

    if (existing) {
      // Atualizar existente
      await db
        .update(productI18n)
        .set({
          name,
          slug,
          description: description ?? existing.description,
          shortDescription: shortDescription ?? existing.shortDescription,
          seoTitle: name,
          seoDescription: description ?? existing.seoDescription,
          updatedAt: new Date(),
        })
        .where(and(eq(productI18n.productId, productId), eq(productI18n.locale, locale)));
    } else {
      // Criar nova tradução
      await db.insert(productI18n).values({
        productId,
        locale,
        name,
        slug,
        description: description || null,
        shortDescription: shortDescription || null,
        seoTitle: name,
        seoDescription: description || null,
      });
    }

    return NextResponse.json({ success: true, name, slug });
  } catch (error) {
    console.error('Erro ao atualizar tradução:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
