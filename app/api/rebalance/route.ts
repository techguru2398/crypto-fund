import { NextRequest, NextResponse } from 'next/server';
import { rebalancePortfolio } from '@/lib/rebalance';
import { applyCors } from '@/lib/cors';
import { funds } from '@/lib/fund';

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    for (const fund of funds) {
      await rebalancePortfolio(fund.id, false);
    }
    return NextResponse.json({ status: 'Rebalance triggered' });
  } catch (err: any) {
    console.error('❌ Rebalance error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
