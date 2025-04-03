import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

async function handler(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    const body = await req.json();
    const { email, data } = body;
    const { amount, frequency, status, startDate} = data;
    if (!email) {
        return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
    }
    const now = new Date().toISOString();
    try {
        const result = await pool.query(
            `SELECT * FROM sip_schedule WHERE email = $1 AND status != 'cancelled'`,
            [email]
        );
        if (result.rows.length > 0) {
            return NextResponse.json({ success: false, error: "Sip is already exist." });
        }
        await pool.query(
            `INSERT INTO sip_schedule (email, amount_usd, frequency, next_run, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [email, amount, frequency, startDate, status, now, now]
        );

        return NextResponse.json({ 
            success: true, 
            data: {
                email: email,
                amount_usd: amount,
                frequency: frequency,
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

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
