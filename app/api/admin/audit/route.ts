import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const [unitsRes, navRes] = await Promise.all([
      pool.query("SELECT SUM(units) AS total_units FROM user_units"),
      pool.query("SELECT total_value, total_units, nav, date FROM nav_history ORDER BY date DESC LIMIT 1")
    ]);

    const ledgerUnits = parseFloat(unitsRes.rows[0].total_units) || 0;
    const { total_value, total_units, nav, date } = navRes.rows[0];

    const isSynced = Math.abs(parseFloat(total_units) - ledgerUnits) < 0.0001;

    return NextResponse.json({
      date,
      total_value: parseFloat(total_value),
      nav: parseFloat(nav),
      nav_recorded_units: parseFloat(total_units),
      actual_ledger_units: ledgerUnits,
      synced: isSynced
    });
  } catch (err: any) {
    console.error("❌ Audit fetch error:", err.message);
    return NextResponse.json({ error: "Failed to perform audit" }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
