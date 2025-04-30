import { NextRequest, NextResponse } from 'next/server';
import { runSIPForDueUsers } from '@/lib/sip';
import { applyCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const cors = applyCors(req);
  if (cors) return cors;

  try {
    await runSIPForDueUsers();
    return NextResponse.json({ status: 'SIP triggered successfully' });
  } catch (err: any) {
    console.error('❌ SIP cron error:', err.message);
    return NextResponse.json({ error: 'SIP execution failed' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
