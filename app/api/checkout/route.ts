import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export async function POST(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { email, amount } = await req.json();

    if (!email || !amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Missing or invalid email/amount' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Crypto SIP Investment',
            },
            unit_amount: Math.round(amount * 100), // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cancel`,
      metadata: { email, amount: amount.toString() },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err: any) {
    console.error('❌ Stripe Checkout error:', err.message);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
