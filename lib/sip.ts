// lib/sip.ts
import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const fireblocks = new FireblocksSDK(
  fs.readFileSync(path.resolve(process.env.FIREBLOCKS_SECRET_PATH!), 'utf8'),
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

const INDEX_ALLOCATION = {
  BTC_TEST: 0.5,
  LTC_TEST: 0.5,
};

const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
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

async function getPriceUSD(assetId: string): Promise<number> {
  const id = COINGECKO_MAP[assetId];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const res = await axios.get(url);
  return res.data[id]?.usd ?? 0;
}

async function getLatestNAV(): Promise<number> {
  const navRes = await pool.query('SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1');
  return parseFloat(navRes.rows[0].nav);
}

async function processSIP(email: string, amountUSD: number, nav: number) {
  const newUnits = amountUSD / nav;
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO user_units (email, units, last_updated)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET units = user_units.units + $2, last_updated = $3`,
    [email, newUnits, now]
  );

  const sourceVaultId = await getVaultIdByName(VAULT_NAMES.treasury);
  const destinationVaultId = await getVaultIdByName(VAULT_NAMES.main);

  for (const assetId of Object.keys(INDEX_ALLOCATION)) {
    const share = INDEX_ALLOCATION[assetId];
    const assetUSD = amountUSD * share;
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
        id: destinationVaultId,
      },
      note: `SIP auto-allocation for ${email}`,
    });
  }

  await pool.query(
    `INSERT INTO investment_ledger (email, amount_usd, asset_id, asset_share, asset_value, units)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [email, amountUSD, 'INDEX', 1.0, amountUSD, newUnits]
  );

  await pool.query(
    `INSERT INTO investment_log (email, timestamp, amount_usd, units, nav)
     VALUES ($1, NOW(), $2, $3, $4)`,
    [email, amountUSD, newUnits, nav]
  );

  console.log(`✅ SIP executed for ${email}: $${amountUSD} → ${newUnits.toFixed(4)} units`);
}

export async function runSIPForDueUsers() {
  const today = new Date().toISOString().split('T')[0];
  const nav = await getLatestNAV();
  const sipUsers = await pool.query(`SELECT * FROM sip_schedule WHERE next_run <= $1 AND status = 'active'`, [today]);

  for (const user of sipUsers.rows) {
    try {
      await processSIP(user.email, parseFloat(user.amount_usd), nav);

      let nextRun = new Date();
      const freq = user.frequency || 'monthly';
      if (freq === 'daily') nextRun.setDate(nextRun.getDate() + 1);
      else if (freq === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
      else nextRun.setMonth(nextRun.getMonth() + 1);

      await pool.query(
        `UPDATE sip_schedule SET next_run = $1 WHERE email = $2`,
        [nextRun, user.email]
      );
    } catch (err: any) {
      console.error(`❌ SIP failed for ${user.email}:`, err.message);
    }
  }
}
