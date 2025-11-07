import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { uploadToR2 } from '@/lib/r2-utils';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parse do FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    // Validações do arquivo - aceitar apenas imagens
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Apenas imagens são permitidas.' },
        { status: 400 }
      );
    }

    // Limitar tamanho a 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      );
    }

    // Gerar chave única para o arquivo (com prefixo avatars/)
    const fileExtension = file.name.split('.').pop();
    const fileKey = `avatars/${session.user.id}-${Date.now()}.${fileExtension}`;

    // Converter o arquivo para Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload para Cloudflare R2
    await uploadToR2(fileKey, buffer, file.type);

    // URL pública do arquivo
    const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${fileKey}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key: fileKey,
      originalName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao fazer upload da imagem',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
