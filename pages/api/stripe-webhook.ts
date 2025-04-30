import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { pool } from '@/lib/db';
import { getLatestNAV } from '@/lib/nav';
import { excuteExchange } from '@/lib/coinbase';

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
      const metadata = pi.metadata || {};
      const email = metadata.user_email;
      const amount_usd = pi.amount_received / 100;
      const nav = Number(metadata.nav);
      const units = metadata.units;
      const fund_id = metadata.fund_id;
      
      if (metadata.type === 'sip') {
        console.log(`✅ SIP payment succeeded for ${email}`);
        const result = await excuteExchange(email, amount_usd, parseFloat(units), fund_id);
        if(result) {
          await pool.query(
            'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip, fund_id) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)',
            [email, amount_usd, nav, units, 'complete', true, fund_id]
          );
        } else {
          await pool.query(
            'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip, fund_id) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)',
            [email, amount_usd, nav, units, 'pending', true, fund_id]
          );
        }
      } else if (metadata.type === 'checkout') {
        console.log(`✅ Manual Checkout payment succeeded for ${email}`);
        const result = await excuteExchange(email, amount_usd, parseFloat(units), fund_id);
        if(result) {
          await pool.query(
            'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip, fund_id) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)',
            [email, amount_usd, nav, units, 'complete', false, fund_id]
          );
        } else {
          await pool.query(
            'INSERT INTO investment_log (email, amount_usd, nav, units, timestamp, status, is_sip, fund_id) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)',
            [email, amount_usd, nav, units, 'pending', false, fund_id]
          );
        }
      } else {
        console.warn('⚠️ Unknown payment type – skipping');
      }

      if (process.env.MODE = 'test') {
        await pool.query(
          'UPDATE mock_stripe SET balance = balance + $1, updated_at = NOW()',
          [amount_usd]
        );
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