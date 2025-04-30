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
  // const email = "jaide@atmax.in";
  try {
    const [investments, redemptions] = await Promise.all([
      pool.query(
        `SELECT timestamp, amount_usd, units, fund_id, status
         FROM investment_log 
         WHERE email = $1 
         ORDER BY timestamp DESC`,
        [email]
      ),
      pool.query(
        `SELECT timestamp, units, value_usd, fund_id, status
        FROM redemption_log
        WHERE email = $1 
        ORDER BY timestamp DESC`,
        [email]
    )
  ]);
  console.log("redemptions: ", redemptions);
  return NextResponse.json({
    email,
    investments: investments.rows,
    redemptions: redemptions.rows
  });
  } catch (err: any) {
    console.error("❌ History fetch error:", err.message);
    return NextResponse.json({ error: "Failed to fetch user history" }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
