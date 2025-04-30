import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import { pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Read Fireblocks private key from file
const fireblocksPrivateKey = Buffer.from(process.env.FIREBLOCKS_SECRET_B64!, 'base64').toString('utf8');

const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  try {
    // 1. Get checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const email = session.metadata?.email;
    const amount = session.metadata?.amount;

    if (!email || !amount) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const amountUsd = parseFloat(amount);

    // 2. Get latest NAV
    const navRes = await pool.query(`SELECT nav FROM nav_history ORDER BY date DESC LIMIT 1`);
    if (navRes.rows.length === 0) {
      throw new Error('No NAV available');
    }

    const nav = parseFloat(navRes.rows[0].nav);
    const units = amountUsd / nav;

    // 3. Get Fireblocks vault IDs
    const { accounts } = await fireblocks.getVaultAccountsWithPageInfo({});
    const sourceVault = accounts.find((v) => v.name === 'Stripe Holding');
    const destVault = accounts.find((v) => v.name === 'Main Treasury');

    if (!sourceVault || !destVault) {
      throw new Error('Vault(s) not found');
    }

    // 4. Create Fireblocks transaction
    const fireblocksTx = await fireblocks.createTransaction({
      assetId: 'USDC_TEST',
      amount: amountUsd.toFixed(2),
      source: { type: PeerType.VAULT_ACCOUNT, id: sourceVault.id },
      destination: { type: PeerType.VAULT_ACCOUNT, id: destVault.id },
      note: `SIP investment by ${email}`,
    });

    // 5. Log investment
    await pool.query(
      `INSERT INTO investment_ledger
        (email, amount_usd, units, asset_id, asset_share, stripe_session_id, fireblocks_tx_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [email, amountUsd, units, 'USDC', 1.0, session_id, fireblocksTx.id]
    );

    return NextResponse.json({
      message: 'Investment successful',
      fireblocksTxId: fireblocksTx.id,
    });
  } catch (err: any) {
    console.error('❌ Error in /api/success:', err.message);
    return NextResponse.json({ error: 'Failed to process investment' }, { status: 500 });
  }
}
