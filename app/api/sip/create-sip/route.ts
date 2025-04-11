import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

async function handler(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const user = await pool.query(
        `SELECT verified FROM user_info WHERE email = $1`,
        [email]
    );
    if(!user.rows[0].verified) {
        return NextResponse.json({ error: "You are not verified yet." });
    }
    
    const body = await req.json();
    const { data } = body;
    const { amount, frequency, status, startDate, fund_id, payment_method_id} = data;
    const now = new Date().toISOString();
    try {
        // const result = await pool.query(
        //     `SELECT * FROM sip_schedule WHERE email = $1 AND status != 'cancelled'`,
        //     [email]
        // );
        // if (result.rows.length > 0) {
        //     return NextResponse.json({ success: false, error: "Sip is already exist." });
        // }
        const result = await pool.query(
            `INSERT INTO sip_schedule (email, amount_usd, fund_id, frequency, stripe_payment_method_id, next_run, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [email, amount, fund_id, frequency, payment_method_id, startDate, status, now, now]
        );

        return NextResponse.json({ 
            success: true, 
            data: {
                id: result.rows[0].id,
                email: email,
                amount_usd: amount,
                fund_id: fund_id,
                frequency: frequency,
                stripe_payment_method_id: payment_method_id,
                next_run: startDate,
                status: status,
                created_at: now,
                updated_at: now,
            }, 
        });
    } catch (err: any) {
        console.error("❌ Create sip error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
