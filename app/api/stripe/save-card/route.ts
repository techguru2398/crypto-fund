import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    try {
        const { payment_method_id, customerId } = await req.json();
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: customerId,
        });
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

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}