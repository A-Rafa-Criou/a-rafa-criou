import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'rejected']),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Validar dados
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, notes } = validation.data;

    // Verificar se afiliado existe
    const [existingAffiliate] = await db
      .select({ id: affiliates.id, status: affiliates.status })
      .from(affiliates)
      .where(eq(affiliates.id, id))
      .limit(1);

    if (!existingAffiliate) {
      return NextResponse.json({ message: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Preparar dados de atualização
    const updateData: Record<string, string | Date | null> = {
      status,
      updatedAt: new Date(),
    };

    // Se está ativando um afiliado que estava inativo, registrar aprovação
    if (status === 'active' && existingAffiliate.status !== 'active') {
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }

    // Adicionar notas se fornecidas
    if (notes) {
      const currentAffiliate = await db.query.affiliates.findFirst({
        where: eq(affiliates.id, id),
        columns: { notes: true },
      });

      const existingNotes = currentAffiliate?.notes || '';
      const timestamp = new Date().toLocaleString('pt-BR');
      const newNote = `[${timestamp}] Status alterado para ${status} por admin${notes ? `: ${notes}` : ''}`;
      updateData.notes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;
    }

    // Atualizar afiliado
    const [updatedAffiliate] = await db
      .update(affiliates)
      .set(updateData)
      .where(eq(affiliates.id, id))
      .returning();

    return NextResponse.json(
      {
        message: 'Status atualizado com sucesso',
        affiliate: {
          id: updatedAffiliate.id,
          status: updatedAffiliate.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating affiliate status:', error);
    return NextResponse.json({ message: 'Erro ao atualizar status do afiliado' }, { status: 500 });
  }
}
