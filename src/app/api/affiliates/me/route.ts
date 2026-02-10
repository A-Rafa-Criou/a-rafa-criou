import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Retornar dados (sem informações sensíveis como IPs)
    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        customSlug: affiliate.customSlug,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        affiliateType: affiliate.affiliateType,
        status: affiliate.status,
        commissionType: affiliate.commissionType,
        commissionValue: affiliate.commissionValue,
        pixKey: affiliate.pixKey,
        totalClicks: affiliate.totalClicks,
        totalOrders: affiliate.totalOrders,
        totalRevenue: affiliate.totalRevenue,
        totalCommission: affiliate.totalCommission,
        pendingCommission: affiliate.pendingCommission,
        paidCommission: affiliate.paidCommission,
        materialsSent: affiliate.materialsSent,
        contractSigned: affiliate.contractSigned,
        contractDocumentUrl: affiliate.contractDocumentUrl,
        createdAt: affiliate.createdAt,
        approvedAt: affiliate.approvedAt,
        // Dados de pagamento automático
        preferredPaymentMethod: affiliate.preferredPaymentMethod,
        paymentAutomationEnabled: affiliate.paymentAutomationEnabled,
        stripeOnboardingStatus: affiliate.stripeOnboardingStatus,
        stripePayoutsEnabled: affiliate.stripePayoutsEnabled,
      },
    });
  } catch (error) {
    console.error('Error fetching affiliate data:', error);
    return NextResponse.json({ message: 'Erro ao carregar dados do afiliado' }, { status: 500 });
  }
}
