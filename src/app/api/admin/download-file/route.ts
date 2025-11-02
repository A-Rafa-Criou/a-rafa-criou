import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getR2SignedUrl } from '@/lib/r2-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Apenas admins podem baixar arquivos diretamente
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Caminho do arquivo não fornecido' }, { status: 400 });
    }

    try {
      // Gerar URL assinada do R2 (válida por 1 hora)
      const signedUrl = await getR2SignedUrl(path, 3600);

      // Redirecionar para a URL assinada
      return NextResponse.redirect(signedUrl);
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error);
      return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao processar download:', error);
    return NextResponse.json({ error: 'Erro ao processar download' }, { status: 500 });
  }
}
