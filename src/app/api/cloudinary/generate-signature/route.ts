import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Gera assinatura para upload direto do browser para Cloudinary
 * Elimina o gargalo de passar pelo backend
 */
export async function POST(request: NextRequest) {
  try {
    const { folder = 'products' } = await request.json();

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
    const baseFolder = process.env.CLOUDINARY_FOLDER || 'a-rafa-criou';
    const folderPath = `${baseFolder}/images/${folder}`;

    // Parâmetros para o upload
    const params = {
      timestamp,
      folder: folderPath,
      upload_preset: uploadPreset,
    };

    // Gera assinatura usando a API do Cloudinary
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: folderPath,
      uploadPreset,
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    return NextResponse.json({ error: 'Failed to generate signature' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
