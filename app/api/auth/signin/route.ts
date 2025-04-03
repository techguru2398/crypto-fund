import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyPassword } from '@/lib/hash';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  try {
    const result = await pool.query(`SELECT * FROM user_info WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return NextResponse.json({ token }, { status: 200 });
  } catch (err: any) {
    console.error('Signin error:', err.message);
    return NextResponse.json({ error: 'Signin failed' }, { status: 500 });
  }
}
