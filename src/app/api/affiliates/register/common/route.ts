import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  pixKey: z.string().min(11),
  termsAccepted: z.boolean().refine(val => val === true),
  termsIp: z.string(),
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
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone, pixKey, termsAccepted, termsIp } = validation.data;

    // Verificar se usuário já é afiliado
    const existingAffiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (existingAffiliate) {
      return NextResponse.json(
        { message: 'Você já possui um cadastro de afiliado' },
        { status: 400 }
      );
    }

    // Gerar código único de afiliado
    const code = nanoid(10);

    // Criar afiliado
    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: session.user.id,
        code,
        name,
        email,
        phone,
        pixKey,
        affiliateType: 'common',
        commissionType: 'percent',
        commissionValue: '10.00', // 10% de comissão padrão (pode ser configurado)
        status: 'active', // Aprovação automática
        autoApproved: true,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsIp,
        materialsSent: false, // Será enviado por job assíncrono
      })
      .returning();

    // TODO: Enviar email de boas-vindas com materiais
    // TODO: Disparar job para envio de materiais

    return NextResponse.json(
      {
        message: 'Cadastro realizado com sucesso!',
        affiliate: {
          id: newAffiliate.id,
          code: newAffiliate.code,
          status: newAffiliate.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering common affiliate:', error);
    return NextResponse.json(
      { message: 'Erro ao processar cadastro. Tente novamente.' },
      { status: 500 }
    );
  }
}
