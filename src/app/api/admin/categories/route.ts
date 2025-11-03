import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, categoryI18n } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { translateCategory, generateSlug } from '@/lib/deepl';

// GET /api/admin/categories - Listar categorias
export async function GET() {
  try {
    const categoriesList = await db.select().from(categories).orderBy(desc(categories.createdAt));

    return NextResponse.json({
      categories: categoriesList,
      total: categoriesList.length,
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/admin/categories - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    // Gerar slug
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Verificar se slug já existe
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existingCategory.length > 0) {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome' }, { status: 400 });
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      })
      .returning();

    // ✅ AUTO-TRADUÇÃO: Criar registros i18n para PT, EN e ES
    // 1. Inserir PT (fonte)
    await db.insert(categoryI18n).values({
      categoryId: newCategory.id,
      locale: 'pt',
      name: newCategory.name,
      slug: newCategory.slug,
      description: newCategory.description,
      seoTitle: newCategory.name,
      seoDescription: newCategory.description,
    }).onConflictDoNothing();

    // 2. Traduzir e inserir EN/ES (apenas se DEEPL_API_KEY estiver configurada)
    if (process.env.DEEPL_API_KEY) {
      try {
        // Traduzir para EN
        const enTranslation = await translateCategory(
          {
            name: newCategory.name,
            description: newCategory.description,
          },
          'EN',
          'PT'
        );

        await db.insert(categoryI18n).values({
          categoryId: newCategory.id,
          locale: 'en',
          name: enTranslation.name,
          slug: generateSlug(enTranslation.name),
          description: enTranslation.description,
          seoTitle: enTranslation.name,
          seoDescription: enTranslation.description,
        }).onConflictDoNothing();

        // Traduzir para ES
        const esTranslation = await translateCategory(
          {
            name: newCategory.name,
            description: newCategory.description,
          },
          'ES',
          'PT'
        );

        await db.insert(categoryI18n).values({
          categoryId: newCategory.id,
          locale: 'es',
          name: esTranslation.name,
          slug: generateSlug(esTranslation.name),
          description: esTranslation.description,
          seoTitle: esTranslation.name,
          seoDescription: esTranslation.description,
        }).onConflictDoNothing();

        console.log(`✅ Categoria "${newCategory.name}" traduzida para EN/ES automaticamente`);
      } catch (error) {
        console.error('⚠️ Erro ao auto-traduzir categoria:', error);
        // Não falhar a criação da categoria, apenas logar o erro
      }
    }

    return NextResponse.json(newCategory, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
