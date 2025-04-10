import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/hash';

async function handler(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;
    const email = session.user.email;
    if (!email) {
        return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
    }
    try {
        const res = await pool.query("SELECT * FROM user_info WHERE email = $1", [email]);
        const user = res.rows[0];
        if (!user) throw new Error("User not found or missing password");

        const hashed = await hashPassword(newPassword);
        if (!user.password_hash) {
            await pool.query(
                'UPDATE user_info SET password_hash = $1 WHERE email = $2',
                [hashed, email]
            );
            return NextResponse.json({ success: true, newPassword: hashed });
        }
        const isValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isValid) 
            throw new Error("Wrong password");

        await pool.query(
            'UPDATE user_info SET password_hash = $1 WHERE email = $2',
            [hashed, email]
        );
        return NextResponse.json({ success: true, newPassword: hashed });
    } catch (err: any) {
        console.error("❌ Change password error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
