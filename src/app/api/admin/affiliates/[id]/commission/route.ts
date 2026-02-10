import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendAffiliateCommissionChangedEmail } from '@/lib/email/affiliates';
import { z } from 'zod';

const commissionSchema = z.object({
  commissionValue: z.string().refine(
    val => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: 'Comissão deve ser entre 0% e 100%' }
  ),
  notifyAffiliate: z.boolean().optional().default(true),
  notes: z.string().optional(),
});

/**
 * PATCH /api/admin/affiliates/[id]/commission
 * Altera a taxa de comissão de um afiliado específico
 * Envia email de notificação ao afiliado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Validar body
    const body = await request.json();
    const validation = commissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { commissionValue, notifyAffiliate, notes } = validation.data;

    // Buscar afiliado atual
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        commissionValue: affiliates.commissionValue,
        affiliateType: affiliates.affiliateType,
        status: affiliates.status,
      })
      .from(affiliates)
      .where(eq(affiliates.id, id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Verificar se afiliado é 'common' (apenas afiliados comuns têm comissão)
    if (affiliate.affiliateType !== 'common') {
      return NextResponse.json(
        {
          error: 'Apenas afiliados comuns podem ter comissão alterada',
          message: 'Afiliados com licença comercial não recebem comissão monetária',
        },
        { status: 400 }
      );
    }

    const oldCommission = parseFloat(affiliate.commissionValue.toString());
    const newCommission = parseFloat(commissionValue);

    // Se não mudou, retornar sucesso
    if (oldCommission === newCommission) {
      return NextResponse.json({
        success: true,
        message: 'Comissão mantida (valor igual)',
        commissionValue: commissionValue,
        changed: false,
      });
    }

    // Atualizar comissão
    const [updated] = await db
      .update(affiliates)
      .set({
        commissionValue: commissionValue,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, id))
      .returning();

    // Enviar email de notificação
    if (notifyAffiliate && affiliate.status === 'active') {
      try {
        await sendAffiliateCommissionChangedEmail({
          affiliateName: affiliate.name,
          affiliateEmail: affiliate.email,
          oldCommission: oldCommission,
          newCommission: newCommission,
          notes: notes,
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de notificação:', emailError);
        // Não falhar a requisição se email falhar
      }
    }

    console.log(
      `[Admin] Comissão alterada: ${affiliate.name} (${affiliate.email}) de ${oldCommission}% para ${newCommission}% por ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: 'Comissão atualizada com sucesso',
      affiliate: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        commissionValue: updated.commissionValue.toString(),
      },
      changed: true,
      oldCommission: oldCommission,
      newCommission: newCommission,
      emailSent: notifyAffiliate && affiliate.status === 'active',
    });
  } catch (error) {
    console.error('Erro ao atualizar comissão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
