import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto'
import axios from 'axios'
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN!
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY!
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL!

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);
  if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("email:", session.user.email);
  const externalUserId = session.user.email;
  try {
    // 1. Create applicant (idempotent)
    // const ts = getTimestamp();
    // const applicantRes = await axios.post(
    //   `${SUMSUB_BASE_URL}/resources/applicants?levelName=idv-and-phone-verification`,
    //   { externalUserId },
    //   {
    //     headers: {
    //       'X-App-Token': SUMSUB_APP_TOKEN,
    //       'X-App-Access-Sig': generateSignature(ts, 'POST', `/resources/applicants?levelName=idv-and-phone-verification`, { externalUserId }),
    //       'X-App-Access-Ts': ts,
    //       'Content-Type': 'application/json',
    //     },
    //   }
    // )
    // const applicantId = applicantRes.data.id;

    const ts2 = getTimestamp();
    // 2. Generate access token
    const { data } = await axios.post(
      `${SUMSUB_BASE_URL}/resources/accessTokens/sdk`,
      { userId: externalUserId, levelName: "idv-and-phone-verification" },
      {
        headers: {
          'X-App-Token': SUMSUB_APP_TOKEN,
          'X-App-Access-Sig': generateSignature(ts2, 'POST', `/resources/accessTokens/sdk`, { userId: externalUserId, levelName: "idv-and-phone-verification" }),
          'X-App-Access-Ts': ts2,
          'Content-Type': 'application/json',
        },
      }
    )
    console.log("access token: ", data);
    return NextResponse.json(data)
  } catch (err: any) {
    console.error(err.response?.data || err.message)
    return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
  }
}

function getTimestamp() {
  const timestamp = Date.now() - 1 * 60 * 60 * 1000;
  return Math.floor(timestamp / 1000).toString()
}

function generateSignature(ts: string, method: string, url: string, body: any) {
  const bodyString = JSON.stringify(body)
  const signature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(ts + method + url + bodyString)
    .digest('hex')

  return signature
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
  return applyCors(req) ?? NextResponse.json({});
}