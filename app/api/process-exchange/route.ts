import { NextRequest, NextResponse } from 'next/server';
import { getFiatBalance, placeMarketOrder, waitForFill } from '@/lib/coinbase';
import { applyCors } from '@/lib/cors';
import { transferCryptoToVault } from '@/lib/fireblocks';
import { pool } from '@/lib/db';
import { funds, COINBASE_MAP } from '@/lib/fund';
import { getVIX } from '@/lib/vix';
import { excuteExchange } from '@/lib/coinbase';


async function handler(req: NextRequest ) {
  try {
    const pendingInvestments = await pool.query(`
      SELECT * FROM investment_log
      WHERE status = 'pending'
      ORDER BY timestamp ASC
    `);

    for (const investment of pendingInvestments.rows) {
        const { id, email, amount_usd, units, fund_id } = investment;
        const result = await excuteExchange(email, amount_usd, units, fund_id);
        if(result) {
          await pool.query(`
            UPDATE investment_log
            SET status = 'complete'
            WHERE id = ${id}
          `);
        }
    }
    NextResponse.json({ message: 'Processed all investments with available balance.' });
  } catch (err) {
    console.error('Error processing investments:', err);
    NextResponse.json({ error: 'Failed to process investments' }, { status: 500 });
  }
}

export const GET = handler;

export function OPTIONS(req: NextRequest) {
    return applyCors(req) ?? NextResponse.json({});
}
