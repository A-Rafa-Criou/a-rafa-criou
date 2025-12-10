import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  coupons,
  productVariations,
  products,
  downloadPermissions,
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const freeOrderSchema = z.object({
  couponCode: z.string().optional(), // ✅ Opcional quando produto é gratuito (R$ 0,00)
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
      return NextResponse.json(
        { error: 'Usuário não autenticado', requiresAuth: true },
        { status: 401 }
      );
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
    // CAMADA 3: VALIDAÇÃO - Produto Gratuito OU Cupom 100%
    // ============================================================
    let coupon = null;
    let isFreeProduct = false;

    if (validatedData.couponCode) {
      // FLUXO 1: Cupom 100% de desconto
      const [foundCoupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, validatedData.couponCode.toUpperCase()))
        .limit(1);

      if (!foundCoupon) {
        return NextResponse.json({ error: 'Cupom inválido' }, { status: 400 });
      }

      // CRÍTICO: Verificar se é EXATAMENTE 100% de desconto
      const couponValueNumber = parseFloat(foundCoupon.value);
      if (foundCoupon.type !== 'percent' || couponValueNumber !== 100) {
        // Log de tentativa de acesso não autorizado
        console.warn('⚠️ SEGURANÇA: Tentativa de usar endpoint free com cupom não-100%', {
          userId: session.user.id,
          email: session.user.email,
          couponCode: foundCoupon.code,
          couponType: foundCoupon.type,
          couponValue: foundCoupon.value,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: 'Este cupom não oferece desconto de 100%' },
          { status: 400 }
        );
      }

      // Verificar se cupom está ativo
      if (!foundCoupon.isActive) {
        return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 });
      }

      // Verificar datas de validade
      if (foundCoupon.startsAt && new Date(foundCoupon.startsAt) > new Date()) {
        return NextResponse.json({ error: 'Cupom ainda não está válido' }, { status: 400 });
      }

      if (foundCoupon.endsAt && new Date(foundCoupon.endsAt) < new Date()) {
        return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 });
      }

      // ============================================================
      // CAMADA 4: RESTRIÇÃO DE EMAIL OBRIGATÓRIA (apenas cupom)
      // ============================================================
      // SEGURANÇA CRÍTICA: Apenas cupons com lista de emails permitidos
      if (!foundCoupon.allowedEmails || foundCoupon.allowedEmails.length === 0) {
        console.error('🚨 SEGURANÇA: Tentativa de usar cupom 100% sem restrição de email', {
          userId: session.user.id,
          couponCode: foundCoupon.code,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: 'Este cupom requer configuração de emails permitidos' },
          { status: 403 }
        );
      }

      // Verificar se o email do usuário está na lista de permitidos
      const userEmail = session.user.email?.toLowerCase();
      const allowedEmails = foundCoupon.allowedEmails.map(e => e.toLowerCase());

      if (!userEmail || !allowedEmails.includes(userEmail)) {
        console.warn('⚠️ SEGURANÇA: Email não autorizado tentou usar cupom 100%', {
          userId: session.user.id,
          userEmail,
          couponCode: foundCoupon.code,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: 'Este cupom não está disponível para você' },
          { status: 403 }
        );
      }

      coupon = foundCoupon;
    } else {
      // FLUXO 2: Produto com preço R$ 0,00 (gratuito)
      isFreeProduct = true;
    }

    // ============================================================
    // CAMADA 5: LIMITES DE PRODUTO E QUANTIDADE
    // ============================================================
    if (isFreeProduct) {
      // VALIDAÇÃO PRODUTO GRATUITO
      // Buscar preços reais do banco de dados (NÃO confiar no cliente)
      const variationIds = validatedData.items
        .map(item => item.variationId)
        .filter((id): id is string => Boolean(id));

      if (variationIds.length === 0) {
        return NextResponse.json({ error: 'Nenhuma variação válida encontrada' }, { status: 400 });
      }

      const variations = await db
        .select()
        .from(productVariations)
        .where(inArray(productVariations.id, variationIds));

      // SEGURANÇA CRÍTICA: Verificar se TODOS os itens têm preço 0.00
      const anyPaidItem = variations.some(v => parseFloat(v.price) > 0);

      if (anyPaidItem) {
        console.warn('⚠️ SEGURANÇA: Tentativa de checkout gratuito com itens pagos', {
          userId: session.user.id,
          userEmail: session.user.email,
          items: variations.map(v => ({ id: v.id, price: v.price })),
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: 'Não é possível misturar produtos gratuitos e pagos no mesmo pedido' },
          { status: 400 }
        );
      }

      // LIMITAR A 5 PRODUTOS gratuitos por pedido (evitar abuso)
      if (validatedData.items.length > 5) {
        return NextResponse.json(
          { error: 'Máximo de 5 produtos gratuitos por pedido' },
          { status: 400 }
        );
      }

      // LIMITAR quantidade total (evitar abuso)
      const totalQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity > 5) {
        return NextResponse.json(
          { error: 'Máximo de 5 unidades em pedidos gratuitos' },
          { status: 400 }
        );
      }
    } else {
      // VALIDAÇÃO CUPOM 100%
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

      // Verificar limite de usos do cupom
      if (coupon && coupon.maxUses !== null) {
        const [usageCount] = await db
          .select()
          .from(orders)
          .where(eq(orders.couponCode, coupon.code));

        if (usageCount && (coupon.usedCount || 0) >= coupon.maxUses) {
          return NextResponse.json({ error: 'Cupom atingiu o limite de usos' }, { status: 400 });
        }
      }

      // Verificar limite de usos por usuário
      if (coupon) {
        const userOrders = await db.select().from(orders).where(eq(orders.userId, session.user.id));

        const userCouponUsage = userOrders.filter(o => o.couponCode === coupon.code).length;

        if (userCouponUsage >= (coupon.maxUsesPerUser || 1)) {
          return NextResponse.json(
            { error: 'Você já atingiu o limite de usos deste cupom' },
            { status: 400 }
          );
        }
      }
    }

    // ============================================================
    // CAMADA 6: BUSCAR DADOS DOS PRODUTOS DO BANCO
    // ============================================================
    // Buscar dados de TODOS os produtos e variações do banco (não confiar no frontend)
    const variationIds = validatedData.items
      .map(item => item.variationId)
      .filter((id): id is string => Boolean(id));

    if (variationIds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma variação válida especificada' }, { status: 400 });
    }

    // Buscar todas as variações do banco
    const productVariations_data = await db
      .select({
        variationId: productVariations.id,
        variationName: productVariations.name,
        price: productVariations.price,
        productId: products.id,
        productName: products.name,
      })
      .from(productVariations)
      .innerJoin(products, eq(productVariations.productId, products.id))
      .where(inArray(productVariations.id, variationIds));

    if (productVariations_data.length === 0) {
      return NextResponse.json({ error: 'Produtos ou variações não encontrados' }, { status: 404 });
    }

    // Validar que todas as variações existem
    if (productVariations_data.length !== variationIds.length) {
      return NextResponse.json(
        { error: 'Algumas variações não foram encontradas' },
        { status: 400 }
      );
    }

    // Validar que todas as variações pertencem aos produtos informados
    for (const item of validatedData.items) {
      const variation = productVariations_data.find(v => v.variationId === item.variationId);
      if (variation && variation.productId !== item.productId) {
        return NextResponse.json(
          { error: 'Variação não pertence ao produto informado' },
          { status: 400 }
        );
      }
    }

    // ============================================================
    // CAMADA 7: CRIAR PEDIDO GRATUITO
    // ============================================================
    // Calcular total (deve ser 0.00 em ambos os casos)
    const total = productVariations_data.reduce((sum, variation) => {
      const item = validatedData.items.find(i => i.variationId === variation.variationId);
      const quantity = item?.quantity || 1;
      return sum + parseFloat(variation.price) * quantity;
    }, 0);

    // Validação final: total DEVE ser 0
    if (total !== 0) {
      console.error('🚨 SEGURANÇA: Total do pedido gratuito não é 0', {
        userId: session.user.id,
        total,
        items: productVariations_data,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ error: 'Erro ao processar pedido gratuito' }, { status: 400 });
    }

    // Criar pedido gratuito
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId: session.user.id,
        email: session.user.email || '',
        total: '0.00',
        subtotal: '0.00',
        discountAmount: '0.00',
        currency: validatedData.currency,
        status: 'completed',
        paymentProvider: isFreeProduct ? 'free_product' : 'free_coupon',
        paymentId: isFreeProduct
          ? `free_product_${Date.now()}`
          : `free_coupon_${coupon?.code}_${Date.now()}`,
        paymentStatus: 'paid',
        couponCode: coupon?.code || null,
        paidAt: new Date(),
      })
      .returning();

    // Criar itens do pedido com dados reais do banco
    const orderItemsToInsert = validatedData.items.map(item => {
      const variation = productVariations_data.find(v => v.variationId === item.variationId);
      if (!variation) throw new Error('Variação não encontrada');

      return {
        orderId: newOrder.id,
        productId: item.productId,
        variationId: item.variationId,
        name: `${variation.productName} - ${variation.variationName}`,
        price: variation.price,
        quantity: item.quantity,
        total: '0.00',
      };
    });

    const insertedOrderItems = await db.insert(orderItems).values(orderItemsToInsert).returning();

    // Criar permissões de download para TODOS os itens
    const downloadPermissionsToInsert = insertedOrderItems
      .filter(orderItem => orderItem.productId !== null) // Filtrar nulls
      .map(orderItem => ({
        userId: session.user.id,
        orderId: newOrder.id,
        productId: orderItem.productId as string, // Type assertion após filtro
        orderItemId: orderItem.id,
        downloadsRemaining: null, // Ilimitado
        accessExpiresAt: null, // Nunca expira
      }));

    if (downloadPermissionsToInsert.length > 0) {
      await db.insert(downloadPermissions).values(downloadPermissionsToInsert);
    }

    // Atualizar contador de usos do cupom (apenas se usar cupom)
    if (coupon) {
      await db
        .update(coupons)
        .set({
          usedCount: (coupon.usedCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(coupons.id, coupon.id));
    }

    // 🔔 NOTIFICAÇÕES COMPLETAS (Email de Confirmação + Web Push + Admin)
    try {
      console.log('='.repeat(80));
      console.log('🎁 [FREE ORDER] Enviando notificações para pedido gratuito:', newOrder.id);
      console.log('='.repeat(80));

      // 1️⃣ ENVIAR EMAIL COM LINKS DE DOWNLOAD (igual outros métodos de pagamento)
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://arafacriou.com.br';

      try {
        const confirmationResponse = await fetch(`${baseUrl}/api/orders/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newOrder.id,
          }),
        });

        if (confirmationResponse.ok) {
          console.log('✅ [FREE ORDER] Email de confirmação com links de download enviado');
        } else {
          const errorData = await confirmationResponse.json();
          console.error('❌ [FREE ORDER] Erro ao enviar email de confirmação:', errorData);
        }
      } catch (emailError) {
        console.error('❌ [FREE ORDER] Erro na requisição de email:', emailError);
      }

      console.log(
        '✅ [FREE ORDER] Notificações completas enviadas via /api/orders/send-confirmation'
      );
    } catch (notifError) {
      console.error('❌ [FREE ORDER] Erro ao enviar notificações:', notifError);
    }

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
