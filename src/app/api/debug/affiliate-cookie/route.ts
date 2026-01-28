import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const affiliateCode = cookieStore.get('affiliate_code')?.value;

  return NextResponse.json({
    affiliate_code: affiliateCode || null,
    has_cookie: !!affiliateCode,
  });
}
