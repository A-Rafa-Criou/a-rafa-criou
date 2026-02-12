import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, users, siteSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  sendAffiliateWelcomeEmail,
  sendAdminNewCommonAffiliateNotification,
} from '@/lib/email/affiliates';
import { sendWebPushToAdmins } from '@/lib/notifications/channels/web-push';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  pixKey: z.string().min(11),
  termsAccepted: z.boolean().refine(val => val === true),
  termsIp: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Validar dados
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone, pixKey, termsAccepted, termsIp } = validation.data;

    // Verificar se usuário já é afiliado
    const existingAffiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (existingAffiliate) {
      return NextResponse.json(
        { message: 'Você já possui um cadastro de afiliado' },
        { status: 400 }
      );
    }

    // Gerar código único de afiliado
    const code = nanoid(10);

    // Buscar comissão padrão das configurações
    const settings = await db.select().from(siteSettings).limit(1);
    const defaultCommission =
      settings.length > 0 ? settings[0].affiliateDefaultCommission : '20.00';

    // Criar afiliado
    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: session.user.id,
        code,
        name,
        email,
        phone,
        pixKey,
        affiliateType: 'common',
        commissionType: 'percent',
        commissionValue: defaultCommission,
        status: 'active', // Aprovação automática
        autoApproved: true,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsIp,
        materialsSent: false, // Será enviado por job assíncrono
      })
      .returning();

    // Enviar email de boas-vindas (não bloquear resposta)
    sendAffiliateWelcomeEmail({
      to: email,
      name,
      code,
    }).catch(err => {
      console.error('Erro ao enviar email de boas-vindas:', err);
    });

    // Notificar admin sobre novo afiliado (email + web push)
    sendAdminNewCommonAffiliateNotification({
      affiliateName: name,
      affiliateEmail: email,
      affiliateCode: code,
    }).catch(err => {
      console.error('Erro ao notificar admin sobre novo afiliado:', err);
    });

    sendWebPushToAdmins({
      title: '🆕 Novo Afiliado Cadastrado',
      body: `${name} (${email})\nCódigo: ${code}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br'}/admin/afiliados`,
      data: {
        type: 'new_affiliate',
        affiliateName: name,
        affiliateEmail: email,
        affiliateCode: code,
      },
    }).catch(err => {
      console.error('Erro ao enviar web push sobre novo afiliado:', err);
    });

    return NextResponse.json(
      {
        message: 'Cadastro realizado com sucesso!',
        affiliate: {
          id: newAffiliate.id,
          code: newAffiliate.code,
          status: newAffiliate.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering common affiliate:', error);
    return NextResponse.json(
      { message: 'Erro ao processar cadastro. Tente novamente.' },
      { status: 500 }
    );
  }
}
