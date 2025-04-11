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
    const body = await req.json();
    const { payment_method_id, customerId } = body;
    try {
        const sip = await pool.query(
            `SELECT * FROM sip_schedule WHERE email = $1 AND status != 'cancelled' AND stripe_payment_method_id = $2`,
            [email, payment_method_id]
        );
        if(sip.rows.length > 0) {
            return NextResponse.json({ error: "This payment method is connected the SIP" });
        }

        const detached = await stripe.paymentMethods.detach(payment_method_id);
        console.log("detached: ", detached);
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
        console.error("❌ Remove stripe payment method error:", err.message);
        return NextResponse.json({ error: "Remove stripe payment method failed" }, { status: 500 });
    }
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}