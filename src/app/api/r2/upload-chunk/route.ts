import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadChunks } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const fileType = formData.get('fileType') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);

    if (!chunk || !uploadId) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    // OTIMIZAÇÃO: Converter para Base64 de forma mais eficiente (uma única operação)
    const buffer = Buffer.from(await chunk.arrayBuffer());
    const chunkBase64 = buffer.toString('base64');

    // Salvar chunk no banco (upsert)
    await db
      .insert(uploadChunks)
      .values({
        uploadId,
        chunkIndex,
        chunkData: chunkBase64,
        fileName,
        fileType,
        totalChunks,
        fileSize,
      })
      .onConflictDoUpdate({
        target: [uploadChunks.uploadId, uploadChunks.chunkIndex],
        set: { chunkData: chunkBase64 },
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
