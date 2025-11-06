import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { cartItems, products, productVariations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET - Buscar carrinho do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] })
    }

    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variationId: cartItems.variationId,
        quantity: cartItems.quantity,
        price: cartItems.price,
        productName: products.name,
        productSlug: products.slug,
        variationName: productVariations.name,
        variationPrice: productVariations.price,
        createdAt: cartItems.createdAt,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariations, eq(cartItems.variationId, productVariations.id))
      .where(eq(cartItems.userId, session.user.id))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error)
    return NextResponse.json({ error: 'Erro ao buscar carrinho' }, { status: 500 })
  }
}

// POST - Adicionar item ao carrinho
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
    const { productId, variationId, quantity = 1, price } = body

    if (!productId || !price) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const whereConditions = [
      eq(cartItems.userId, session.user.id),
      eq(cartItems.productId, productId),
    ]
    
    if (variationId) {
      whereConditions.push(eq(cartItems.variationId, variationId))
    }

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(...whereConditions))
      .limit(1)

    if (existing.length > 0) {
      // Atualizar quantidade
      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: existing[0].quantity + quantity,
          price: price.toString(),
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing[0].id))
        .returning()

      return NextResponse.json({ item: updated })
    }

    // Criar novo
    const [item] = await db
      .insert(cartItems)
      .values({
        userId: session.user.id,
        productId,
        variationId: variationId || null,
        quantity,
        price: price.toString(),
      })
      .returning()

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar ao carrinho' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar item do carrinho
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { itemId, quantity, price } = body

    if (!itemId) {
      return NextResponse.json({ error: 'ID do item obrigatório' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (quantity !== undefined) updates.quantity = quantity
    if (price !== undefined) updates.price = price.toString()

    const [updated] = await db
      .update(cartItems)
      .set(updates)
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.userId, session.user.id)
        )
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('Erro ao atualizar carrinho:', error)
    return NextResponse.json({ error: 'Erro ao atualizar carrinho' }, { status: 500 })
  }
}

// DELETE - Remover item do carrinho
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
    const itemId = searchParams.get('itemId')
    const clearAll = searchParams.get('clearAll') === 'true'

    if (clearAll) {
      // Limpar todo o carrinho
      await db
        .delete(cartItems)
        .where(eq(cartItems.userId, session.user.id))

      return NextResponse.json({ message: 'Carrinho limpo' })
    }

    if (!itemId) {
      return NextResponse.json({ error: 'ID do item obrigatório' }, { status: 400 })
    }

    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.userId, session.user.id)
        )
      )

    return NextResponse.json({ message: 'Item removido' })
  } catch (error) {
    console.error('Erro ao remover do carrinho:', error)
    return NextResponse.json({ error: 'Erro ao remover do carrinho' }, { status: 500 })
  }
}
