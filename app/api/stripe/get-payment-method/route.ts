import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

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
  try {
    const email = session.user.email;
    const result = await pool.query(
        `SELECT stripe_customer_id FROM user_info WHERE email = $1`,
        [email]
    );
    const user = result.rows[0];
    if(!user.stripe_customer_id) {
      return NextResponse.json({ payment_methods: [] });
    }
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
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

    return NextResponse.json({ payment_methods: payment_methods });
  } catch (err: any) {
    console.error('❌ Get payment method error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
