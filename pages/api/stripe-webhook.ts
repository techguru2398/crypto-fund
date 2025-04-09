import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { pool } from '@/lib/db';
import { getLatestNAV } from '@/lib/nav';

export const config = {
    api: {
      bodyParser: false,
    },
  };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    } 

  const sig = req.headers['stripe-signature']!;
  let rawBody: Buffer;

  try {
    rawBody = await buffer(req);
  } catch (err) {
    console.error('Error getting raw body:', err);
    return res.status(500).send('Internal Server Error');
  }
  let event: Stripe.Event;

  try {
    // event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!, { tolerance: 0,});
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log("event type: ", event.type);
  
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("amount_received: ", pi.amount_received);
      const metadata = pi.metadata || {};
      const email = metadata.user_email;
      const amount_usd = pi.amount_received / 100;
      const nav = await getLatestNAV();

      if (metadata.type === 'sip') {
        console.log(`✅ SIP payment succeeded for ${email}`);
        const units = amount_usd / nav;
        await pool.query(
          'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip) VALUES ($1, $2, $3, $4, NOW(), $5, $6)',
          [email, amount_usd, nav, units, 'pending', true]
        );
        await logInvestment(email, amount_usd, units);
      } else if (metadata.type === 'checkout') {
        console.log(`✅ Manual Checkout payment succeeded for ${email}`);
        await pool.query(
          'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip) VALUES ($1, $2, $3, $4, NOW(), $5, $6)',
          [email, amount_usd, metadata.nav, metadata.units, 'pending', false]
        );
        await logInvestment(email, amount_usd, metadata.units);
      } else {
        console.warn('⚠️ Unknown payment type – skipping');
      }

      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Optional: log session here if needed
      console.log(`ℹ️ Checkout session completed for ${session.customer_email}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const customerId = paymentIntent.customer as string;
      const errorCode = paymentIntent.last_payment_error?.code;
      const message = paymentIntent.last_payment_error?.message;

      console.error(`❌ Payment failed for customer ${customerId}: ${message} (code: ${errorCode})`);

      if (errorCode === 'card_declined') {
        console.warn('⚠️ Card was declined — could be expired, insufficient funds, etc.');
      } else if (errorCode === 'expired_card') {
        console.warn('⚠️ Payment failed due to expired card.');
      } else if (errorCode === 'insufficient_funds') {
        console.warn('⚠️ Payment failed due to insufficient funds.');
      }

      // Optional: update investment_log or sip_plans with failure status
      // Optional: trigger email or push notification to user
      break;
    }
    default:
      console.log(`🔄 Unhandled event type: ${event.type}`);
  }

  return res.status(200).send('Webhook received');
}

// added for the test
import axios from 'axios';

const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
};

const INDEX_ALLOCATION = {
  BTC_TEST: 0.5,
  LTC_TEST: 0.5,
};

async function getPriceUSD(assetId: string): Promise<number> {
  const id = COINGECKO_MAP[assetId];
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
  );
  return res.data[id]?.usd ?? 0;
}

async function logInvestment(email, amountUSD, newUnits) {
  for (const assetId of Object.keys(INDEX_ALLOCATION)) {
    const share = INDEX_ALLOCATION[assetId];
    const value = amountUSD * share;
    const unitsAllocated = newUnits * share;

    const price = await getPriceUSD(assetId);
    const asset_value = value / price;
    await pool.query(
      `INSERT INTO investment_ledger (email, amount_usd, asset_id, asset_share, asset_value, units)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email, value, assetId, share, asset_value, unitsAllocated]
    );
  }
  console.log(`📘 Logged investment for ${email}`);
}
