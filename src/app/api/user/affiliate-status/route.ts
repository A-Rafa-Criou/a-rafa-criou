import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ isAffiliate: false, status: null });
    }

    // Buscar afiliado pelo userId
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        status: affiliates.status,
      })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ isAffiliate: false, status: null });
    }

    return NextResponse.json({
      isAffiliate: true,
      status: affiliate.status,
      isActive: affiliate.status === 'active',
      code: affiliate.code,
    });
  } catch (error) {
    console.error('Erro ao verificar status de afiliado:', error);
    return NextResponse.json({ isAffiliate: false, status: null });
  }
}
