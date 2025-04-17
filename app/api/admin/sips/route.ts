import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const corsResponse = applyCors(req);
    if (corsResponse) return corsResponse;
    
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const fund = searchParams.get('fund') || '';  
    const limit = 10;
    const offset = (page - 1) * limit;
    console.log("page: ", page);
    console.log("search: ", search);
    console.log("status: ", status);
    console.log("fund: ", fund);

    let whereClauses: string[] = [];
    let values: any[] = [];

    if (search) {
        whereClauses.push(`email ILIKE $${values.length + 1}`);
        values.push(`%${search}%`);
    }

    if (status && status !== 'all') {
        whereClauses.push(`status = $${values.length + 1}`);
        values.push(status);
    }

    if (fund && fund !== 'all') {
        whereClauses.push(`fund_id = $${values.length + 1}`);
        values.push(fund);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
        const countRes = await pool.query(
        `SELECT COUNT(*) FROM sip_schedule ${whereSQL}`,
        values
        );
        const total = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        const dataRes = await pool.query(
        `SELECT id, email, fund_id, amount_usd, frequency, status, next_run, created_at, updated_at
        FROM sip_schedule
        ${whereSQL}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
        values
        );

        return NextResponse.json({
        rows: dataRes.rows,
        totalPages,
        });
    } catch (err) {
        console.error('❌ Error fetching SIPs:', err);
        return NextResponse.json({ error: 'Failed to fetch SIPs' }, { status: 500 });
    }
}