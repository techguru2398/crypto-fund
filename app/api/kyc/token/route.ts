import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';
import { applyCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const email = body.email;

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const baseUrl = process.env.SUMSUB_BASE_URL;
    const appToken = process.env.SUMSUB_APP_TOKEN;
    const secretKey = process.env.SUMSUB_SECRET_KEY;

    const externalUserId = email;
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const path = `/resources/accessTokens?userId=${externalUserId}`;

    const signature = crypto
      .createHmac('sha256', secretKey!)
      .update(`${timestamp}${method}${path}`)
      .digest('hex');

    const { data } = await axios.post(
      `${baseUrl}${path}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': appToken!,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
        },
      }
    );

    return NextResponse.json({ token: data.token });
  } catch (err: any) {
    console.error('❌ Sumsub token error:', err.message);
    return NextResponse.json({ error: 'Failed to get Sumsub token' }, { status: 500 });
  }
}

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}