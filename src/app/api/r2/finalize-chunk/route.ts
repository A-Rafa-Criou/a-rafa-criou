import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { uploadToR2, generateFileKey } from '@/lib/r2-utils';

// Interface compartilhada
interface UploadMetadata {
  fileName: string;
  fileType: string;
  totalChunks: number;
  fileSize: number;
}

// Usar Map global compartilhado
declare global {
  var uploadChunksStore: Map<string, { chunks: Buffer[], metadata: UploadMetadata }> | undefined;
}

if (!global.uploadChunksStore) {
  global.uploadChunksStore = new Map();
}

const uploadChunks = global.uploadChunksStore;

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

    const upload = uploadChunks.get(uploadId);
    if (!upload) {
      return NextResponse.json({ error: 'Upload não encontrado' }, { status: 404 });
    }

    const { chunks, metadata } = upload;
    
    // Verificar se todos os chunks foram recebidos
    const receivedChunks = chunks.filter(Boolean).length;
    if (receivedChunks !== metadata.totalChunks) {
      return NextResponse.json({ 
        error: `Faltam chunks: ${receivedChunks}/${metadata.totalChunks}` 
      }, { status: 400 });
    }

    console.log(`[Finalize] Juntando ${metadata.totalChunks} chunks de ${metadata.fileName}`);

    // Juntar todos os chunks
    const completeFile = Buffer.concat(chunks);

    console.log(`[Finalize] Arquivo completo: ${(completeFile.length / 1024 / 1024).toFixed(2)}MB`);

    // Gerar chave única
    const fileKey = generateFileKey(metadata.fileName);

    // Upload para R2
    await uploadToR2(fileKey, completeFile, metadata.fileType);

    // Limpar chunks da memória
    uploadChunks.delete(uploadId);

    console.log(`[Finalize] ✅ Completo: ${fileKey}`);

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
    return NextResponse.json({ 
      error: 'Erro ao finalizar upload', 
      details: errorMessage 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
