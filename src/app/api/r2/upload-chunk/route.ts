import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parse do FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;

    if (!file || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    console.log(`[Upload Chunk] ${fileName} - Chunk ${chunkIndex + 1}/${totalChunks}`);

    // Criar diretório temporário para o upload
    const uploadDir = join(tmpdir(), 'r2-uploads', uploadId);
    await mkdir(uploadDir, { recursive: true });

    // Salvar chunk no sistema de arquivos temporário
    const chunkPath = join(uploadDir, `chunk-${chunkIndex}`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(chunkPath, buffer);

    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      uploadId
    });
  } catch (error) {
    console.error('[Upload Chunk] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao processar chunk',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
