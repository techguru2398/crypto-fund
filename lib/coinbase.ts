import axios from 'axios';
import crypto from 'crypto';
import { pool } from './db';
import { funds, COINBASE_MAP } from './fund';
import { getVIX } from './vix';
import { transferCryptoToVault } from './fireblocks';

const API_KEY = process.env.COINBASE_API_KEY!;
const API_SECRET = process.env.COINBASE_API_SECRET!;
const API_PASSPHRASE = process.env.COINBASE_API_PASSPHRASE!;
const COINBASE_API_URL = 'https://api.coinbase.com/api/v3/brokerage';

export async function getPriceUSD(assetId: string): Promise<number> {
  const tokenId = COINBASE_MAP[assetId];
  const url = `https://api.coinbase.com/v2/prices/${tokenId}/spot`;
  const res = await axios.get(url);
  console.log("price: ", res.data.data);
  return res.data.data.amount;
}

function signRequest(method: string, path: string, body: string, timestamp: string) {
  const message = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('base64');
}

export async function getFiatBalance(currency = 'USD'): Promise<number> {
  if(process.env.MODE == "test") {
    const res = await pool.query('SELECT balance FROM mock_exchange');
    const balance = res.rows[0].balance;
    console.log("exchange balance: ", balance);
    return parseFloat(balance);
  } else {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/accounts';
    const body = '';
  
    const signature = signRequest(method, path, body, timestamp);
  
    const headers = {
      'CB-ACCESS-KEY': API_KEY,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': API_PASSPHRASE,
    };
  
    const res = await axios.get(`${COINBASE_API_URL}${path}`, { headers });
  
    const account = res.data.accounts.find(
      (acc: any) => acc.currency === currency && acc.available_balance
    );
  
    if (!account) throw new Error(`No ${currency} account found`);
  
    return parseFloat(account.available_balance.value);
  }
}

export async function placeMarketOrder(productId: string, quoteSize: string) {
  const timestamp = Date.now() / 1000 + '';
  const path = '/orders';
  const method = 'POST';

  const bodyObj = {
    side: 'BUY',
    type: 'MARKET',
    quote_size: quoteSize,
    product_id: productId,
  };

  const body = JSON.stringify(bodyObj);
  const signature = signRequest(method, path, body, timestamp);

  const headers = {
    'CB-ACCESS-KEY': API_KEY,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
    'CB-ACCESS-PASSPHRASE': API_PASSPHRASE,
    'Content-Type': 'application/json',
  };

  const res = await axios.post(`${COINBASE_API_URL}${path}`, bodyObj, { headers });
  return res.data;
}

export async function getOrderStatus(orderId: string): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = `/orders/${orderId}`;
  const method = 'GET';
  const body = '';

  const signature = signRequest(method, path, body, timestamp);

  const headers = {
    'CB-ACCESS-KEY': API_KEY,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
    'CB-ACCESS-PASSPHRASE': API_PASSPHRASE,
  };

  const res = await axios.get(`${COINBASE_API_URL}${path}`, { headers });
  return res.data;
}

// Poll until filled
export async function waitForFill(orderId: string, maxAttempts = 10, intervalMs = 5000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const order = await getOrderStatus(orderId);
    if (order.status === 'FILLED') {
      return order.filled_size; // e.g., 0.011 BTC
    }

    console.log(`[${orderId}] Not filled yet, retrying in ${intervalMs / 1000}s...`);
    await new Promise((res) => setTimeout(res, intervalMs));
  }

  throw new Error(`Order ${orderId} not filled after ${maxAttempts} attempts`);
}

export async function excuteExchange(email: string, amount_usd: number, units: number, fund_id: string): Promise<boolean> {
  const usdBalance = await getFiatBalance();
  if (amount_usd > usdBalance) {
    console.log(`Not enough USD`);
    return false;
  }
  const vix = await getVIX();
  const fund = funds.find((f) => f.id === fund_id);
  if (!fund) {
    console.log(`Fund '${fund_id}' not found`);
    return false;
  }
  const assetIds = fund.asset_ids;
  const weights = vix > Number(process.env.VIX_THRESHOLD) ? fund.volatile_weight : fund.normal_weight; 
  const investmentRows: any = [];
  
  if(process.env.MODE = 'test') {
    const assetAmounts: any = [];
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const weight = weights[i];
      const usdForAsset = amount_usd * weight;
      const assetPrice = await getPriceUSD(assetId);
      const filledAmount = usdForAsset / assetPrice;
      assetAmounts.push(filledAmount);
      investmentRows.push({
        asset_id: assetId,
        weight,
        usd: usdForAsset.toFixed(8),
        filledAmount: filledAmount.toFixed(8),
        txId: "test"
      });
    }
    if(fund_id == "hodl_index") {
      await pool.query(
        'UPDATE mock_hodl_index_vault SET btc = btc + $1, ltc = ltc + $2, eth = eth + $3, xrp = xrp + $4, usdt = usdt + $5, updated_at = NOW()',
        [parseFloat(assetAmounts[0]), parseFloat(assetAmounts[1]), parseFloat(assetAmounts[2]), parseFloat(assetAmounts[3]), parseFloat(assetAmounts[4])]
      );
    } else if (fund_id == "btc_ltc") {
      await pool.query(
        'UPDATE mock_bl_index_vault SET btc = btc + $1, ltc = ltc + $2, updated_at = NOW()',
        [parseFloat(assetAmounts[0]), parseFloat(assetAmounts[1])]
      );
    } else if (fund_id == "defi_core") {
      await pool.query(
        'UPDATE mock_defi_index_vault SET aave = aave + $1, uni = uni + $2, comp = comp + $3, updated_at = NOW()',
        [parseFloat(assetAmounts[0]), parseFloat(assetAmounts[1]), parseFloat(assetAmounts[2])]
      );
    } else if (fund_id == "ai_infra") {
      await pool.query(
        'UPDATE mock_ai_index_vault SET fet = fet + $1, grt = grt + $2, rndr = rndr + $3, updated_at = NOW()',
        [parseFloat(assetAmounts[0]), parseFloat(assetAmounts[1]), parseFloat(assetAmounts[2])]
      );
    }
    await pool.query(
      'UPDATE mock_exchange SET balance = balance - $1, updated_at = NOW()',
      [amount_usd]
    );
  } else {
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const weight = weights[i];
      const usdForAsset = (amount_usd * weight).toFixed(8);
    
      // Step 1: Market order via Coinbase
      const productId = COINBASE_MAP[assetId];
      const order = await placeMarketOrder(productId, usdForAsset);
    
      // Step 2: Wait for fill
      const filledAmount = await waitForFill(order.order_id);
    
      // Step 3: Transfer to Fireblocks vault
      const tx = await transferCryptoToVault(assetId, filledAmount); 
    
      // Step 4: Record for DB insert
      investmentRows.push({
        asset_id: assetId,
        weight,
        usd: usdForAsset,
        filledAmount,
        txId: tx.id
      });
    }
  }
  
  // Insert into investment_ledger
  const ledgerValues = investmentRows.map(r => `($1, ${amount_usd}, '${r.asset_id}', ${r.weight}, ${r.usd}, ${r.filledAmount}, '${r.txId}', NOW(), '${fund_id}')`).join(",\n");
  await pool.query(`
    INSERT INTO investment_ledger (email, amount_usd, asset_id, asset_share, asset_value, units, fireblocks_tx_id, timestamp, fund_id)
    VALUES
    ${ledgerValues}
  `, [email]);

  // Update user_units (upsert)
  await pool.query(`
    INSERT INTO user_units (email, units, fund_id, last_updated)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (email, fund_id)
    DO UPDATE SET
      units = user_units.units + EXCLUDED.units,
      last_updated = NOW()
  `, [email, units, fund_id]);
  return true;
}

  