import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateCommissions, affiliates } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { render } from '@react-email/render';
import CommissionPaidEmail from '@/emails/commission-paid';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, paymentMethod, paymentProof, notes } = body;

    // Validar status
    if (status && !['pending', 'approved', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Buscar comissão
    const [commission] = await db
      .select()
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, id))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });
    }

    const oldStatus = commission.status;
    const updateData: Record<string, string | Date | null> = {};

    if (status !== undefined) {
      updateData.status = status;

      // Aprovar comissão
      if (status === 'approved' && oldStatus === 'pending') {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();

        // Atualizar saldo do afiliado (mover de pending para approved)
        await db
          .update(affiliates)
          .set({
            pendingCommission: sql`${affiliates.pendingCommission} - ${commission.commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, commission.affiliateId));
      }

      // Marcar como pago
      if (status === 'paid' && oldStatus === 'approved') {
        updateData.paidAt = new Date();

        // Atualizar saldo do afiliado (adicionar ao paidCommission)
        await db
          .update(affiliates)
          .set({
            paidCommission: sql`${affiliates.paidCommission} + ${commission.commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, commission.affiliateId));

        // 📧 ENVIAR E-MAIL DE NOTIFICAÇÃO AO AFILIADO
        try {
          const [affiliate] = await db
            .select()
            .from(affiliates)
            .where(eq(affiliates.id, commission.affiliateId))
            .limit(1);

          if (affiliate && affiliate.email) {
            const emailHtml = await render(
              CommissionPaidEmail({
                affiliateName: affiliate.name,
                commissionAmount: commission.commissionAmount.toString(),
                currency: commission.currency || 'BRL',
                paymentMethod: paymentMethod || 'pix',
                orderId: commission.orderId,
                notes: paymentProof || notes || undefined, // 🔄 Usar paymentProof se tiver
              })
            );

            // 📧 Enviar via função centralizada (Gmail → Resend fallback)
            const emailResult = await sendEmail({
              to: affiliate.email,
              subject: `💰 Comissão Paga - ${commission.currency || 'BRL'} ${commission.commissionAmount}`,
              html: emailHtml,
            });

            if (!emailResult.success) {
              console.error('[Comissão] ❌ Erro ao enviar e-mail:', emailResult.error);
            } else {
              console.log('[Comissão] ✅ E-mail enviado via', emailResult.provider);
            }
          }
        } catch (emailError) {
          console.error('[Comissão] ⚠️ Erro ao enviar e-mail:', emailError);
          // Não bloquear a atualização se o e-mail falhar
        }
      }

      // Cancelar comissão
      if (status === 'cancelled') {
        // Se estava pending, remover do pendingCommission
        if (oldStatus === 'pending') {
          await db
            .update(affiliates)
            .set({
              pendingCommission: sql`${affiliates.pendingCommission} - ${commission.commissionAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(affiliates.id, commission.affiliateId));
        }
        // Se estava approved, não precisa fazer nada pois não estava em nenhum contador
      }
    }

    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentProof !== undefined) updateData.paymentProof = paymentProof;
    if (notes !== undefined) updateData.notes = notes;

    updateData.updatedAt = new Date();

    // Atualizar comissão
    const [updated] = await db
      .update(affiliateCommissions)
      .set(updateData)
      .where(eq(affiliateCommissions.id, id))
      .returning();

    return NextResponse.json({ success: true, commission: updated });
  } catch (error) {
    console.error('Erro ao atualizar comissão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
