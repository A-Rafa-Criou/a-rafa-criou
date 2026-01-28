/**
 * API de Listagem de Afiliados Pendentes (Admin)
 *
 * Lista todos os afiliados aguardando aprovação (licença comercial)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    // Buscar afiliados pendentes
    const pending = await db.query.affiliates.findMany({
      where: and(
        eq(affiliates.affiliateType, 'commercial_license'),
        eq(affiliates.status, 'inactive')
      ),
      orderBy: [desc(affiliates.createdAt)],
      columns: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        notes: true,
        contractSignedAt: true,
        termsAcceptedAt: true,
        termsIp: true,
      },
    });

    return NextResponse.json({
      pending,
      total: pending.length,
    });
  } catch (error) {
    console.error('Error fetching pending affiliates:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar afiliados pendentes. Tente novamente.' },
      { status: 500 }
    );
  }
}
