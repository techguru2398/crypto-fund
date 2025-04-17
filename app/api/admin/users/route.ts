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
    const role = searchParams.get('role') || '';
    const kyc = searchParams.get('kyc') || '';
    const limit = 10;
    const offset = (page - 1) * limit;
    console.log("page: ", page);
    console.log("search: ", search);
    console.log("role: ", role);
    console.log("kyc: ", kyc);

    let whereClauses: string[] = [];
    let values: any[] = [];

    if (search) {
        whereClauses.push(`(name ILIKE $${values.length + 1} OR email ILIKE $${values.length + 1})`);
        values.push(`%${search}%`);
    }

    if (role && role !== 'all') {
        whereClauses.push(`role = $${values.length + 1}`);
        values.push(role);
    }

    if (kyc && kyc !== 'all') {
        const kycBool = kyc === 'approved';
        whereClauses.push(`verified = $${values.length + 1}`);
        values.push(kycBool);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    console.log("wheresql: ", whereSQL);
    console.log("values: ", values);
    try {
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM user_info ${whereSQL}`,
            values
        );
        const total = parseInt(countRes.rows[0].count);
        console.log("total: ", total);
        const totalPages = Math.ceil(total / limit);

        const dataRes = await pool.query(
            `SELECT id, name, email, role, verified, created_at
            FROM user_info
            ${whereSQL}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}`,
            values
        );
        console.log("dataRes: ", dataRes);
        return NextResponse.json({
            rows: dataRes.rows,
            totalPages,
        });
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
