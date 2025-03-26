import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  if (applyCors(req)) return new NextResponse(null, { status: 204 });

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
  }

  try {
    const unitRes = await pool.query(
      `SELECT units FROM user_units WHERE email = $1`,
      [email]
    );

    if (unitRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const units = parseFloat(unitRes.rows[0].units);

    const navRes = await pool.query(
      `SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1`
    );

    const nav = parseFloat(navRes.rows[0].nav);
    const value = parseFloat((units * nav).toFixed(2));

    return NextResponse.json({
      email,
      units,
      nav,
      value,
    });
  } catch (err: any) {
    console.error('❌ Error in user portfolio:', err.message);
    return NextResponse.json({ error: 'Failed to fetch user portfolio' }, { status: 500 });
  }
}
