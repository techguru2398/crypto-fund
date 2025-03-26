import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; // ✅ correct import

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const result = await pool.query(`
      SELECT date, nav
      FROM nav_history
      ORDER BY date ASC
    `);

    const nav_series = result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      nav: parseFloat(row.nav),
    }));

    return NextResponse.json({ nav_series });
  } catch (err: any) {
    console.error('❌ NAV chart fetch error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch NAV chart data' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
