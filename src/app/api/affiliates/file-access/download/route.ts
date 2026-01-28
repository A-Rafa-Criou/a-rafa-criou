/**
 * API de Download de Arquivo Temporário (Licença Comercial)
 *
 * Permite visualizar e imprimir arquivos dentro do prazo de 5 dias
 * Rastreamento de visualizações e impressões
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateFileAccess, affiliates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const downloadSchema = z.object({
  accessId: z.string().uuid(),
  action: z.enum(['view', 'print']), // view = visualizar, print = imprimir
});

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Validar dados
    const body = await req.json();
    const validation = downloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { accessId, action } = validation.data;

    // Buscar afiliado do usuário
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
      columns: {
        id: true,
        affiliateType: true,
        status: true,
      },
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado' }, { status: 403 });
    }

    if (affiliate.affiliateType !== 'commercial_license') {
      return NextResponse.json(
        { message: 'Apenas afiliados com licença comercial podem acessar arquivos' },
        { status: 403 }
      );
    }

    if (affiliate.status !== 'active') {
      return NextResponse.json({ message: 'Sua licença não está ativa' }, { status: 403 });
    }

    // Buscar acesso
    const access = await db.query.affiliateFileAccess.findFirst({
      where: and(
        eq(affiliateFileAccess.id, accessId),
        eq(affiliateFileAccess.affiliateId, affiliate.id)
      ),
    });

    if (!access) {
      return NextResponse.json({ message: 'Acesso não encontrado' }, { status: 404 });
    }

    // Verificar se expirou
    const now = new Date();
    if (now > access.expiresAt) {
      return NextResponse.json(
        { message: 'Este acesso expirou. Prazo de 5 dias encerrado.' },
        { status: 403 }
      );
    }

    if (!access.fileUrl) {
      return NextResponse.json({ message: 'Arquivo não disponível' }, { status: 404 });
    }

    // Incrementar contador
    if (action === 'view') {
      await db
        .update(affiliateFileAccess)
        .set({
          viewCount: (access.viewCount || 0) + 1,
          lastAccessedAt: now,
        })
        .where(eq(affiliateFileAccess.id, accessId));
    } else if (action === 'print') {
      await db
        .update(affiliateFileAccess)
        .set({
          printCount: (access.printCount || 0) + 1,
          lastAccessedAt: now,
        })
        .where(eq(affiliateFileAccess.id, accessId));
    }

    // Retornar URL do arquivo (R2 com URL assinada)
    return NextResponse.json({
      fileUrl: access.fileUrl,
      expiresAt: access.expiresAt,
      action,
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { message: 'Erro ao processar download. Tente novamente.' },
      { status: 500 }
    );
  }
}
