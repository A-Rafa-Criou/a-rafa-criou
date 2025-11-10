import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { uploadToR2, generateFileKey } from '@/lib/r2-utils';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, fileName, fileSize, fileType, totalChunks } = body;

    if (!uploadId || !fileName || !fileSize || !fileType || !totalChunks) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    console.log(`[Finalize Upload] ${fileName} - Juntando ${totalChunks} chunks`);

    // Diretório com os chunks
    const uploadDir = join(tmpdir(), 'r2-uploads', uploadId);

    // Ler todos os chunks na ordem
    const chunks: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(uploadDir, `chunk-${i}`);
      const chunkData = await readFile(chunkPath);
      chunks.push(chunkData);
    }

    // Juntar todos os chunks em um único buffer
    const completeFile = Buffer.concat(chunks);

    console.log(`[Finalize Upload] Arquivo completo: ${fileName} (${(completeFile.length / 1024 / 1024).toFixed(2)}MB)`);

    // Gerar chave única para o arquivo
    const fileKey = generateFileKey(fileName);

    // Upload para Cloudflare R2
    await uploadToR2(fileKey, completeFile, fileType);

    // Limpar arquivos temporários
    await rm(uploadDir, { recursive: true, force: true }).catch(console.error);

    // URL pública do arquivo
    const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${fileKey}`;

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        originalName: fileName,
        size: fileSize,
        type: fileType,
        url: publicUrl,
      },
    });
  } catch (error) {
    console.error('[Finalize Upload] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        error: 'Erro ao finalizar upload',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
