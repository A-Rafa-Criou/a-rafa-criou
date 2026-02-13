/**
 * API Admin - Mural de Notícias dos Afiliados
 *
 * GET  /api/admin/affiliates/bulletin — Lista todas as mensagens do mural
 * POST /api/admin/affiliates/bulletin — Cria nova mensagem no mural
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateBulletinBoard } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { z } from 'zod';

const createMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem muito longa (máximo 2000 caracteres)'),
});

/**
 * GET /api/admin/affiliates/bulletin
 * Lista todas as mensagens do mural (admin)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const messages = await db
      .select()
      .from(affiliateBulletinBoard)
      .orderBy(desc(affiliateBulletinBoard.createdAt));

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao listar mensagens:', error);
    return NextResponse.json({ error: 'Erro ao listar mensagens do mural' }, { status: 500 });
  }
}

/**
 * POST /api/admin/affiliates/bulletin
 * Cria nova mensagem no mural
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    const [newMessage] = await db
      .insert(affiliateBulletinBoard)
      .values({
        message,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao criar mensagem:', error);
    return NextResponse.json({ error: 'Erro ao criar mensagem no mural' }, { status: 500 });
  }
}
