import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors';
import { pool } from '@/lib/db'; // global pg.Pool export

export async function GET(req: NextRequest) {
  const cors = applyCors(req);
  if (cors) return cors;

  try {
    const [userCountRes, unitTotalRes, navRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM user_units WHERE units > 0`),
      pool.query(`SELECT SUM(units) AS total_units FROM user_units`),
      pool.query(`SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1`)
    ]);

    const userCount = parseInt(userCountRes.rows[0].count);
    const totalUnits = parseFloat(unitTotalRes.rows[0].total_units || 0);
    const nav = parseFloat(navRes.rows[0].nav);
    const totalAUM = parseFloat((nav * totalUnits).toFixed(2));

    return NextResponse.json({
      user_count: userCount,
      total_units: totalUnits,
      nav,
      aum_usd: totalAUM
    });
  } catch (err: any) {
    console.error('❌ Stats fetch error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
