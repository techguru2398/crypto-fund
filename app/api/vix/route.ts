import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import yahooFinance from 'yahoo-finance2';
import { getVIX } from '@/lib/vix';

async function getVixHandler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const vix = await getVIX();
    return NextResponse.json(vix);
  } catch (err: any) {
    console.error('❌ NAV fetch error:', err.message);
    return NextResponse.json(0);
  }
}

export const GET = getVixHandler;

// Allow preflight CORS
export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
