import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, categoryI18n } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { translateCategory, generateSlug } from '@/lib/deepl';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

interface CategoryWithSubcategories {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  icon: string | null;
  sortOrder: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subcategories: CategoryWithSubcategories[];
}

// GET /api/admin/categories - Listar categorias com hierarquia
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todas as categorias
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    // Organizar em hierarquia
    const categoriesMap = new Map<string, CategoryWithSubcategories>();
    const rootCategories: CategoryWithSubcategories[] = [];

    // Primeiro, mapear todas as categorias
    allCategories.forEach(cat => {
      categoriesMap.set(cat.id, { ...cat, subcategories: [] });
    });

    // Depois, construir a hierarquia
    allCategories.forEach(cat => {
      const categoryWithSubs = categoriesMap.get(cat.id);
      if (categoryWithSubs) {
        if (cat.parentId) {
          const parent = categoriesMap.get(cat.parentId);
          if (parent) {
            parent.subcategories.push(categoryWithSubs);
          }
        } else {
          rootCategories.push(categoryWithSubs);
        }
      }
    });

    // Ordenar subcategorias alfabeticamente
    rootCategories.forEach(cat => {
      cat.subcategories.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    });

    return NextResponse.json(rootCategories);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/admin/categories - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, slug: customSlug, parentId, icon, sortOrder, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    // Gerar slug ou usar o customizado
    const slug =
      customSlug ||
      name
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
      return NextResponse.json({ error: 'Já existe uma categoria com este slug' }, { status: 400 });
    }

    // Verificar se parentId existe (se fornecido)
    if (parentId) {
      const parentCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parentId))
        .limit(1);

      if (parentCategory.length === 0) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
      }
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true,
      })
      .returning();

    // ✅ AUTO-TRADUÇÃO: Criar registros i18n para PT, EN e ES
    // 1. Inserir PT (fonte)
    await db
      .insert(categoryI18n)
      .values({
        categoryId: newCategory.id,
        locale: 'pt',
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        seoTitle: newCategory.name,
        seoDescription: newCategory.description,
      })
      .onConflictDoNothing();

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

        await db
          .insert(categoryI18n)
          .values({
            categoryId: newCategory.id,
            locale: 'en',
            name: enTranslation.name,
            slug: generateSlug(enTranslation.name),
            description: enTranslation.description,
            seoTitle: enTranslation.name,
            seoDescription: enTranslation.description,
          })
          .onConflictDoNothing();

        // Traduzir para ES
        const esTranslation = await translateCategory(
          {
            name: newCategory.name,
            description: newCategory.description,
          },
          'ES',
          'PT'
        );

        await db
          .insert(categoryI18n)
          .values({
            categoryId: newCategory.id,
            locale: 'es',
            name: esTranslation.name,
            slug: generateSlug(esTranslation.name),
            description: esTranslation.description,
            seoTitle: esTranslation.name,
            seoDescription: esTranslation.description,
          })
          .onConflictDoNothing();

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
