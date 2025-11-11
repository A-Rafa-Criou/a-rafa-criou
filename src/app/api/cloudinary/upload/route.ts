import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';

/**
 * POST /api/cloudinary/upload
 * Upload de imagem para Cloudinary (OTIMIZADO)
 */
export async function POST(request: NextRequest) {
  try {
    // OTIMIZAÇÃO: Validação rápida sem checks desnecessários
    const body = await request.json();
    const { image, folder } = body;

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Upload para Cloudinary (rápido e direto)
    const result = await uploadImageToCloudinary(image, {
      folder: folder || 'products',
    });

    return NextResponse.json({
      cloudinaryId: result.publicId,
      url: result.secureUrl,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    });
  } catch {
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
