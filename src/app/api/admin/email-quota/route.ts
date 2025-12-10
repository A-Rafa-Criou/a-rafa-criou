import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getQuotaStatus } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter status da cota
    const quotaStatus = getQuotaStatus();

    return NextResponse.json({
      success: true,
      quota: quotaStatus,
      limits: {
        resendMonthly: 3000, // Ajuste conforme seu plano
        gmailDaily: 500,
      },
      warnings: {
        resendNearLimit: quotaStatus.resendCount > 2500,
        resendBlocked: quotaStatus.isResendBlocked,
        gmailNearLimit: quotaStatus.gmailCount > 400,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar status de cota de email:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
