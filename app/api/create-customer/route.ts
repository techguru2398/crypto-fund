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

    const customer = await stripe.customers.create({ email });
    console.log("customer id: ", customer.id);
    const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
    });

    
    // await pool.query(
    //     'UPDATE user_info SET stripe_customer_id = $1 WHERE email = $2',
    //     [customer.id, email]
    // );
    return NextResponse.json({ client_secret: setupIntent.client_secret });
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}