import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; 
import { withAuth } from '@/lib/authMiddleware';

async function getNavHandler(req: NextRequest, user: any) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  console.log("✅ Authenticated user:", user.email);
  console.log("database", process.env.DATABASE_URL);

  try {
    const result = await pool.query(`
      SELECT date, total_value, total_units, nav
      FROM nav_history
      ORDER BY date DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No NAV data found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error('❌ NAV fetch error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch NAV' }, { status: 500 });
  }
}

export const GET = withAuth(getNavHandler);

// Allow preflight CORS
export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
