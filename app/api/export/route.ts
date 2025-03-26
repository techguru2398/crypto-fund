import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db'; // global pg.Pool setup
import { stringify } from 'csv-stringify/sync';
import { applyCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: "Missing 'email' query param" }, { status: 400 });
  }

  try {
    const [investments, redemptions] = await Promise.all([
      pool.query(
        `SELECT timestamp, amount_usd, units, asset_id, asset_share
         FROM investment_ledger
         WHERE email = $1
         ORDER BY timestamp`,
        [email]
      ),
      pool.query(
        `SELECT timestamp, units, value_usd
         FROM redemptions
         WHERE email = $1
         ORDER BY timestamp`,
        [email]
      ),
    ]);

    const records: (string | number)[][] = [
      ['Type', 'Timestamp', 'Amount USD', 'Units', 'Asset ID', 'Asset Share'],
    ];

    for (const row of investments.rows) {
      records.push([
        'Investment',
        row.timestamp,
        row.amount_usd,
        row.units,
        row.asset_id,
        row.asset_share,
      ]);
    }

    for (const row of redemptions.rows) {
      records.push([
        'Redemption',
        row.timestamp,
        row.value_usd,
        row.units,
        '',
        '',
      ]);
    }

    const csv = stringify(records);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=portfolio_${email}.csv`,
      },
    });
  } catch (err: any) {
    console.error('❌ CSV export error:', err.message);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
