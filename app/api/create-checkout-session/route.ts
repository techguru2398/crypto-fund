import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest, user: any) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const { destination_amount } = await req.json();

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
                unit_amount: Math.round(destination_amount * 100),
            },
            quantity: 1,
        },
        ],
        customer_email: user.email,
        success_url: `${process.env.APP_URL}/investment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/investment`,
    });

    return NextResponse.json({ id: session.id });
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}