// /api/admin/nav-history/export/route.ts
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
    const fundId = searchParams.get('fundId') || 'hodl_index';

    try {
        const res = await pool.query(
        `SELECT date, nav, total_value, total_units
        FROM nav_history
        WHERE fund_id = $1
        ORDER BY date DESC`,
        [fundId]
        );

        const rows = res.rows;

        const csv = [
        ['date', 'nav', 'total_value', 'total_units'],
        ...rows.map((r) => [
            r.date.toISOString(),
            r.nav,
            r.total_value,
            r.total_units,
        ]),
        ]
        .map((row) => row.join(','))
        .join('\n');

        return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=nav_history_${fundId}.csv`,
        },
        });
    } catch (err) {
        console.error('❌ Error exporting NAV CSV:', err);
        return NextResponse.json({ error: 'Failed to export nav history' }, { status: 500 });
    }
}
