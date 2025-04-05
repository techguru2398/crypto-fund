import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';
import { getLatestNAV } from '@/lib/nav';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest, user: any) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const { destination_amount, input_method } = await req.json();
    
    const amount_usd = input_method == 'fiat' ? destination_amount : destination_amount * await getLatestNAV();
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
        {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Fiat Deposit',
                },
                unit_amount: Math.round(amount_usd * 100),
            },
            quantity: 1,
        },
        ],
        customer_email: user.email,
        success_url: `${process.env.APP_URL}/investment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/investment`,
        metadata: {
            type: 'checkout',
            user_email: user.email,
        },
        payment_intent_data: {
          metadata: {
            type: 'checkout',
            user_email: user.email,
          }
        }
    });
    console.log("checkout session: ", session);
    return NextResponse.json({ id: session.id });
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}