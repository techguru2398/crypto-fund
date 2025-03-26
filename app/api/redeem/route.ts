import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors';
import { redeemUnits } from '@/lib/redemption';

export async function POST(req: NextRequest) {
  const cors = applyCors(req);
  if (cors) return cors;

  try {
    const { email, units } = await req.json();

    if (!email || !units || isNaN(units)) {
      return NextResponse.json(
        { error: 'Missing or invalid email/units' },
        { status: 400 }
      );
    }

    await redeemUnits(email, parseFloat(units));
    return NextResponse.json({
      status: 'Redemption processed successfully',
    });
  } catch (err: any) {
    console.error(`❌ Redemption failed:`, err.message);
    return NextResponse.json(
      { error: err.message || 'Redemption failed' },
      { status: 500 }
    );
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
