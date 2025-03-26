import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  if (applyCors(req)) return new NextResponse(null, { status: 204 });

  try {
    const result = await pool.query(
      `SELECT email, units
       FROM user_units
       WHERE units > 0
       ORDER BY email`
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error('❌ Users fetch error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
