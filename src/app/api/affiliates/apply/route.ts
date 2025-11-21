import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const applySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  description: z.string().min(20, 'Descreva por que quer ser afiliado (mínimo 20 caracteres)'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = applySchema.parse(body);

    // Verificar se já existe afiliado com este e-mail
    const existingAffiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.email, validatedData.email),
    });

    if (existingAffiliate) {
      return NextResponse.json(
        { message: 'Já existe uma candidatura com este e-mail' },
        { status: 400 }
      );
    }

    // Verificar se é um usuário existente
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    // Gerar código único para o afiliado
    const baseCode = validatedData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);

    let code = baseCode;
    let counter = 1;

    // Garantir que o código seja único
    while (true) {
      const existing = await db.query.affiliates.findFirst({
        where: eq(affiliates.code, code),
      });
      if (!existing) break;
      code = `${baseCode}${counter}`;
      counter++;
    }

    // Criar candidatura de afiliado (status: pending)
    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: existingUser?.id || '',
        code,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        status: 'pending',
        commissionValue: '0',
        commissionType: 'percent', // Será definido quando aprovado
        pixKey: null,
        totalClicks: 0,
        totalOrders: 0,
        totalRevenue: '0',
        totalCommission: '0',
        pendingCommission: '0',
        paidCommission: '0',
      })
      .returning();

    // TODO: Enviar e-mail para admin notificando nova candidatura
    // TODO: Enviar e-mail para candidato confirmando recebimento

    return NextResponse.json({
      success: true,
      message: 'Candidatura enviada com sucesso! Você receberá um e-mail quando for aprovado.',
      affiliate: {
        code: newAffiliate.code,
        name: newAffiliate.name,
        email: newAffiliate.email,
        status: newAffiliate.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao processar candidatura de afiliado:', error);
    return NextResponse.json({ message: 'Erro ao processar candidatura' }, { status: 500 });
  }
}
