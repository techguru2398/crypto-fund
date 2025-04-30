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
    try {
        const countUsers = await pool.query(
            `SELECT COUNT(*) FROM user_info`
        );
        const totalUsers = parseInt(countUsers.rows[0].count);

        const latestFunds = await pool.query(`
            SELECT SUM(latest.total_value) AS total_value_sum
            FROM (
                SELECT fund_id, total_value
                FROM nav_history
                WHERE (fund_id, date) IN (
                    SELECT fund_id, MAX(date)
                    FROM nav_history
                    GROUP BY fund_id
                )
            ) AS latest;
        `);
        const totalFunds = formatCurrency(latestFunds.rows[0].total_value_sum);

        const countSips = await pool.query(
            `SELECT COUNT(*) FROM sip_schedule WHERE status='active'`
        );
        const totalSips = parseInt(countSips.rows[0].count);
        return NextResponse.json({
            users: totalUsers,
            funds: totalFunds,
            sips: totalSips,
        });
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

function formatCurrency(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
}