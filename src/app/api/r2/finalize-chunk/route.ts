import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, generateFileKey } from '@/lib/r2-utils';
import { db } from '@/lib/db';
import { uploadChunks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    // Buscar chunks (otimizado - select mínimo)
    const chunks = await db
      .select()
      .from(uploadChunks)
      .where(eq(uploadChunks.uploadId, uploadId))
      .orderBy(asc(uploadChunks.chunkIndex));

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Debug: ver formato dos dados
    console.log('[CHUNK DEBUG]', {
      type: typeof chunks[0].chunkData,
      isBuffer: Buffer.isBuffer(chunks[0].chunkData),
      isUint8Array: chunks[0].chunkData instanceof Uint8Array,
      firstBytes:
        typeof chunks[0].chunkData === 'string' ? chunks[0].chunkData.slice(0, 20) : 'not string',
    });

    // OTIMIZAÇÃO: Converter chunks para Buffer
    // PostgreSQL bytea vem como Buffer no Node, mas Drizzle pode retornar em diferentes formatos
    const buffers = chunks.map(c => {
      const data = c.chunkData;

      // Se já é Buffer, usar direto
      if (Buffer.isBuffer(data)) {
        return data;
      }

      // Se é Uint8Array, converter para Buffer
      if (data instanceof Uint8Array) {
        return Buffer.from(data);
      }

      // Se é string (bytea vem como hex ou base64), tentar detectar formato
      if (typeof data === 'string') {
        // Se começa com \x, é formato PostgreSQL bytea escape
        if (data.startsWith('\\x')) {
          return Buffer.from(data.slice(2), 'hex');
        }
        // Senão, tentar como buffer direto
        return Buffer.from(data, 'binary');
      }

      // Fallback: converter objeto para buffer
      return Buffer.from(data as unknown as ArrayBuffer);
    });

    const completeFile = Buffer.concat(buffers);

    // Gerar chave e fazer upload + cleanup em paralelo
    const fileKey = generateFileKey(chunks[0].fileName);

    await Promise.all([
      uploadToR2(fileKey, completeFile, chunks[0].fileType),
      db.delete(uploadChunks).where(eq(uploadChunks.uploadId, uploadId)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        originalName: chunks[0].fileName,
        size: completeFile.length,
        type: chunks[0].fileType,
      },
    });
  } catch (error) {
    console.error('[FINALIZE ERROR]', error);
    return NextResponse.json(
      {
        error: 'Failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
