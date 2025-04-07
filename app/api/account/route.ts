import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest, user: any) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const email = user.email;
    const result = await pool.query(
        `SELECT * FROM user_info WHERE email = $1`,
        [email]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error('❌ Error in account info:', err.message);
    return NextResponse.json({ error: 'Failed to fetch account info' }, { status: 500 });
  }
}

export const GET = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
