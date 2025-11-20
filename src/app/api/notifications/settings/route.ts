import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { notificationSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validação
const settingsSchema = z.object({
  orderConfirmationEmail: z.boolean().optional(),
  orderConfirmationSms: z.boolean().optional(),
  orderConfirmationWhatsapp: z.boolean().optional(),
  downloadReadyEmail: z.boolean().optional(),
  downloadReadySms: z.boolean().optional(),
  downloadReadyWhatsapp: z.boolean().optional(),
  promotionalEmail: z.boolean().optional(),
  promotionalSms: z.boolean().optional(),
  promotionalWhatsapp: z.boolean().optional(),
  securityEmail: z.boolean().optional(),
  dndEnabled: z.boolean().optional(),
  dndStartHour: z.number().min(0).max(23).optional(),
  dndEndHour: z.number().min(0).max(23).optional(),
  whatsappNumber: z.string().max(20).nullable().optional(),
  smsNumber: z.string().max(20).nullable().optional(),
});

/**
 * GET /api/notifications/settings
 * Obtém configurações de notificação do usuário
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar configurações
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, session.user.id))
      .limit(1);

    // Se não existir, criar padrão
    if (!settings) {
      const [newSettings] = await db
        .insert(notificationSettings)
        .values({
          userId: session.user.id,
          orderConfirmationEmail: true,
          orderConfirmationSms: false,
          orderConfirmationWhatsapp: false,
          downloadReadyEmail: true,
          downloadReadySms: false,
          downloadReadyWhatsapp: false,
          promotionalEmail: true,
          promotionalSms: false,
          promotionalWhatsapp: false,
          securityEmail: true,
          dndEnabled: false,
          dndStartHour: 22,
          dndEndHour: 8,
        })
        .returning();

      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações de notificação' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/settings
 * Atualiza configurações de notificação do usuário
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = settingsSchema.parse(body);

    // Verificar se settings já existe
    const [existing] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, session.user.id))
      .limit(1);

    if (!existing) {
      // Criar novo
      const [newSettings] = await db
        .insert(notificationSettings)
        .values({
          userId: session.user.id,
          ...validatedData,
        })
        .returning();

      return NextResponse.json(newSettings);
    }

    // Atualizar existente
    const [updated] = await db
      .update(notificationSettings)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(notificationSettings.userId, session.user.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.format() },
        { status: 400 }
      );
    }

    console.error('❌ Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações de notificação' },
      { status: 500 }
    );
  }
}
