import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('E-mail inválido').optional(),
  phone: z.string().optional().nullable(),
  image: z.string().url('URL de imagem inválida').optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres').optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações do usuário' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    // Buscar usuário atual
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Validações específicas
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Atualizar nome
    if (validatedData.name !== undefined) {
      updates.name = validatedData.name;
    }

    // Atualizar telefone
    if (validatedData.phone !== undefined) {
      updates.phone = validatedData.phone;
    }

    // Atualizar imagem
    if (validatedData.image !== undefined) {
      updates.image = validatedData.image;
    }

    // Atualizar e-mail (verificar se já está em uso)
    if (validatedData.email && validatedData.email !== currentUser.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingUser) {
        return NextResponse.json({ error: 'Este e-mail já está em uso' }, { status: 400 });
      }

      updates.email = validatedData.email;
      updates.emailVerified = null; // Resetar verificação ao trocar e-mail
    }

    // Atualizar senha
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { error: 'Senha atual é obrigatória para alterar a senha' },
          { status: 400 }
        );
      }

      // Verificar senha atual
      if (!currentUser.password) {
        return NextResponse.json({ error: 'Usuário sem senha definida' }, { status: 400 });
      }

      const isPasswordValid = await compare(validatedData.currentPassword, currentUser.password);

      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
      }

      // Hash da nova senha
      updates.password = await hash(validatedData.newPassword, 12);
    }

    // Atualizar no banco
    await db.update(users).set(updates).where(eq(users.id, session.user.id));

    // Buscar usuário atualizado
    const [updatedUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      message: 'Configurações atualizadas com sucesso',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
