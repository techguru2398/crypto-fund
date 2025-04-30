import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; 
import { getCurrentHoldings } from '@/lib/fireblocks';
import { funds } from '@/lib/fund';

async function handler(req: NextRequest ) {
  try {
    for (const fund of funds) {
      const holdings = await getCurrentHoldings(fund.id);
      const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.value, 0);
      const unitTotalRes = await pool.query(`SELECT SUM(units) AS total_units FROM user_units WHERE fund_id = $1`,
        [fund.id]
      );
      const totalUnits = parseFloat(unitTotalRes.rows[0].total_units || 0);
      const nav = totalUnits == 0 ? 0 : totalValue / totalUnits;
      await pool.query(
        `INSERT INTO nav_history (total_value, total_units, nav, fund_id) VALUES ($1, $2, $3, $4)`,
        [totalValue, totalUnits, nav, fund.id]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to log nav data:', err);
    return NextResponse.json({ error: 'Failed to log nav data' }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}
