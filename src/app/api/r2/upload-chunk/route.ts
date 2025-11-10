import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Armazena chunks em memória temporariamente
interface UploadMetadata {
  fileName: string;
  fileType: string;
  totalChunks: number;
  fileSize: number;
}

// Usar Map global compartilhado entre rotas
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

    // Converter chunk para Buffer
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Criar entrada se não existir
    if (!uploadChunks.has(uploadId)) {
      const chunks: Buffer[] = new Array(totalChunks);
      uploadChunks.set(uploadId, { 
        chunks, 
        metadata: { fileName, fileType, totalChunks, fileSize } 
      });
    }

    // Armazenar chunk na posição correta
    const upload = uploadChunks.get(uploadId)!;
    upload.chunks[chunkIndex] = buffer;

    const received = upload.chunks.filter(Boolean).length;
    
    console.log(`[Chunk] ${fileName} - ${received}/${totalChunks} (${(buffer.length / 1024).toFixed(0)}KB)`);

    return NextResponse.json({ 
      success: true, 
      chunkIndex, 
      received,
      total: totalChunks,
      progress: Math.round((received / totalChunks) * 100)
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
