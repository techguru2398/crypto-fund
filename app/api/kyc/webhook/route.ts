import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[✅ Webhook received]', body);

    if (body.type === 'applicantReviewed') {
      const { reviewResult, externalUserId } = body;

      const isVerified = reviewResult.reviewAnswer === 'GREEN';

      await pool.query(
        'UPDATE user_info SET verified = $1 WHERE email = $2',
        [isVerified, externalUserId]
      );
      console.log(`✅ User ${externalUserId} verified: ${isVerified}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[❌ Webhook error]', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
