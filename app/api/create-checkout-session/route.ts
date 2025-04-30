import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { getLatestNAV } from '@/lib/nav';
import { pool } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest ) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const result = await pool.query(
        `SELECT verified FROM user_info WHERE email = $1`,
        [email]
    );
    if(!result.rows[0].verified) {
        return NextResponse.json({ error: "You are not verified yet." });
    }

    const { destination_amount, input_method, fund_id } = await req.json();
    
    const nav = await getLatestNAV(fund_id);
    const amount_usd = input_method == 'fiat' ? destination_amount : destination_amount * nav;
    const units = input_method == 'fiat' ? destination_amount / nav : destination_amount;

    const checkoutSession = await stripe.checkout.sessions.create({
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
        customer_email: session.user.email as string,
        success_url: `${process.env.APP_URL}/investment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/investment`,
        metadata: {
            type: 'checkout',
            user_email: session.user.email as string,
            nav: nav,
            units: units,
            fund_id: fund_id,
        },
        payment_intent_data: {
          metadata: {
            type: 'checkout',
            user_email: session.user.email as string,
            nav: nav,
            units: units,
            fund_id: fund_id,
          }
        }
    });
    // console.log("checkout session: ", checkoutSession);
    return NextResponse.json({ id: checkoutSession.id });
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}