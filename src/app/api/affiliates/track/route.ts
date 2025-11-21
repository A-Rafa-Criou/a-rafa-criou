import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, affiliateLinks, affiliateClicks, siteSettings } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

// Função auxiliar para detectar tipo de dispositivo
function getDeviceType(userAgent: string): string {
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    if (/ipad|tablet/i.test(userAgent)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

// Função auxiliar para obter IP real
function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (real) {
    return real;
  }

  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, productId } = body;

    if (!code) {
      return NextResponse.json({ error: 'Código de afiliado não fornecido' }, { status: 400 });
    }

    // Buscar afiliado pelo código
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        status: affiliates.status,
      })
      .from(affiliates)
      .where(eq(affiliates.code, code))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Código de afiliado inválido' }, { status: 404 });
    }

    if (affiliate.status !== 'active') {
      return NextResponse.json({ error: 'Afiliado não está ativo' }, { status: 403 });
    }

    // Buscar link específico se for para um produto
    let linkId = null;
    if (productId) {
      const [link] = await db
        .select({ id: affiliateLinks.id })
        .from(affiliateLinks)
        .where(
          and(eq(affiliateLinks.affiliateId, affiliate.id), eq(affiliateLinks.productId, productId))
        )
        .limit(1);

      if (link) {
        linkId = link.id;

        // Incrementar contador de cliques do link
        await db
          .update(affiliateLinks)
          .set({
            clicks: sql`${affiliateLinks.clicks} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(affiliateLinks.id, link.id));
      }
    }

    // Obter dados da requisição
    const ip = getRealIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const deviceType = getDeviceType(userAgent);

    // Registrar clique
    const [click] = await db
      .insert(affiliateClicks)
      .values({
        affiliateId: affiliate.id,
        linkId,
        ip,
        userAgent,
        referer,
        deviceType,
        converted: false,
      })
      .returning();

    // Incrementar contador total de cliques do afiliado
    await db
      .update(affiliates)
      .set({
        totalClicks: sql`${affiliates.totalClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    // Buscar configurações de cookie (duração)
    const [settings] = await db
      .select({ affiliateCookieDays: siteSettings.affiliateCookieDays })
      .from(siteSettings)
      .limit(1);

    const cookieDays = settings?.affiliateCookieDays || 30;

    // Salvar código de afiliado no cookie
    const cookieStore = await cookies();
    cookieStore.set('affiliate_code', code, {
      maxAge: cookieDays * 24 * 60 * 60, // conversão para segundos
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Salvar ID do clique para rastreamento de conversão
    cookieStore.set('affiliate_click_id', click.id, {
      maxAge: cookieDays * 24 * 60 * 60,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      message: 'Clique registrado com sucesso',
      clickId: click.id,
    });
  } catch (error) {
    console.error('Erro ao registrar clique de afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
