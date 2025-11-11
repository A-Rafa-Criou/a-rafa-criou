import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { uploadChunks } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const fileType = formData.get('fileType') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Converter chunk para Buffer e depois para Base64
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const chunkBase64 = buffer.toString('base64');

    // Salvar chunk no banco de dados com upsert (mais rápido que verificar)
    await db.insert(uploadChunks).values({
      uploadId,
      chunkIndex,
      chunkData: chunkBase64,
      fileName,
      fileType,
      totalChunks,
      fileSize,
    }).onConflictDoUpdate({
      target: [uploadChunks.uploadId, uploadChunks.chunkIndex],
      set: { chunkData: chunkBase64 },
    });

    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);

    return NextResponse.json({ 
      success: true, 
      chunkIndex, 
      total: totalChunks,
      progress
    });
  } catch (error) {
    console.error('[Upload Chunk] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ 
      error: 'Erro ao processar chunk',
      details: errorMessage 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
