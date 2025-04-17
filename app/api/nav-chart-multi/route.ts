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

  try {
    // Query daily total_value for each fund
    const res = await pool.query(`
      SELECT 
        date::DATE AS date,
        fund_id,
        ROUND(total_value::NUMERIC, 2) AS total_value
      FROM nav_history
      ORDER BY date ASC
    `);

    const rows = res.rows;

    // Group values by date → { date: { date: 'YYYY-MM-DD', fund_id: total_value } }
    const grouped: Record<string, Record<string, number | string>> = {};

    for (const row of rows) {
      const date = row.date.toISOString().split('T')[0];

      if (!grouped[date]) {
        grouped[date] = { date };
      }

      grouped[date][row.fund_id] = parseFloat(row.total_value);
    }

    const result = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
    console.log("chart: ", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('❌ Error in /api/nav-chart-multi:', err);
    return NextResponse.json({ error: 'Failed to fetch NAV chart data' }, { status: 500 });
  }
}
