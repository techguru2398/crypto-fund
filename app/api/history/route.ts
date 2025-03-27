import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
      return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
    }
    
    try {
        const [investments, redemptions] = await Promise.all([
            pool.query(
                `SELECT timestamp, amount_usd, units, asset_id, asset_share
                FROM investment_ledger
         WHERE email = $1
         ORDER BY timestamp DESC`,
         [email]
        ),
        pool.query(
            `SELECT timestamp, units, value_usd
            FROM redemptions
            WHERE email = $1
            ORDER BY timestamp DESC`,
            [email]
        )
    ]);
    console.log("investments : ", investments.rows);
    console.log("redemptions : ", redemptions.rows);

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

export const GET = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
