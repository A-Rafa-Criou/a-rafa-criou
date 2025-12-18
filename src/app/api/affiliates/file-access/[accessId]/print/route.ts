import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateFileAccess, affiliates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const { accessId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se o acesso pertence ao usuário
    const [access] = await db
      .select()
      .from(affiliateFileAccess)
      .innerJoin(affiliates, eq(affiliateFileAccess.affiliateId, affiliates.id))
      .where(and(eq(affiliateFileAccess.id, accessId), eq(affiliates.userId, session.user.id)));

    if (!access) {
      return NextResponse.json({ message: 'Acesso não encontrado' }, { status: 404 });
    }

    // Incrementar contador de impressões
    await db
      .update(affiliateFileAccess)
      .set({
        printCount: access.affiliate_file_access.printCount + 1,
      })
      .where(eq(affiliateFileAccess.id, accessId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing print count:', error);
    return NextResponse.json({ message: 'Erro ao registrar impressão' }, { status: 500 });
  }
}
