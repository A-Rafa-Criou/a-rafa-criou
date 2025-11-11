import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { uploadToR2, generateFileKey } from '@/lib/r2-utils';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parse do FormData com streaming
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    console.log('[R2 Upload] Arquivo recebido:', {
      name: file.name,
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type,
    });

    // Validações do arquivo
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Apenas PDFs são permitidos.' },
        { status: 400 }
      );
    }

    // Limitar tamanho do arquivo para evitar timeout (Vercel Hobby = 10s função, mas podemos usar até 300s configurado)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Arquivo muito grande. Máximo: 50MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 413 }
      );
    }

    // Gerar chave única para o arquivo
    const fileKey = generateFileKey(file.name);

    // Converter o arquivo para Buffer usando streaming para economizar memória
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('[R2 Upload] Enviando para R2...');

    // Upload para Cloudflare R2
    await uploadToR2(fileKey, buffer, file.type);

    console.log('[R2 Upload] ✅ Upload completo:', fileKey);

    // URL pública do arquivo
    const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${fileKey}`;

    const response = {
      success: true,
      data: {
        key: fileKey,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[R2 Upload] ❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro interno do servidor durante o upload',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Configuração otimizada
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos (máximo no Hobby plan)
export const dynamic = 'force-dynamic';
