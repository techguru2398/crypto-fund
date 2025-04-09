import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const email = session.user.email;
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

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
