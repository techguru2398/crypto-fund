import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { applyCors } from '@/lib/cors';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { sendUSDCToTransak, sellCrypto } from '@/lib/fireblocks';

const TRANSAK_API_URL = 'https://api.transak.com/api/v2/partner/transaction/fiat-offramp';

async function handler(req: NextRequest) {
  const corsResponse = applyCors(req);
  if (corsResponse) return corsResponse;

  const session = await getServerSession(authOptions);
  if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email: string = session.user.email as string;
  try {
    const { bankName, accountNumber, routingNumber, amount, fund_id } = await req.json();

    if (!bankName || !accountNumber || !routingNumber || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const usdcAmount = parseFloat(amount);

    if(process.env.MODE == "test") {
      const res = await sellCrypto(amount, fund_id, email);
      if(!res.success)
        return NextResponse.json({ error: res.message }, { status: 500 });
    } else {
  
      const transakTx = await createTransakOffRampTransaction(usdcAmount, email, {
        bankName,
        accountNumber,
        routingNumber,
      });
  
      const transakData = await transakTx.json();

      if (!transakData.transakOrderId || !transakData.url) {
        return NextResponse.json({ error: 'Failed to create Transak offramp order' }, { status: 500 });
      }

      // Step 2: Save initial withdrawal (PENDING_KYC)
      await pool.query(
        `INSERT INTO withdrawals
          (email, amount, transak_order_id, bank_name, account_number, routing_number, status)
        VALUES
          ($1, $2, $3, $4, $5, $6, 'PENDING_KYC')`,
        [
          email,
          usdcAmount,
          transakData.transakOrderId,
          bankName,
          accountNumber,
          routingNumber,
        ]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Withdrawal error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- Create Transak Off-Ramp Transaction
async function createTransakOffRampTransaction(
  amount: number,
  email: string,
  bankDetails: { bankName: string; accountNumber: string; routingNumber: string }
) {
  const payload = {
    fiatCurrency: 'USD',
    fiatAmount: amount,
    cryptoCurrency: 'USDC',
    cryptoAmount: amount,
    walletAddress: process.env.TRANSAK_USDC_WALLET_ADDRESS!,
    userBankDetails: {
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      routingNumber: bankDetails.routingNumber,
    },
    userData: {
      email,
    },
    kyc: {
      redirectURL: `${process.env.APP_URL}/investment?withdraw_kyc=true`,  // After KYC success
      webhookURL: `${process.env.APP_URL}/api/transack-webhook`
    }
  };

  const res = await fetch(TRANSAK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': process.env.TRANSAK_API_KEY!,
    },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export const POST = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}