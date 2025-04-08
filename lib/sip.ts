// lib/sip.ts
import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Stripe from 'stripe';
import { addDays, addMonths } from 'date-fns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

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

async function processSIP(sip: any, nav: number) {
  const amountCents = Math.round(Number(sip.amount_usd) * 100);
  const units = Number(sip.amount_usd) / Number(nav);
  try {
    await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: sip.stripe_customer_id,
      payment_method: sip.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: {
        type: 'sip',
        sip_id: sip.id,
        user_email: sip.email
      }
    });
    const now = new Date().toISOString();
    let nextRun = new Date();
    const freq = sip.frequency || 'monthly';
    if (freq === 'daily') nextRun = addDays(nextRun, 1);
    else if (freq === 'weekly') nextRun = addDays(nextRun, 7);
    else nextRun = addMonths(nextRun, 1);

    await pool.query(
      `UPDATE sip_schedule SET next_run = $1 WHERE id = $2`,
      [nextRun, sip.id]
    );

    console.log(`✅ SIP executed for ${sip.email}: $${sip.amount_usd} → ${units.toFixed(4)} units`);
  } catch (err) {
    console.error('Payment failed for user', sip.email, err);
  }
}

export async function runSIPForDueUsers() {
  const today = new Date().toISOString().split('T')[0];
  const nav = await getLatestNAV();
  // const sipUsers = await pool.query(`
  //   SELECT s.*, u.stripe_customer_id, u.stripe_payment_method_id 
  //   FROM sip_schedule s 
  //   JOIN user_info u ON u.email = s.email 
  //   WHERE s.next_run <= NOW() AND s.status = 'active'
  // `);
  const sipUsers = await pool.query(`
    SELECT s.*, u.stripe_customer_id, u.stripe_payment_method_id 
    FROM sip_schedule s 
    JOIN user_info u ON u.email = s.email 
    WHERE s.status = 'active'
  `);
  // console.log("sipusers: ", sipUsers);
  for (const sip of sipUsers.rows) {
    try {
      await processSIP(sip, nav);
    } catch (err: any) {
      console.error(`❌ SIP failed for ${sip.email}:`, err.message);
    }
  }
}
