/**
 * API de Aprovação de Licença Comercial (Admin)
 *
 * Aprovar/rejeitar solicitações de afiliados com licença comercial
 * Envia email automático para o afiliado
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendCommercialLicenseApprovedEmail } from '@/lib/email/affiliates';

const approveSchema = z.object({
  affiliateId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    // Validar dados
    const body = await req.json();
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { affiliateId, action, notes } = validation.data;

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.id, affiliateId),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Afiliado não encontrado' }, { status: 404 });
    }

    if (affiliate.affiliateType !== 'commercial_license') {
      return NextResponse.json(
        { message: 'Apenas licenças comerciais precisam de aprovação' },
        { status: 400 }
      );
    }

    if (affiliate.status === 'active' || affiliate.status === 'rejected') {
      return NextResponse.json(
        { message: `Afiliado já foi ${affiliate.status === 'active' ? 'aprovado' : 'rejeitado'}` },
        { status: 400 }
      );
    }

    // Atualizar status
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const [updated] = await db
      .update(affiliates)
      .set({
        status: newStatus,
        approvedAt: action === 'approve' ? new Date() : null,
        approvedBy: action === 'approve' ? session.user.id : null,
        notes: notes ? `${affiliate.notes || ''}\n[Admin] ${notes}` : affiliate.notes,
      })
      .where(eq(affiliates.id, affiliateId))
      .returning();

    // Enviar email de aprovação (não bloquear resposta)
    if (action === 'approve') {
      sendCommercialLicenseApprovedEmail({
        to: affiliate.email,
        name: affiliate.name,
      }).catch(err => {
        console.error('Erro ao enviar email de aprovação:', err);
      });
    }

    return NextResponse.json(
      {
        message: action === 'approve' ? 'Afiliado aprovado com sucesso!' : 'Afiliado rejeitado',
        affiliate: {
          id: updated.id,
          status: updated.status,
          approvedAt: updated.approvedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving affiliate:', error);
    return NextResponse.json(
      { message: 'Erro ao processar aprovação. Tente novamente.' },
      { status: 500 }
    );
  }
}
