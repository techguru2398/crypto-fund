import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';
import { pool } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

async function handler(req: NextRequest, user: any) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const email = user.email;
    const result = await pool.query(`
        SELECT stripe_customer_id FROM user_info
    `);
  
    let customerId = result.rows[0].stripe_customer_id;
    if(!customerId){
        const customer = await stripe.customers.create({ email });
        await pool.query(
            'UPDATE user_info SET stripe_customer_id = $1 WHERE email = $2',
            [customerId, email]
        );
        customerId = customer.id;
    }
    console.log("customer id: ", customerId);
    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        usage: 'off_session',
    });

    return NextResponse.json({ client_secret: setupIntent.client_secret });
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}