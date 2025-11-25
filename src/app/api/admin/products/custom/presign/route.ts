import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Gera URL presigned para upload direto ao R2
 * POST /api/admin/products/custom/presign
 * 
 * Body: { fileName: string, fileType: string, fileSize: number }
 * Response: { uploadUrl: string, r2Key: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    // Validações
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { message: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Validar tipo (PDF ou ZIP)
    const validTypes = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { message: 'Apenas arquivos PDF ou ZIP são permitidos' },
        { status: 400 }
      );
    }

    // Validar tamanho (50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Arquivo muito grande (máximo 50MB)' },
        { status: 400 }
      );
    }

    // Gerar chave única para o arquivo
    const productId = nanoid(12);
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `products/${productId}/${safeFileName}`;

    // Gerar URL presigned para upload (válida por 10 minutos)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2Key,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    console.log('📤 [Presign] URL gerada para upload:', {
      r2Key,
      fileType,
      fileSize,
      expiresIn: '10 minutos',
    });

    return NextResponse.json({
      uploadUrl,
      r2Key,
      productId,
    });
  } catch (error) {
    console.error('❌ Erro ao gerar URL presigned:', error);
    return NextResponse.json(
      { message: 'Erro ao gerar URL de upload', error: String(error) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
