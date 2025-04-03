import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { withAuth } from '@/lib/authMiddleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15', // or your project's Stripe API version
});
const { StripeResource } = Stripe;
// Extend Stripe to access Onramp sessions
const OnrampSessionResource = StripeResource.extend({
  create: StripeResource.method({
    method: 'POST',
    path: 'crypto/onramp_sessions',
  }),
});

async function handler(req: NextRequest, user: any) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { destination_amount } = body;
    const onrampSession = await new OnrampSessionResource(stripe).create({
      destination_amount: destination_amount,
      destination_currency: "usdc",
      destination_currencies: ["usdc"],
      destination_network: "polygon",
      destination_networks: ["polygon"],
      customer_ip_address: req.headers.get('x-forwarded-for') || '',
    }) as unknown as { client_secret: string; [key: string]: any };
    console.log(onrampSession);
      return NextResponse.json({ client_secret: onrampSession.client_secret });
  } catch (err: any) {
    console.error('❌ Stripe Onramp error:', err.message);
    return NextResponse.json({ error: 'Failed to create onramp session' }, { status: 500 });
  }
}

export const POST = withAuth(handler);

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}
