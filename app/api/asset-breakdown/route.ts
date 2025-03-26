import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors'; // Adjust path as needed

const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
};

const ASSET_IDS = ['BTC_TEST', 'LTC_TEST'];

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const holdings: Record<string, any> = {};

    for (const assetId of ASSET_IDS) {
      const result = await pool.query(
        `SELECT SUM(units) AS total_units FROM investment_ledger WHERE asset_id = $1`,
        [assetId]
      );
      console.log("asset-breakdown : ", result.rows);
      const units = parseFloat(result.rows[0]?.total_units) || 0;
      const cgId = COINGECKO_MAP[assetId];

      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
      const priceData = await priceRes.json();
      const nav = priceData[cgId]?.usd || 0;
      const value = units * nav;

      holdings[assetId] = { name: assetId, units, nav, value };
    }

    return NextResponse.json({ assets: Object.values(holdings) });
  } catch (err: any) {
    console.error('❌ Error in asset breakdown:', err.message);
    return NextResponse.json({ error: 'Failed to fetch asset breakdown' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
