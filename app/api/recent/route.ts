import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const cors = applyCors(req);
  if (cors) return cors;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
  }

  try {
    const [investmentsRes, redemptionsRes] = await Promise.all([
      pool.query(
        `SELECT timestamp, amount_usd, units, nav
         FROM investment_log
         WHERE email = $1
         ORDER BY timestamp DESC
         LIMIT 5`,
        [email]
      ),
      pool.query(
        `SELECT timestamp, units, value_usd
         FROM redemption_log
         WHERE email = $1
         ORDER BY timestamp DESC
         LIMIT 5`,
        [email]
      ),
    ]);

    const transactions: {
      id: string;
      type: 'investment' | 'redemption';
      amount: string;
      date: string;
      status: string;
      details: string;
      rawTimestamp: Date;
    }[] = [];

    for (const row of investmentsRes.rows) {
      const ts = new Date(row.timestamp);
      transactions.push({
        id: `inv-${ts.toISOString()}`,
        type: 'investment',
        amount: `$${row.amount_usd} at NAV $${parseFloat(row.nav).toFixed(2)}`,
        date: formatTime(ts),
        status: 'completed',
        details: `Received ${parseFloat(row.units).toFixed(2)} units`,
        rawTimestamp: ts,
      });
    }

    for (const row of redemptionsRes.rows) {
      const ts = new Date(row.timestamp);
      transactions.push({
        id: `red-${ts.toISOString()}`,
        type: 'redemption',
        amount: `${parseFloat(row.units).toFixed(2)} units`,
        date: formatTime(ts),
        status: 'completed',
        details: `Received $${parseFloat(row.value_usd).toFixed(2)}`,
        rawTimestamp: ts,
      });
    }

    // Sort transactions by timestamp descending
    transactions.sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime());

    // Remove rawTimestamp before sending
    const response = transactions.map(({ rawTimestamp, ...rest }) => rest);

    return NextResponse.json({ transactions: response });
  } catch (err: any) {
    console.error('❌ Error fetching recent activity:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}

// 🕓 Format timestamp to human-readable label
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 60 || diffDay === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDay === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  return date.toLocaleDateString();
}
