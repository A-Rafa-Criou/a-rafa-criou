import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  cpfCnpj: z.string().min(11),
  termsAccepted: z.boolean().refine(val => val === true),
  contractAccepted: z.boolean().refine(val => val === true),
  signatureData: z.string().min(10),
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

    const { name, email, phone, cpfCnpj, termsAccepted, contractAccepted, signatureData, termsIp } =
      validation.data;

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

    // TODO: Fazer upload da assinatura para Cloudflare R2
    // TODO: Gerar PDF do contrato com assinatura
    // const contractDocumentUrl = await uploadContractToR2(signatureData, name, cpfCnpj);

    // Criar afiliado (status pending - aguardando aprovação manual)
    const [newAffiliate] = await db
      .insert(affiliates)
      .values({
        userId: session.user.id,
        code,
        name,
        email,
        phone,
        affiliateType: 'commercial_license',
        commissionType: 'fixed', // Sem comissão
        commissionValue: '0.00',
        status: 'inactive', // Aguardando aprovação
        autoApproved: false,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsIp,
        contractSigned: true,
        contractSignedAt: new Date(),
        contractSignatureData: signatureData,
        contractDocumentUrl: null, // Será preenchido após upload
        materialsSent: false,
        notes: `CPF/CNPJ: ${cpfCnpj}`,
      })
      .returning();

    // TODO: Enviar email para admin notificando nova solicitação
    // TODO: Enviar email para afiliado confirmando recebimento

    return NextResponse.json(
      {
        message: 'Solicitação enviada com sucesso!',
        affiliate: {
          id: newAffiliate.id,
          code: newAffiliate.code,
          status: newAffiliate.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering commercial license affiliate:', error);
    return NextResponse.json(
      { message: 'Erro ao processar solicitação. Tente novamente.' },
      { status: 500 }
    );
  }
}
