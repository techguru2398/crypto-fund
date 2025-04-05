import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest, user: any) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT stripe_payment_method_id FROM user_info WHERE email = $1`,
      [email]
    );

    if(result.rows[0].stripe_payment_method_id){
      return NextResponse.json({ exist: true });
    }
    return NextResponse.json({ exist: false });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch payment method state" }, { status: 500 });
  }
}

export const GET = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
