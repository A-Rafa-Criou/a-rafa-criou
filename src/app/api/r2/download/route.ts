import { NextRequest, NextResponse } from 'next/server';
import { getR2SignedUrl } from '@/lib/r2-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const r2Key = searchParams.get('r2Key');
    if (!r2Key) return NextResponse.json({ error: 'Missing r2Key' }, { status: 400 });

    // Short TTL for preview links
    const ttl = 60; // seconds

    const signed = await getR2SignedUrl(String(r2Key), ttl);

    // Fetch the signed URL and stream the response back to the client.
    // This avoids redirect-following issues when the Next/Image optimizer requests the URL.
    const fetched = await fetch(signed);
    if (!fetched.ok) {
      console.error('❌ [R2 Download] Failed to fetch:', {
        status: fetched.status,
        statusText: fetched.statusText,
        r2Key,
      });
      return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 502 });
    }

    // Validate content-type (basic guard)
    const contentType = fetched.headers.get('content-type') || 'application/octet-stream';
    const isValidType = contentType.startsWith('image/') || 
                        contentType.startsWith('application/pdf') ||
                        contentType.includes('zip');
    
    if (!isValidType) {
      // Still proxy it, but clients that expect an image may complain; return 415 to be explicit
      console.warn('⚠️ [R2 Download] Unexpected content-type:', contentType);
      return NextResponse.json({ error: 'Resource is not a valid file type (image, pdf, or zip)' }, { status: 415 });
    }

    const body = await fetched.arrayBuffer();

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // short cache for signed preview
      'Cache-Control': `public, max-age=${Math.max(0, Math.min(60, ttl))}`,
    };

    return new NextResponse(Buffer.from(body), { headers });
  } catch (error) {
    console.error('❌ [R2 Download] Error:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
