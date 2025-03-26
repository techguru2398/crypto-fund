import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; // adjust path if needed

export async function GET(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;

    const res = NextResponse;
    console.log("database", process.env.DATABASE_URL);
    try {
        const result = await pool.query(`
        SELECT date, total_value, total_units, nav
        FROM nav_history
        ORDER BY date DESC
        LIMIT 1
        `);

        if (result.rows.length === 0) {
        return res.json({ error: 'No NAV data found' }, { status: 404 });
        }

        return res.json(result.rows[0]);
    } catch (err: any) {
        console.error('❌ NAV fetch error:', err.message);
        return res.json({ error: 'Failed to fetch NAV' }, { status: 500 });
    }
}

// Handle preflight requests
export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}
