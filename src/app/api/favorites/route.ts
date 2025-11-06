import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { favorites, products } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET - Buscar favoritos do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ favorites: [] })
    }

    const userFavorites = await db
      .select({
        id: favorites.id,
        productId: favorites.productId,
        productName: products.name,
        productSlug: products.slug,
        createdAt: favorites.createdAt,
      })
      .from(favorites)
      .leftJoin(products, eq(favorites.productId, products.id))
      .where(eq(favorites.userId, session.user.id))

    return NextResponse.json({ favorites: userFavorites })
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error)
    return NextResponse.json({ error: 'Erro ao buscar favoritos' }, { status: 500 })
  }
}

// POST - Adicionar favorito
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const existing = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.productId, productId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ favorite: existing[0] })
    }

    // Criar novo
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId: session.user.id,
        productId,
      })
      .returning()

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar favorito' },
      { status: 500 }
    )
  }
}

// DELETE - Remover favorito
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'ID do produto obrigatório' },
        { status: 400 }
      )
    }

    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.productId, productId)
        )
      )

    return NextResponse.json({ message: 'Favorito removido' })
  } catch (error) {
    console.error('Erro ao remover favorito:', error)
    return NextResponse.json({ error: 'Erro ao remover favorito' }, { status: 500 })
  }
}
