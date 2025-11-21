import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  coupons,
  couponProducts,
  couponVariations,
  couponRedemptions,
  orders,
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  try {
    const { code, cartItems, cartTotal, userId } = await request.json();

    if (!code || !cartItems || !cartTotal) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar sessão do usuário
    const session = await getServerSession();
    const sessionUserId = (session?.user as { id?: string })?.id || userId || null;

    // Buscar cupom pelo código
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
    }

    // Validar se o cupom está ativo
    if (!coupon.isActive) {
      return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 });
    }

    // Validar datas
    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json({ error: 'Cupom ainda não está válido' }, { status: 400 });
    }

    if (coupon.endsAt && new Date(coupon.endsAt) < now) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 });
    }

    // ✅ VALIDAR RESTRIÇÃO DE EMAIL
    if (
      coupon.allowedEmails &&
      Array.isArray(coupon.allowedEmails) &&
      coupon.allowedEmails.length > 0
    ) {
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json({ error: 'Faça login para usar este cupom' }, { status: 401 });
      }

      if (!coupon.allowedEmails.includes(userEmail)) {
        return NextResponse.json(
          { error: 'Este cupom não está disponível para você' },
          { status: 403 }
        );
      }
    }

    // Validar limite de uso total
    const usedCount = coupon.usedCount || 0;
    if (coupon.maxUses && usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Cupom atingiu o limite de uso' }, { status: 400 });
    }

    // ✅ VALIDAR LIMITE DE USO POR USUÁRIO
    if (sessionUserId && coupon.maxUsesPerUser) {
      // Contar quantas vezes este usuário já usou este cupom
      const userRedemptions = await db
        .select({ count: sql<number>`count(*)` })
        .from(couponRedemptions)
        .where(
          and(
            eq(couponRedemptions.couponId, coupon.id),
            eq(couponRedemptions.userId, sessionUserId)
          )
        );

      const userUsageCount = Number(userRedemptions[0]?.count || 0);

      if (userUsageCount >= coupon.maxUsesPerUser) {
        return NextResponse.json(
          {
            error: `Você já atingiu o limite de ${coupon.maxUsesPerUser} uso${coupon.maxUsesPerUser > 1 ? 's' : ''} deste cupom`,
          },
          { status: 400 }
        );
      }
    }

    // ============================================================
    // VALIDAÇÃO ADICIONAL PARA CUPONS DE 100% - CHECAR RATE LIMITING
    // ============================================================
    if (coupon.type === 'percent' && parseFloat(coupon.value) === 100 && sessionUserId) {
      // Verificar pedidos grátis recentes (rate limiting)
      const recentOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, sessionUserId), eq(orders.paymentProvider, 'free_coupon')));

      // Verificar se algum pedido foi feito nos últimos 60 segundos
      const hasRecentFreeOrder = recentOrders.some(order => {
        if (!order.createdAt) return false;
        const timeDiff = new Date().getTime() - new Date(order.createdAt).getTime();
        return timeDiff < 60000; // 1 minuto
      });

      if (hasRecentFreeOrder) {
        return NextResponse.json(
          { error: 'Aguarde alguns segundos antes de usar outro cupom de 100%' },
          { status: 429 }
        );
      }

      // Verificar quantas vezes já usou ESTE cupom específico
      const userCouponUsage = recentOrders.filter(o => o.couponCode === coupon.code).length;
      const maxAllowed = coupon.maxUsesPerUser || 1;

      if (userCouponUsage >= maxAllowed) {
        return NextResponse.json(
          {
            error: `Você já utilizou este cupom ${userCouponUsage} vez(es). Limite: ${maxAllowed}`,
          },
          { status: 400 }
        );
      }

      // Validação crítica: cupons 100% DEVEM ter lista de emails
      if (!coupon.allowedEmails || coupon.allowedEmails.length === 0) {
        return NextResponse.json(
          { error: 'Este cupom requer configuração especial. Entre em contato com o suporte.' },
          { status: 403 }
        );
      }

      // Validação crítica: apenas 1 produto permitido
      if (cartItems.length > 1) {
        return NextResponse.json(
          {
            error:
              'Cupons de 100% são limitados a 1 produto por pedido. Remova os itens extras do carrinho.',
          },
          { status: 400 }
        );
      }
    }

    // Validar valor mínimo
    if (coupon.minSubtotal && cartTotal < parseFloat(coupon.minSubtotal)) {
      return NextResponse.json(
        {
          error: `Valor mínimo de compra: R$ ${parseFloat(coupon.minSubtotal).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Verificar se o cupom se aplica aos produtos do carrinho
    let discountAmount = 0;
    let applicableItemsTotal = 0;

    // Se o cupom é para produtos ou variações específicas
    if (coupon.appliesTo === 'products' || coupon.appliesTo === 'variations') {
      const couponProductsList = await db
        .select()
        .from(couponProducts)
        .where(eq(couponProducts.couponId, coupon.id));

      const couponVariationsList = await db
        .select()
        .from(couponVariations)
        .where(eq(couponVariations.couponId, coupon.id));

      const applicableProductIds = new Set(couponProductsList.map(cp => cp.productId));
      const applicableVariationIds = new Set(couponVariationsList.map(cv => cv.variationId));

      // Calcular total dos itens aplicáveis
      for (const item of cartItems) {
        const isApplicable =
          applicableProductIds.has(item.productId) ||
          (item.variationId && applicableVariationIds.has(item.variationId));

        if (isApplicable) {
          applicableItemsTotal += item.price * item.quantity;
        }
      }

      if (applicableItemsTotal === 0) {
        return NextResponse.json(
          { error: 'Cupom não se aplica aos produtos do carrinho' },
          { status: 400 }
        );
      }
    } else {
      // Cupom se aplica a todo o carrinho
      applicableItemsTotal = cartTotal;
    }

    // Calcular desconto
    if (coupon.type === 'percent') {
      discountAmount = (applicableItemsTotal * parseFloat(coupon.value)) / 100;
    } else {
      // Desconto fixo
      discountAmount = parseFloat(coupon.value);

      // Desconto não pode ser maior que o total aplicável
      if (discountAmount > applicableItemsTotal) {
        discountAmount = applicableItemsTotal;
      }
    }

    const newTotal = cartTotal - discountAmount;

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount: discountAmount,
      newTotal: Math.max(0, newTotal),
      originalTotal: cartTotal,
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json({ error: 'Erro ao validar cupom' }, { status: 500 });
  }
}
