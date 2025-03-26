import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import { pool } from './db'; // global pg.Pool instance
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const FIREBLOCKS_SECRET_PATH = process.env.FIREBLOCKS_SECRET_PATH!;
const privateKey = fs.readFileSync(path.resolve(FIREBLOCKS_SECRET_PATH), 'utf8');

const fireblocks = new FireblocksSDK(
  privateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

const ASSET_IDS = ['BTC_TEST', 'LTC_TEST'];
const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
};
const INDEX_ALLOCATION: Record<string, number> = {
  BTC_TEST: 0.5,
  LTC_TEST: 0.5,
};
const VAULT_NAMES = {
  main: 'hodl_fund_main',
  treasury: 'treasury_usdc',
};

async function getVaultIdByName(name: string): Promise<string> {
  const { accounts = [] } = await fireblocks.getVaultAccountsWithPageInfo({});
  const vault = accounts.find((v) => v.name === name);
  if (!vault) throw new Error(`Vault '${name}' not found`);
  return vault.id;
}

async function getVaultHoldings(vaultId: string) {
  const balances: Record<string, number> = {};

  for (const assetId of ASSET_IDS) {
    try {
      const asset = await fireblocks.getVaultAccountAsset(vaultId, assetId);
      balances[assetId] = parseFloat(asset.total);
    } catch {
      balances[assetId] = 0;
    }
  }

  return balances;
}

async function getPriceUSD(assetId: string): Promise<number> {
  const id = COINGECKO_MAP[assetId];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const res = await axios.get(url);
  return res.data[id]?.usd ?? 0;
}

async function logRebalance(assetId: string, action: string, amount: number, delta: number) {
  await pool.query(
    `INSERT INTO rebalance_logs (asset_id, action, amount, delta) VALUES ($1, $2, $3, $4)`,
    [assetId, action, amount, delta]
  );
}

export async function rebalancePortfolio(tolerance = 0.02) {
  const vaultId = await getVaultIdByName(VAULT_NAMES.main);
  const treasuryId = await getVaultIdByName(VAULT_NAMES.treasury);
  const holdings = await getVaultHoldings(vaultId);

  const prices: Record<string, number> = {};
  const values: Record<string, number> = {};
  let totalValue = 0;

  for (const assetId of ASSET_IDS) {
    const amount = holdings[assetId];
    const price = await getPriceUSD(assetId);
    prices[assetId] = price;
    values[assetId] = amount * price;
    totalValue += values[assetId];
  }

  for (const assetId of Object.keys(INDEX_ALLOCATION)) {
    const targetPct = INDEX_ALLOCATION[assetId];
    const targetValue = totalValue * targetPct;
    const currentValue = values[assetId] ?? 0;
    const delta = targetValue - currentValue;
    const pctDiff = totalValue > 0 ? delta / totalValue : 0;

    if (Math.abs(pctDiff) > tolerance) {
      const action = delta > 0 ? 'BUY' : 'SELL';
      const amount = Math.abs(delta) / (prices[assetId] || 1);

      await fireblocks.createTransaction({
        assetId,
        amount: amount.toFixed(8),
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: action === 'BUY' ? treasuryId : vaultId,
        },
        destination: {
          type: PeerType.VAULT_ACCOUNT,
          id: action === 'BUY' ? vaultId : treasuryId,
        },
        note: `Auto-rebalance ${action} ${assetId}`,
      });

      await logRebalance(assetId, action, amount, delta);
    }
  }
}
