import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { pool } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15', // or your project's Stripe API version
});

// Minimum USD to trigger payout (adjust as needed)
const MINIMUM_PAYOUT_USD = Number(process.env.STRIPE_MINIMUM_PAYOUT_USD);

async function handler(req: NextRequest ) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    if(process.env.MODE = 'test') {
      const res = await pool.query('SELECT balance FROM mock_stripe');
      const stripeBalance = res.rows[0].balance;
      if (stripeBalance < MINIMUM_PAYOUT_USD) {
        return NextResponse.json({
          message: 'Not enough USD available to trigger payout.',
          available: stripeBalance,
        });
      }
      await pool.query(
        'UPDATE mock_stripe SET balance = 0, updated_at = NOW()',
      );
      await pool.query(
        'UPDATE mock_bank SET balance = balance + $1, updated_at = NOW()',
        [stripeBalance]
      );
      return NextResponse.json({
        message: 'Payout triggered to mock bank.',
        amount: stripeBalance,
      });
    } else {
      // 1. Check Stripe balance
      const balance = await stripe.balance.retrieve();
      console.log("balance :", balance);
      const availableUSD = balance.available.find(
        (bal) => bal.currency === 'usd'
      );
  
      if (!availableUSD || availableUSD.amount < MINIMUM_PAYOUT_USD * 100) {
        return NextResponse.json({
          message: 'Not enough USD available to trigger payout.',
          available: (availableUSD?.amount || 0) / 100,
        });
      }
      // 2. Trigger payout to  Fireblocks-linked bank account
      const payout = await stripe.payouts.create({
        amount: availableUSD.amount,
        currency: 'usd',
        method: 'standard', // or 'instant' if supported
        // destination: 'ba_1...', // optional: only if using multiple external accounts
        statement_descriptor: 'To Fireblocks Vault',
      });
      return NextResponse.json({
        message: 'Payout triggered to Fireblocks.',
        payoutId: payout.id,
        amount: payout.amount / 100,
      });
    }

  } catch (err: any) {
    console.error('Payout error:', err);
    return NextResponse.json({ error: 'Failed to trigger payout' }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}
