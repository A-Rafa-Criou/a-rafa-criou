import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { r2, R2_BUCKET } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateFileKey } from '@/lib/r2-utils';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName e fileType são obrigatórios' }, { status: 400 });
    }

    console.log('[Presigned URL] Gerando para:', {
      fileName,
      fileType,
      sizeMB: (fileSize / (1024 * 1024)).toFixed(2) + ' MB',
    });

    // Gerar chave única
    const fileKey = generateFileKey(fileName);

    // Gerar URL assinada para upload direto do cliente
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      ACL: 'private',
    });

    const presignedUrl = await getSignedUrl(r2, command, {
      expiresIn: 3600, // 1 hora
    });

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        fileKey,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    console.error('[Presigned URL] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao gerar URL de upload',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 10;
export const dynamic = 'force-dynamic';
