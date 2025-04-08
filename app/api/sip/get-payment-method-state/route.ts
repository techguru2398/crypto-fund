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

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
