import axios from 'axios';
import crypto from 'crypto';

const API_KEY = process.env.COINBASE_API_KEY!;
const API_SECRET = process.env.COINBASE_API_SECRET!;
const API_PASSPHRASE = process.env.COINBASE_API_PASSPHRASE!;
const COINBASE_API_URL = 'https://api.coinbase.com/api/v3/brokerage';

function signRequest(method: string, path: string, body: string, timestamp: string) {
  const message = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('base64');
}

export async function getFiatBalance(currency: 'USD' = 'USD'): Promise<number> {
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
  