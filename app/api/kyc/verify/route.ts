import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest, user: any) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const email = user.email;
    try {
        await pool.query(
            'UPDATE user_info SET verified = $1 WHERE email = $2',
            [true, email]
        );
        console.log(`✅ User email verified`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to update verified' }, { status: 500 });
    }
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
