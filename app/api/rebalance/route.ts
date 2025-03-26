import { NextRequest, NextResponse } from 'next/server';
import { rebalancePortfolio } from '@/lib/rebalance';
import { applyCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    await rebalancePortfolio();
    return NextResponse.json({ status: 'Rebalance triggered' });
  } catch (err: any) {
    console.error('❌ Rebalance error:', err.message);
    return NextResponse.json({ error: 'Rebalance failed' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
