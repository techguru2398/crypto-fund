import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/hash';

export async function POST(req: NextRequest) {
    const { name, email, password, is_admin = 'user' } = await req.json();
    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    try {
        const existingUser = await pool.query(
            `SELECT 1 FROM user_info WHERE email = $1`,
            [email]
          );
      
          if (existingUser.rowCount > 0) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
          }
        const hashed = await hashPassword(password);

        await pool.query(
            `INSERT INTO user_info (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
            [name, email, hashed, is_admin]
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('❌ Signup error:', err.message);
        return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
    }
}
