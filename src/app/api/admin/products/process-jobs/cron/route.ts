import { NextResponse } from 'next/server';
import { POST as processJobsPOST } from '../route';

// Secure cron trigger for process-jobs
// Expects header: x-cron-secret: <secret>
export async function POST(request: Request) {
  const secret = process.env.PROCESS_JOBS_CRON_SECRET;
  const provided = request.headers.get('x-cron-secret');

  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delegate to the existing processor handler
  try {
    // Call the original POST handler and return its response
    const res = await processJobsPOST();
    return res;
  } catch (err) {
    console.error('Erro no cron trigger process-jobs:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
