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

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
