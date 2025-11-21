import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems, coupons, productVariations, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const freeOrderSchema = z.object({
  couponCode: z.string(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variationId: z.string().uuid().optional(),
      quantity: z.number().int().positive(),
      attributes: z.array(z.any()).optional(),
    })
  ),
  currency: z.enum(['BRL', 'USD', 'EUR', 'MXN']),
});

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // CAMADA 1: AUTENTICAÇÃO OBRIGATÓRIA
    // ============================================================
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // ============================================================
    // CAMADA 2: RATE LIMITING - Prevenir abuso
    // ============================================================
    // Verificar tentativas recentes deste usuário
    const recentAttempts = await db.select().from(orders).where(eq(orders.userId, session.user.id));

    const recentFreeOrders = recentAttempts.filter(
      o =>
        o.paymentProvider === 'free_coupon' &&
        o.createdAt &&
        new Date().getTime() - new Date(o.createdAt).getTime() < 60000 // 1 minuto
    );

    if (recentFreeOrders.length > 0) {
      return NextResponse.json(
        { error: 'Aguarde alguns segundos antes de fazer outro pedido gratuito' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = freeOrderSchema.parse(body);

    // ============================================================
    // CAMADA 3: VALIDAÇÃO ESTRITA DO CUPOM
    // ============================================================
    // Verificar cupom 100%
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, validatedData.couponCode.toUpperCase()))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom inválido' }, { status: 400 });
    }

    // CRÍTICO: Verificar se é EXATAMENTE 100% de desconto
    const couponValueNumber = parseFloat(coupon.value);
    if (coupon.type !== 'percent' || couponValueNumber !== 100) {
      // Log de tentativa de acesso não autorizado
      console.warn('⚠️ SEGURANÇA: Tentativa de usar endpoint free com cupom não-100%', {
        userId: session.user.id,
        email: session.user.email,
        couponCode: coupon.code,
        couponType: coupon.type,
        couponValue: coupon.value,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'Este cupom não oferece desconto de 100%' },
        { status: 400 }
      );
    }

    // Verificar se cupom está ativo
    if (!coupon.isActive) {
      return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 });
    }

    // Verificar datas de validade
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
      return NextResponse.json({ error: 'Cupom ainda não está válido' }, { status: 400 });
    }

    if (coupon.endsAt && new Date(coupon.endsAt) < new Date()) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 });
    }

    // ============================================================
    // CAMADA 4: RESTRIÇÃO DE EMAIL OBRIGATÓRIA
    // ============================================================
    // SEGURANÇA CRÍTICA: Apenas cupons com lista de emails permitidos
    if (!coupon.allowedEmails || coupon.allowedEmails.length === 0) {
      console.error('🚨 SEGURANÇA: Tentativa de usar cupom 100% sem restrição de email', {
        userId: session.user.id,
        couponCode: coupon.code,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'Este cupom requer configuração de emails permitidos' },
        { status: 403 }
      );
    }

    // Verificar se o email do usuário está na lista de permitidos
    const userEmail = session.user.email?.toLowerCase();
    const allowedEmails = coupon.allowedEmails.map(e => e.toLowerCase());

    if (!userEmail || !allowedEmails.includes(userEmail)) {
      console.warn('⚠️ SEGURANÇA: Email não autorizado tentou usar cupom 100%', {
        userId: session.user.id,
        userEmail,
        couponCode: coupon.code,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'Este cupom não está disponível para você' },
        { status: 403 }
      );
    }

    // ============================================================
    // CAMADA 5: LIMITES DE PRODUTO E QUANTIDADE
    // ============================================================
    // LIMITAR A 1 PRODUTO quando cupom for 100%
    if (validatedData.items.length > 1) {
      return NextResponse.json(
        { error: 'Cupons de 100% de desconto permitem apenas 1 produto por pedido' },
        { status: 400 }
      );
    }

    // Validação extra: garantir que apenas 1 unidade é solicitada
    if (validatedData.items[0].quantity !== 1) {
      console.warn('⚠️ SEGURANÇA: Tentativa de quantidade > 1 com cupom 100%', {
        userId: session.user.id,
        quantity: validatedData.items[0].quantity,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'Cupons de 100% permitem apenas 1 unidade do produto' },
        { status: 400 }
      );
    }

    // Verificar limite de usos
    if (coupon.maxUses !== null) {
      const [usageCount] = await db.select().from(orders).where(eq(orders.couponCode, coupon.code));

      if (usageCount && (coupon.usedCount || 0) >= coupon.maxUses) {
        return NextResponse.json({ error: 'Cupom atingiu o limite de usos' }, { status: 400 });
      }
    }

    // Verificar limite de usos por usuário
    const userOrders = await db.select().from(orders).where(eq(orders.userId, session.user.id));

    const userCouponUsage = userOrders.filter(o => o.couponCode === coupon.code).length;

    if (userCouponUsage >= (coupon.maxUsesPerUser || 1)) {
      return NextResponse.json(
        { error: 'Você já atingiu o limite de usos deste cupom' },
        { status: 400 }
      );
    }

    // Buscar dados do produto e variação do banco (não confiar no frontend)
    const productId = validatedData.items[0].productId;
    const variationId = validatedData.items[0].variationId;

    if (!variationId) {
      return NextResponse.json({ error: 'Variação do produto não especificada' }, { status: 400 });
    }

    // Buscar variação do banco para obter preço real e validar produto
    const [productVariation] = await db
      .select({
        variationId: productVariations.id,
        variationName: productVariations.name,
        price: productVariations.price,
        productId: products.id,
        productName: products.name,
      })
      .from(productVariations)
      .innerJoin(products, eq(productVariations.productId, products.id))
      .where(eq(productVariations.id, variationId))
      .limit(1);

    if (!productVariation) {
      return NextResponse.json({ error: 'Produto ou variação não encontrado' }, { status: 404 });
    }

    // Validar que a variação pertence ao produto informado
    if (productVariation.productId !== productId) {
      return NextResponse.json(
        { error: 'Variação não pertence ao produto informado' },
        { status: 400 }
      );
    }

    // Usar preço REAL do banco, não do frontend
    const realPrice = parseFloat(productVariation.price);

    // Criar pedido gratuito
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId: session.user.id,
        email: session.user.email || '',
        total: '0.00',
        subtotal: realPrice.toFixed(2),
        discountAmount: realPrice.toFixed(2),
        currency: validatedData.currency,
        status: 'completed', // ✅ Já marca como completo
        paymentProvider: 'free_coupon',
        paymentId: `free_${coupon.code}_${Date.now()}`,
        paymentStatus: 'paid',
        couponCode: coupon.code,
        paidAt: new Date(),
      })
      .returning();

    // Criar item do pedido com dados reais do banco
    await db.insert(orderItems).values({
      orderId: newOrder.id,
      productId: productId,
      variationId: variationId,
      name: `${productVariation.productName} - ${productVariation.variationName}`,
      price: realPrice.toFixed(2),
      quantity: 1,
      total: '0.00', // Total é zero por ser pedido grátis
    });

    // Atualizar contador de usos do cupom
    await db
      .update(coupons)
      .set({
        usedCount: (coupon.usedCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, coupon.id));

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      message: 'Pedido gratuito criado com sucesso!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar pedido gratuito:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
