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
          `SELECT email, asset_id, asset_share, asset_value, units, fireblocks_tx_id, timestamp
           FROM investment_ledger
           WHERE fund_id = $1
           ORDER BY timestamp DESC`,
          [fundId]
        );
    
        const rows = res.rows;
    
        const csv = [
          ['email', 'asset_id', 'asset_share', 'asset_value', 'units', 'fireblocks_tx_id', 'timestamp'],
          ...rows.map((r) => [
            r.email,
            r.asset_id,
            r.asset_share,
            r.asset_value,
            r.units,
            r.fireblocks_tx_id,
            r.timestamp.toISOString(),
          ]),
        ]
          .map((row) => row.join(','))
          .join('\n');
    
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=ledger_${fundId}.csv`,
          },
        });
      } catch (err) {
        console.error('❌ Error exporting ledger CSV:', err);
        return NextResponse.json({ error: 'Failed to export ledger' }, { status: 500 });
    }
}
