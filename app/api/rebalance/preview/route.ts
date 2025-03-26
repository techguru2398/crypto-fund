import { NextRequest, NextResponse } from 'next/server';
import { FireblocksSDK } from 'fireblocks-sdk';
import fs from 'fs';
import axios from 'axios';
import { applyCors } from '@/lib/cors';

const fireblocks = new FireblocksSDK(
  fs.readFileSync(process.env.FIREBLOCKS_SECRET_PATH!, 'utf8'),
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

const INDEX_ALLOCATION: Record<string, number> = {
  BTC_TEST: 0.5,
  LTC_TEST: 0.5,
};

const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
};

async function getVaultIdByName(name: string): Promise<string> {
    const { accounts = [] } = await fireblocks.getVaultAccountsWithPageInfo({});
    const vault = accounts.find((v) => v.name === name);
    if (!vault) throw new Error(`Vault '${name}' not found`);
    return vault.id;
}

async function getPriceUSD(assetId: string): Promise<number> {
  const tokenId = COINGECKO_MAP[assetId];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
  const res = await axios.get(url);
  return res.data[tokenId].usd;
}

async function getCurrentHoldings(vaultName: string) {
  const vaultId = await getVaultIdByName(vaultName);
  const balances: Record<string, { amount: number; price: number; value: number }> = {};

  for (const assetId of Object.keys(INDEX_ALLOCATION)) {
    try {
      const asset = await fireblocks.getVaultAccountAsset(vaultId, assetId);
      const amount = parseFloat(asset.total);
      const price = await getPriceUSD(assetId);
      balances[assetId] = {
        amount,
        price,
        value: amount * price,
      };
    } catch (err) {
      balances[assetId] = { amount: 0, price: 0, value: 0 };
    }
  }

  return balances;
}

export async function GET(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const vaultName = 'hodl_fund_main';
    const holdings = await getCurrentHoldings(vaultName);

    const totalValue = Object.values(holdings).reduce((sum, asset) => sum + asset.value, 0);

    const preview = Object.entries(INDEX_ALLOCATION).map(([assetId, targetShare]) => {
      const actual = holdings[assetId]?.value || 0;
      const expected = totalValue * targetShare;
      const drift = expected - actual;
      const pctDrift = ((drift / expected) * 100).toFixed(2);

      return {
        assetId,
        actualUSD: parseFloat(actual.toFixed(2)),
        expectedUSD: parseFloat(expected.toFixed(2)),
        driftUSD: parseFloat(drift.toFixed(2)),
        driftPct: parseFloat(pctDrift),
      };
    });

    return NextResponse.json({
      totalUSD: parseFloat(totalValue.toFixed(2)),
      preview,
    });
  } catch (err: any) {
    console.error('❌ Rebalance preview error:', err.message);
    return NextResponse.json({ error: 'Failed to calculate rebalance preview' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
