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
    const result = await pool.query(
      `SELECT * FROM sip_schedule WHERE email = $1 AND status != 'cancelled'`,
      [email]
    );

    console.log("sip:", result.rows);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("❌ Portfolio sip error:", err.message);
    return NextResponse.json({ error: "Failed to fetch sip" }, { status: 500 });
  }
}

export const GET = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
