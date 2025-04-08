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
    const email = session.user.email as string;
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

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}