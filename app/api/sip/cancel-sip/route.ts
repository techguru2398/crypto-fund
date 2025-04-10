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

    const body = await req.json();
    const { sipId } = body;
    const email = session.user.email;
    if (!email) {
        return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
    }
    const now = new Date().toISOString();
    try {
        await pool.query(
            `UPDATE sip_schedule SET status = $1 WHERE id = $2`,
            ['cancelled', sipId]
        );

        const result = await pool.query(
            `SELECT * FROM sip_schedule WHERE email = $1 AND status != 'cancelled'`,
            [email]
        );
      
        console.log("sip:", result.rows);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (err: any) {
        console.error("❌ Edit sip error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
