import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    // Busca por nome ou email
    const found = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`)
        )
      )
      .limit(10);

    return NextResponse.json(found);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
