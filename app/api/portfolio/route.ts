import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest, user: any) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const email = user.email;
    console.log("email : ", email);
  if (!email) {
    return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
  }

  try {
    const [navRes, unitsRes] = await Promise.all([
      pool.query("SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1"),
      pool.query("SELECT units FROM user_units WHERE email = $1", [email])
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

export const GET = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
