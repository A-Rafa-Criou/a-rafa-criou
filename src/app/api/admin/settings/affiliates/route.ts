import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar configurações de afiliados
    const settings = await db
      .select({
        affiliateEnabled: siteSettings.affiliateEnabled,
        affiliateDefaultCommission: siteSettings.affiliateDefaultCommission,
        affiliateMinPayout: siteSettings.affiliateMinPayout,
        affiliateCookieDays: siteSettings.affiliateCookieDays,
      })
      .from(siteSettings)
      .limit(1);

    if (settings.length === 0) {
      // Criar configurações padrão se não existir
      await db.insert(siteSettings).values({
        siteName: 'A Rafa Criou',
        affiliateEnabled: false,
        affiliateDefaultCommission: '10.00',
        affiliateMinPayout: '50.00',
        affiliateCookieDays: 30,
      });

      return NextResponse.json({
        affiliateEnabled: false,
        affiliateDefaultCommission: '10.00',
        affiliateMinPayout: '50.00',
        affiliateCookieDays: 30,
      });
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações de afiliados:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      affiliateEnabled,
      affiliateDefaultCommission,
      affiliateMinPayout,
      affiliateCookieDays,
    } = body;

    // Validações
    if (affiliateDefaultCommission !== undefined) {
      const commission = parseFloat(affiliateDefaultCommission);
      if (isNaN(commission) || commission < 0 || commission > 100) {
        return NextResponse.json({ error: 'Comissão deve ser entre 0 e 100%' }, { status: 400 });
      }
    }

    if (affiliateMinPayout !== undefined) {
      const minPayout = parseFloat(affiliateMinPayout);
      if (isNaN(minPayout) || minPayout < 0) {
        return NextResponse.json(
          { error: 'Valor mínimo de saque deve ser maior que 0' },
          { status: 400 }
        );
      }
    }

    if (affiliateCookieDays !== undefined) {
      const days = parseInt(affiliateCookieDays);
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { error: 'Duração do cookie deve ser entre 1 e 365 dias' },
          { status: 400 }
        );
      }
    }

    // Atualizar configurações
    const updateData: Record<string, string | number | boolean> = {};
    if (affiliateEnabled !== undefined) updateData.affiliateEnabled = affiliateEnabled;
    if (affiliateDefaultCommission !== undefined)
      updateData.affiliateDefaultCommission = affiliateDefaultCommission.toString();
    if (affiliateMinPayout !== undefined)
      updateData.affiliateMinPayout = affiliateMinPayout.toString();
    if (affiliateCookieDays !== undefined) updateData.affiliateCookieDays = affiliateCookieDays;

    // Buscar primeiro registro de settings
    const existingSettings = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);

    if (existingSettings.length === 0) {
      // Criar se não existir
      await db.insert(siteSettings).values({
        siteName: 'A Rafa Criou',
        ...updateData,
      });
    } else {
      // Atualizar existente
      await db
        .update(siteSettings)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, existingSettings[0].id));
    }

    return NextResponse.json({ success: true, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar configurações de afiliados:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
