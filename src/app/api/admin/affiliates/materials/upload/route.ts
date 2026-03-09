/**
 * API Admin - Upload de Materiais para Afiliados
 *
 * POST /api/admin/affiliates/materials/upload — Upload de arquivo para R2
 * Aceita: vídeos, imagens, PDFs, ZIPs e outros arquivos
 * Limite: 100MB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { uploadToR2 } from '@/lib/r2-utils';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'application/vnd.openxmlformats',
  'application/msword',
];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}

function generateMaterialKey(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `affiliate-materials/${timestamp}-${randomId}-${sanitizedName}`;
}

/**
 * Determina o tipo de mídia baseado no MIME type
 */
function getMediaCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('zip')) return 'zip';
  return 'file';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Limite: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Envie imagens, vídeos, PDFs ou ZIPs.' },
        { status: 400 }
      );
    }

    const fileKey = generateMaterialKey(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('[Admin Materials Upload] Enviando para R2:', {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type,
      key: fileKey,
    });

    await uploadToR2(fileKey, buffer, file.type);

    console.log('[Admin Materials Upload] ✅ Upload completo:', fileKey);

    const mediaCategory = getMediaCategory(file.type);

    // Armazenar a key do R2 como fileUrl — URLs assinadas serão geradas sob demanda
    return NextResponse.json({
      success: true,
      file: {
        fileUrl: fileKey,
        fileKey,
        fileName: file.name,
        fileType: mediaCategory,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error('[Admin Materials Upload] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      {
        error: 'Erro ao fazer upload do arquivo',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
