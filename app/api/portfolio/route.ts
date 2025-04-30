import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);
  if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;

  const { searchParams } = new URL(req.url);
  const fundId = searchParams.get('fundId');

  try {
    const [navRes, unitsRes] = await Promise.all([
      pool.query("SELECT nav FROM nav_history WHERE fund_id = $1 ORDER BY date DESC LIMIT 1", [fundId]),
      pool.query("SELECT units FROM user_units WHERE email = $1 AND fund_id = $2", [email, fundId])
    ]);

    if (navRes.rows.length === 0) {
      return NextResponse.json({ error: "No NAV available" }, { status: 404 });
    }
    console.log("navRes:", navRes.rows);
    console.log("unitsRes:", unitsRes.rows);

    const nav = parseFloat(navRes.rows[0].nav);
    const units = unitsRes.rows.length > 0 ? parseFloat(unitsRes.rows[0].units) : 0;
    const value_usd = nav * units;

    return NextResponse.json({
      email,
      units,
      nav,
      value_usd: parseFloat(value_usd.toFixed(2)),
    });
  } catch (err: any) {
    console.error("❌ Portfolio fetch error:", err.message);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
