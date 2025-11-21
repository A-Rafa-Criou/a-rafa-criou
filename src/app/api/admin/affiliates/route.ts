import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, users, siteSettings } from '@/lib/db/schema';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Query base
    let query = db
      .select({
        affiliate: affiliates,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(affiliates)
      .leftJoin(users, eq(affiliates.userId, users.id))
      .orderBy(desc(affiliates.createdAt));

    // Filtros
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(affiliates.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(affiliates.name, `%${search}%`),
          ilike(affiliates.email, `%${search}%`),
          ilike(affiliates.code, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;

    // Formatar resposta
    const affiliatesList = results.map(({ affiliate, user }) => ({
      id: affiliate.id,
      code: affiliate.code,
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone,
      status: affiliate.status,
      commissionType: affiliate.commissionType,
      commissionValue: affiliate.commissionValue.toString(),
      totalClicks: affiliate.totalClicks,
      totalOrders: affiliate.totalOrders,
      totalRevenue: (affiliate.totalRevenue || '0').toString(),
      totalCommission: (affiliate.totalCommission || '0').toString(),
      pendingCommission: (affiliate.pendingCommission || '0').toString(),
      paidCommission: (affiliate.paidCommission || '0').toString(),
      createdAt: affiliate.createdAt.toISOString(),
      approvedAt: affiliate.approvedAt?.toISOString() || null,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        : null,
    }));

    // Estatísticas gerais
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`sum(case when ${affiliates.status} = 'active' then 1 else 0 end)::int`,
        inactive: sql<number>`sum(case when ${affiliates.status} = 'inactive' then 1 else 0 end)::int`,
        suspended: sql<number>`sum(case when ${affiliates.status} = 'suspended' then 1 else 0 end)::int`,
        totalCommissionPending: sql<number>`sum(${affiliates.pendingCommission})::decimal`,
        totalCommissionPaid: sql<number>`sum(${affiliates.paidCommission})::decimal`,
      })
      .from(affiliates);

    return NextResponse.json({
      affiliates: affiliatesList,
      stats: stats[0],
    });
  } catch (error) {
    console.error('Erro ao buscar afiliados:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      code,
      name,
      email,
      phone,
      commissionType,
      commissionValue,
      pixKey,
      bankName,
      bankAccount,
    } = body;

    // Validações
    if (!name || !email || !code) {
      return NextResponse.json({ error: 'Nome, email e código são obrigatórios' }, { status: 400 });
    }

    // Verificar se código já existe
    const existingCode = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.code, code))
      .limit(1);

    if (existingCode.length > 0) {
      return NextResponse.json({ error: 'Código de afiliado já está em uso' }, { status: 400 });
    }

    // Verificar se email já existe
    const existingEmail = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 });
    }

    // Se não foi fornecido userId, criar um usuário automaticamente
    let finalUserId = userId;

    if (!finalUserId) {
      // Verificar se já existe usuário com este email
      const { users } = await import('@/lib/db/schema');
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        finalUserId = existingUser[0].id;
      } else {
        // Criar novo usuário
        const { randomUUID } = await import('crypto');
        const [newUser] = await db
          .insert(users)
          .values({
            id: randomUUID(),
            name,
            email,
            role: 'customer',
            phone: phone || null,
          })
          .returning();

        finalUserId = newUser.id;
      }
    }

    // Buscar configuração padrão de comissão
    const [siteConfig] = await db
      .select({
        affiliateDefaultCommission: siteSettings.affiliateDefaultCommission,
      })
      .from(siteSettings)
      .limit(1);

    const defaultCommission = siteConfig?.affiliateDefaultCommission || '10.00';

    // Criar afiliado
    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: finalUserId,
        code,
        name,
        email,
        phone: phone || null,
        commissionType: commissionType || 'percent',
        commissionValue: commissionValue?.toString() || defaultCommission,
        pixKey: pixKey || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        status: 'active',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, affiliate: newAffiliate });
  } catch (error) {
    console.error('Erro ao criar afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/admin/affiliates - Atualizar afiliado
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      name,
      email,
      phone,
      commissionType,
      commissionValue,
      pixKey,
      bankName,
      bankAccount,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do afiliado é obrigatório' }, { status: 400 });
    }

    // Verificar se afiliado existe
    const existing = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Verificar email duplicado (exceto o próprio)
    if (email) {
      const emailExists = await db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(and(eq(affiliates.email, email), sql`${affiliates.id} != ${id}`))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json(
          { error: 'Email já está em uso por outro afiliado' },
          { status: 400 }
        );
      }
    }

    // Atualizar afiliado
    const updateData: Partial<typeof affiliates.$inferInsert> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (commissionType) updateData.commissionType = commissionType;
    if (commissionValue !== undefined) updateData.commissionValue = commissionValue.toString();
    if (pixKey !== undefined) updateData.pixKey = pixKey || null;
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount || null;

    const [updated] = await db
      .update(affiliates)
      .set(updateData)
      .where(eq(affiliates.id, id))
      .returning();

    return NextResponse.json({ success: true, affiliate: updated });
  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
