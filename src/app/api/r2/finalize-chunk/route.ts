import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { uploadToR2, generateFileKey } from '@/lib/r2-utils';
import { db } from '@/lib/db';
import { uploadChunks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId é obrigatório' }, { status: 400 });
    }

    // Buscar todos os chunks do banco de dados
    const chunks = await db.query.uploadChunks.findMany({
      where: eq(uploadChunks.uploadId, uploadId),
      orderBy: [asc(uploadChunks.chunkIndex)],
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: 'Upload não encontrado',
          uploadId,
        },
        { status: 404 }
      );
    }

    const metadata = chunks[0];

    // Verificar se todos os chunks foram recebidos
    if (chunks.length !== metadata.totalChunks) {
      return NextResponse.json(
        {
          error: `Faltam chunks: ${chunks.length}/${metadata.totalChunks}`,
        },
        { status: 400 }
      );
    }

    // Converter Base64 de volta para Buffer e juntar (mais rápido)
    const buffers = chunks.map(chunk => Buffer.from(chunk.chunkData, 'base64'));
    const completeFile = Buffer.concat(buffers);

    // Gerar chave única
    const fileKey = generateFileKey(metadata.fileName);

    // Upload para R2 e limpar chunks em paralelo
    await Promise.all([
      uploadToR2(fileKey, completeFile, metadata.fileType),
      db.delete(uploadChunks).where(eq(uploadChunks.uploadId, uploadId)),
    ]);

    const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${fileKey}`;

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        originalName: metadata.fileName,
        size: completeFile.length,
        type: metadata.fileType,
        url: publicUrl,
      },
    });
  } catch (error) {
    console.error('[Finalize] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      {
        error: 'Erro ao finalizar upload',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
