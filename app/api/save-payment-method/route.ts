import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';
import { pool } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest, user: any) {
    console.log("aaaaaaa:", user.email);
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const email = user.email;
    try {
        const { payment_method_id } = await req.json();
        console.log("payment: ", payment_method_id);
        await pool.query(
            'UPDATE user_info SET stripe_payment_method_id = $1 WHERE email = $2',
            [payment_method_id, email]
        );
        return NextResponse.json({ success: true });
      } catch (err: any) {
        console.error("❌ Save stripe payment method error:", err.message);
        return NextResponse.json({ error: "Save strpe payment method failed" }, { status: 500 });
      }
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}