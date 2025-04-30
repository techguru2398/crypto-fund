import { NextRequest, NextResponse } from 'next/server';
import { transferUsdToExchange, getFiatBalance } from '@/lib/fireblocks';
import { applyCors } from '@/lib/cors';
import { pool } from '@/lib/db';

const FIAT_TRANSFER_THRESHOLD = Number(process.env.FIREBLOCKS_FIAT_TRANSFER_THRESHOLD);

async function handler(req: NextRequest ) {
  try {
    const currentBalance = await getFiatBalance();
    console.log("Current BCB USD Balance:", currentBalance);

    if (currentBalance >= FIAT_TRANSFER_THRESHOLD) {
      await transferUsdToExchange(currentBalance);
      return NextResponse.json({ success: true, transferred: currentBalance });
    } else {
      return NextResponse.json({ success: false, message: "Threshold not met", balance: currentBalance });
    }
  } catch (err) {
    console.error('Failed to check or transfer fiat balance:', err);
    return NextResponse.json({ error: 'Failed to check or transfer fiat balance' }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}