import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import getRawBody from "raw-body";

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
  const rawBody = await getRawBody(req);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!, { tolerance: 0,});
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

      if (metadata.type === 'sip') {
        console.log(`✅ SIP payment succeeded for ${email}`);
        // 🔁 Handle SIP: calculate fund units, update investment_ledger, etc.
      } else if (metadata.type === 'checkout') {
        console.log(`✅ Manual Checkout payment succeeded for ${email}`);
        // 🛒 Handle manual investment from Checkout
      } else {
        console.warn('⚠️ Unknown payment type – skipping');
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Optional: You can log session here if needed
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
