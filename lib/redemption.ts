import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import { pool } from './db';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const fireblocksPrivateKey = Buffer.from(process.env.FIREBLOCKS_SECRET_B64!, 'base64').toString('utf8');

const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

const VAULT_NAMES = {
  main: 'hodl_fund_main',
  redemption: 'redemption_pool',
};

const INDEX_ALLOCATION = {
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
  const id = COINGECKO_MAP[assetId];
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
  );
  return res.data[id]?.usd ?? 0;
}

export async function redeemUnits(email: string, unitsToRedeem: number) {
  const res = await pool.query(
    'SELECT units FROM user_units WHERE email = $1',
    [email]
  );

  if (res.rows.length === 0 || parseFloat(res.rows[0].units) < unitsToRedeem) {
    throw new Error('Not enough units to redeem');
  }

  const navRes = await pool.query(
    'SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1'
  );

  const nav = parseFloat(navRes.rows[0].nav);
  const valueUSD = unitsToRedeem * nav;

  const sourceVaultId = await getVaultIdByName(VAULT_NAMES.main);
  const redemptionVaultId = await getVaultIdByName(VAULT_NAMES.redemption);

  for (const assetId of Object.keys(INDEX_ALLOCATION)) {
    const share = INDEX_ALLOCATION[assetId];
    const assetUSD = valueUSD * share;
    const price = await getPriceUSD(assetId);
    const amount = assetUSD / price;

    await fireblocks.createTransaction({
      assetId,
      amount: amount.toFixed(8),
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: sourceVaultId,
      },
      destination: {
        type: PeerType.VAULT_ACCOUNT,
        id: redemptionVaultId,
      },
      note: `Redemption for ${email}`,
    });
  }

  await pool.query(
    'UPDATE user_units SET units = units - $1 WHERE email = $2',
    [unitsToRedeem, email]
  );

  await pool.query(
    'INSERT INTO redemptions (email, units, value_usd) VALUES ($1, $2, $3)',
    [email, unitsToRedeem, valueUSD]
  );

  console.log(`✅ Redeemed ${unitsToRedeem} units ($${valueUSD.toFixed(2)}) for ${email}`);
}
