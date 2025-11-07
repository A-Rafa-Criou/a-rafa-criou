import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// GET - Buscar categoria específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Buscar subcategorias
    const subcategories = await db.select().from(categories).where(eq(categories.parentId, id));

    return NextResponse.json({
      ...category,
      subcategories,
    });
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    return NextResponse.json({ error: 'Erro ao buscar categoria' }, { status: 500 });
  }
}

// PUT - Atualizar categoria
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, parentId, icon, sortOrder, isActive } = body;

    // Verificar se categoria existe
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existingCategory) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verificar se slug já está sendo usado por outra categoria
    if (slug !== existingCategory.slug) {
      const [duplicateSlug] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (duplicateSlug) {
        return NextResponse.json(
          { error: 'Já existe uma categoria com este slug' },
          { status: 400 }
        );
      }
    }

    // Verificar se não está tentando definir ela mesma como parent (evitar loop)
    if (parentId === id) {
      return NextResponse.json(
        { error: 'Uma categoria não pode ser subcategoria de si mesma' },
        { status: 400 }
      );
    }

    // Verificar se parentId existe (se fornecido)
    if (parentId) {
      const [parentCategory] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parentId))
        .limit(1);

      if (!parentCategory) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 400 });
      }

      // Verificar se a categoria pai não é uma subcategoria desta (evitar loop)
      if (parentCategory.parentId === id) {
        return NextResponse.json(
          { error: 'Não é possível criar referência circular entre categorias' },
          { status: 400 }
        );
      }
    }

    // Atualizar categoria
    const [updatedCategory] = await db
      .update(categories)
      .set({
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

// DELETE - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se categoria existe
    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verificar se há produtos usando esta categoria
    const productsWithCategory = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (productsWithCategory.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir esta categoria pois há produtos vinculados a ela' },
        { status: 400 }
      );
    }

    // Verificar se há subcategorias
    const subcategories = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);

    if (subcategories.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir esta categoria pois há subcategorias vinculadas a ela' },
        { status: 400 }
      );
    }

    // Excluir categoria
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
