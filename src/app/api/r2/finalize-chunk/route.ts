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

    // OTIMIZAÇÃO: Chunks já são Buffer (bytea do PostgreSQL)
    // TypeScript vê como string, mas runtime é Buffer
    const buffers = chunks.map(c => c.chunkData as unknown as Buffer);
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
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
