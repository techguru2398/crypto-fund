import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { funds } from '@/lib/fund';
import { getPriceUSD } from '@/lib/coinbase';

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const fund_id = searchParams.get('fundId');
  const fund = funds.find((f) => f.id === fund_id);
  if (!fund) {
    console.log(`Fund '${fund_id}' not found`);
    return NextResponse.json({ error: `Fund '${fund_id}' not found` }, { status: 500 });
  }

  try {
    const holdings: Record<string, any> = {};
    let vaultData;
    if(fund_id == "hodl_index") {
      vaultData = await pool.query(`
        SELECT btc as BTC, ltc as LTC, eth as ETH, xrp as XRP, usdt as USDT_BSC
        FROM mock_hodl_index_vault
      `);
    } else if(fund_id == "btc_ltc") {
      vaultData = await pool.query(`
        SELECT btc as BTC, ltc as LTC
        FROM mock_bl_index_vault
      `);
    } else if(fund_id == "defi_core") {
      vaultData = await pool.query(`
        SELECT aave as AAVE, uni as UNI, comp as COMP
        FROM mock_defi_index_vault
      `);
    } else if(fund_id == "ai_infra") {
      vaultData = await pool.query(`
        SELECT fet as FET, grt as GRT, rndr as RNDR
        FROM mock_ai_index_vault
      `);
    }
    const raw = vaultData.rows[0] as Record<string, string>;
    const currentState = Object.entries(raw).reduce((acc, [key, value]) => {
      acc[key.toUpperCase()] = value;
      return acc;
    }, {} as Record<string, string>);
    let totalValue = 0;
    for (const assetId of fund.asset_ids) {
      const units = parseFloat(currentState[assetId]) || 0;
      const assetPrice = await getPriceUSD(assetId);
      const value = units * assetPrice;
      totalValue += value;

      holdings[assetId] = { name: assetId, units, assetPrice, value };
    }
    const assets = Object.values(holdings);
    assets.map((asset) => {
      asset.percentage = totalValue > 0 ? ((parseFloat(asset.value) / totalValue) * 100).toFixed(2) : '0';
    });
    return NextResponse.json({ assets: assets });
  } catch (err: any) {
    console.error('❌ Error in asset breakdown:', err.message);
    return NextResponse.json({ error: 'Failed to fetch asset breakdown' }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
