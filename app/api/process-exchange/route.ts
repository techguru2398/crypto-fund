import { NextRequest, NextResponse } from 'next/server';
import { getFiatBalance, placeMarketOrder, waitForFill } from '@/lib/coinbase';
import { transferToVault } from '@/lib/fireblocks';
import { pool } from '@/lib/db';


export const POST = async (req: NextRequest) => {
  try {
    const pendingInvestments = await pool.query(`
      SELECT * FROM investment_log
      WHERE status = 'pending'
      ORDER BY timestamp ASC
    `);

    let usdBalance = await getFiatBalance('USD');

    for (const investment of pendingInvestments.rows) {
        const { id, email, amount_usd, nav, units } = investment;

        if (amount_usd > usdBalance) {
            console.log(`Skipping ID ${id} — not enough USD`);
            continue;
        }
        const halfUsd = (amount_usd / 2).toFixed(2);
    
        // Step 1: Place market orders
        const btcOrder = await placeMarketOrder('BTC-USD', halfUsd);
        const ltcOrder = await placeMarketOrder('LTC-USD', halfUsd);
    
        // Step 2: Wait until filled
        const btcAmount = await waitForFill(btcOrder.order_id);
        const ltcAmount = await waitForFill(ltcOrder.order_id);
    
        // Step 3: Fireblocks transfers
        const btcTx = await transferToVault('BTC', btcAmount);
        const ltcTx = await transferToVault('LTC', ltcAmount);
        
        // Update the investment_log as complete
        await pool.query(`
            UPDATE investment_log
            SET status = 'complete'
            WHERE id = ${id}
        `);

        // Update investment_ledger
        // await pool.query(`
        //     INSERT INTO investment_ledger (email, amount_usd, asset_id, asset_share, asset_value, units, fireblocks_tx_id, timestamp)
        //     VALUES
        //     (${email}, ${amount_usd / 2}, 'BTC', 0.5, ${amount_usd / 2}, ${btcUnits}, ${btcOrder.order_id}, NOW()),
        //     (${email}, ${amount_usd / 2}, 'LTC', 0.5, ${amount_usd / 2}, ${ltcUnits}, ${ltcOrder.order_id}, NOW())
        // `);

        usdBalance -= amount_usd;
    }

    NextResponse.json({ message: 'Processed all investments with available balance.' });
  } catch (err) {
    console.error('Error processing investments:', err);
    NextResponse.json({ error: 'Failed to process investments' }, { status: 500 });
  }
}
