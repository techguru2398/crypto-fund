import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; // ✅ correct import
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log("✅ Authenticated user:", session.user.email);
  const { searchParams } = new URL(req.url);

  const fundId = searchParams.get('fundId');
  try {
    const result = await pool.query(`
      SELECT date, nav
      FROM nav_history
      WHERE fund_id=$1
      ORDER BY date ASC
    `, [fundId]);

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
