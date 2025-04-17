import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function getNavHandler(req: NextRequest) {
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
      SELECT date, total_value, total_units, nav
      FROM nav_history 
      WHERE fund_id=$1
      ORDER BY date DESC
      LIMIT 1
    `, [fundId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No NAV data found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error('❌ NAV fetch error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = getNavHandler;

// Allow preflight CORS
export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
