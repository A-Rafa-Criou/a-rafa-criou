import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET } from '@/lib/r2';
import { generateFileKey } from '@/lib/r2-utils';

/**
 * Gera URL assinada para upload direto do browser para R2
 * Elimina o gargalo de passar pelo backend/PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Validação de tamanho (máximo 100MB)
    if (fileSize && fileSize > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    // Gera chave única para o arquivo
    const fileKey = generateFileKey(fileName);

    // Gera URL assinada para PUT (válida por 1 hora)
    const signedUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        ContentType: fileType,
        ACL: 'private',
      }),
      { expiresIn: 3600 } // 1 hora
    );

    return NextResponse.json({
      uploadUrl: signedUrl,
      fileKey,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating R2 signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
