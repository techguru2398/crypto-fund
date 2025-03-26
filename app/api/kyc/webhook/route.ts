import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const event = await req.json();
    const { applicantId, externalUserId, reviewResult } = event;
    const status = reviewResult?.reviewAnswer || 'UNKNOWN';

    console.log(`📬 KYC update for ${externalUserId} → ${status}`);

    // TODO: Optional — update DB with KYC result
    // await pool.query('UPDATE users SET kyc_status = $1 WHERE email = $2', [status, externalUserId]);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('❌ KYC webhook error:', err.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
