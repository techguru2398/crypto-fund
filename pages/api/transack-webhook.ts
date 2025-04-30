import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; // Your PostgreSQL pool or DB connection
import { sendUSDCToTransak } from '@/lib/fireblocks';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const event = payload.event;
    const order = payload.order;

    const transakOrderId = order.partnerOrderId;

    if (event === 'KYC_VERIFICATION_UPDATE') {
      const kycStatus = order.kycStatus;

      if (kycStatus === 'APPROVED') {
        console.log(`✅ KYC Approved for ${transakOrderId}`);

        // Step 1: Find the withdrawal request
        const res = await pool.query(
          `SELECT * FROM withdrawals WHERE transak_order_id = $1 LIMIT 1`,
          [transakOrderId]
        );

        const withdrawal = res.rows[0];
        if (!withdrawal) throw new Error('Withdrawal not found.');

        // Step 2: Send USDC via Fireblocks
        const fireblocksTx = await sendUSDCToTransak(payload.amount);

        console.log('✅ Fireblocks USDC transfer started:', fireblocksTx.id);

        // Step 3: Update withdrawal status
        await pool.query(
          `UPDATE withdrawals
           SET status = 'USDC_SENT', fireblocks_tx_id = $1, updated_at = NOW()
           WHERE transak_order_id = $2`,
          [fireblocksTx.id, transakOrderId]
        );
      }

      if (kycStatus === 'FAILED') {
        console.log(`❌ KYC Failed for ${transakOrderId}`);

        await pool.query(
          `UPDATE withdrawals
           SET status = 'KYC_FAILED', updated_at = NOW()
           WHERE transak_order_id = $1`,
          [transakOrderId]
        );
      }

      return NextResponse.json({ success: true });
    }

    // Also handle payout completed webhook (ORDER_COMPLETED)...

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
