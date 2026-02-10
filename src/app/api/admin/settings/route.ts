import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const settings = await db.select().from(siteSettings).limit(1);

    // Se não existir configurações, retornar valores padrão
    if (settings.length === 0) {
      return NextResponse.json({
        siteName: 'A Rafa Criou',
        siteDescription: 'E-commerce de PDFs educacionais',
        siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
        supportEmail: 'contato@arafacriou.com.br',
        pixEnabled: true,
        stripeEnabled: true,
        maxDownloadsPerProduct: 3,
        downloadLinkExpiration: 24,
        accessDays: 30,
        enableWatermark: false,
        metaTitle: 'A Rafa Criou - PDFs Educacionais de Qualidade',
        metaDescription:
          'Encontre os melhores PDFs educacionais para seu aprendizado. Materiais de alta qualidade com entrega instantânea.',
        metaKeywords: 'pdf, educação, aprendizado, ebooks, material educacional',
        googleAnalyticsId: '',
        facebookPixelId: '',
        affiliateEnabled: false,
        affiliateDefaultCommission: '20.00',
        affiliateMinPayout: '0.01', // Split payment instantâneo
        affiliateCookieDays: 30,
      });
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Filtrar apenas campos válidos do schema
    const validData = {
      siteName: body.siteName,
      siteDescription: body.siteDescription,
      siteUrl: body.siteUrl,
      supportEmail: body.supportEmail,
      pixEnabled: body.pixEnabled,
      stripeEnabled: body.stripeEnabled,
      maxDownloadsPerProduct: body.maxDownloadsPerProduct,
      downloadLinkExpiration: body.downloadLinkExpiration,
      accessDays: body.accessDays,
      enableWatermark: body.enableWatermark,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      metaKeywords: body.metaKeywords,
      googleAnalyticsId: body.googleAnalyticsId,
      facebookPixelId: body.facebookPixelId,
      // Campos de afiliados
      affiliateEnabled: body.affiliateEnabled,
      affiliateDefaultCommission: body.affiliateDefaultCommission,
      affiliateMinPayout: body.affiliateMinPayout,
      affiliateCookieDays: body.affiliateCookieDays,
      updatedAt: new Date(),
    };

    // Verificar se já existe uma configuração
    const existing = await db.select().from(siteSettings).limit(1);

    if (existing.length === 0) {
      // Criar nova configuração
      const [newSettings] = await db.insert(siteSettings).values(validData).returning();

      return NextResponse.json(newSettings);
    } else {
      // Atualizar configuração existente
      const [updated] = await db
        .update(siteSettings)
        .set(validData)
        .where(eq(siteSettings.id, existing[0].id))
        .returning();

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
