import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateLinks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createLinkSchema = z.object({
  productId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Usuário não é um afiliado' }, { status: 403 });
    }

    if (affiliate.status !== 'active') {
      return NextResponse.json({ message: 'Afiliado não está ativo' }, { status: 403 });
    }

    const body = await request.json();
    const { productId } = createLinkSchema.parse(body);

    // Verificar se já existe link para este produto
    if (productId) {
      const existingLink = await db.query.affiliateLinks.findFirst({
        where: and(
          eq(affiliateLinks.affiliateId, affiliate.id),
          eq(affiliateLinks.productId, productId)
        ),
      });

      if (existingLink) {
        return NextResponse.json(
          { message: 'Já existe um link para este produto', link: existingLink },
          { status: 200 }
        );
      }
    }

    // Gerar código curto único
    const shortCode = `${affiliate.code}-${Math.random().toString(36).substring(2, 8)}`;

    // Usar customSlug se disponível, senão usar code
    const refCode = affiliate.customSlug || affiliate.code;

    // Construir URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arafacriou.com.br';
    const url = productId
      ? `${baseUrl}/produto/${productId}?ref=${refCode}`
      : `${baseUrl}?ref=${refCode}`;

    // Criar link
    const [newLink] = await db
      .insert(affiliateLinks)
      .values({
        affiliateId: affiliate.id,
        productId: productId || null,
        url,
        shortCode,
        clicks: 0,
        conversions: 0,
        revenue: '0',
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      link: newLink,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao criar link de afiliado:', error);
    return NextResponse.json({ message: 'Erro ao criar link' }, { status: 500 });
  }
}
