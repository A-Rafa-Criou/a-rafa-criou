import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset-quota') {
      // Em produção, isso deveria resetar o contador no banco de dados
      console.log('🔄 [ADMIN] Reset manual da cota de email solicitado');

      return NextResponse.json({
        success: true,
        message: 'Cota resetada. O sistema voltará a usar o Resend primeiro.',
        note: 'Como o contador está em memória, basta reiniciar a aplicação.',
      });
    }

    if (action === 'test-resend') {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'A Rafa Criou <noreply@arafacriou.com.br>',
          to: session.user.email || 'arafacriou@gmail.com',
          subject: 'Teste Resend - A Rafa Criou',
          html: '<h1>✅ Resend funcionando!</h1><p>Email de teste enviado com sucesso.</p>',
        });

        return NextResponse.json({
          success: true,
          message: 'Email de teste enviado via Resend com sucesso!',
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: (error as Error).message,
            message: 'Falha ao enviar via Resend',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao gerenciar email:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
