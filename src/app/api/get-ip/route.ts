import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Tentar obter IP de headers do proxy/CDN
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  // Prioridade: Cloudflare > X-Forwarded-For > X-Real-IP
  const ip = cfConnectingIp || forwarded?.split(',')[0] || realIp || 'unknown';

  return NextResponse.json({ ip });
}
