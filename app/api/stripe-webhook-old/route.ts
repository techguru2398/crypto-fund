import { NextRequest, NextResponse } from 'next/server';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

// Disable body parsing (Vercel will still pass the raw body correctly)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Read Fireblocks private key from file
const privateKeyPath = path.join(process.cwd(), process.env.FIREBLOCKS_SECRET_PATH!);
const fireblocksPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');

const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

// Stripe requires raw body for webhook signature verification
export async function POST(req: NextRequest) {
  console.log("sig: ", req);
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('❌ Stripe webhook signature error:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const email = paymentIntent.metadata?.email;
    const amountUSD = parseFloat(paymentIntent.metadata?.amount || '0');

    if (!email || isNaN(amountUSD)) {
      return NextResponse.json({ error: 'Missing or invalid metadata' }, { status: 400 });
    }

    console.log(`💳 Payment received: $${amountUSD} from ${email}`);

    try {
      const { accounts } = await fireblocks.getVaultAccountsWithPageInfo({});
      const vault = accounts.find((v) => v.name === 'treasury_usdc');
      if (!vault) throw new Error("Vault 'treasury_usdc' not found");

      await fireblocks.createTransaction({
        assetId: 'USDC_TEST',
        amount: amountUSD.toFixed(2),
        source: { type: PeerType.EXTERNAL_WALLET, id: 'external_funding' },
        destination: { type: PeerType.VAULT_ACCOUNT, id: vault.id },
        note: `Stripe funding for ${email}`,
      });

      console.log(`✅ Fireblocks transfer to vault complete for ${email}`);
    } catch (err: any) {
      console.error(`❌ Fireblocks error: ${err.message}`);
      return NextResponse.json({ error: 'Fireblocks transfer failed' }, { status: 500 });
    }
  } else if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('Payment received:', session.amount_total, session.customer_email);
  }

  return new NextResponse('Webhook received', { status: 200 });
}
