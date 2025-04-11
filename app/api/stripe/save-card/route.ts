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
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });
        const payment_methods = paymentMethods.data.map((payment) => {
          return {
            id: payment.id,
            brand: payment.card?.brand,
            exp_month: payment.card?.exp_month,
            exp_year: payment.card?.exp_year,
            last4: payment.card?.last4
          }
        })
    
        return NextResponse.json({ success: true, payment_methods: payment_methods });
      } catch (err: any) {
        console.error("❌ Save stripe payment method error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}