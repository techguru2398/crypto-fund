import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import fs from 'fs';
import path from 'path';
import { funds, COINGECKO_MAP } from './fund';
import { getPriceUSD } from './coingecho';
import { test_mode } from './mode';
import { pool } from './db';


// Read Fireblocks private key from file
const privateKeyPath = path.join(process.cwd(), process.env.FIREBLOCKS_SECRET_PATH!);
const fireblocksPrivateKey = fs.readFileSync(privateKeyPath, 'utf8');


const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

export async function transferToVault(asset: 'BTC' | 'LTC', amount: string) {
  return await fireblocks.createTransaction({
    assetId: asset,
    amount: parseFloat(amount).toFixed(8),
    source: { type: PeerType.EXCHANGE_ACCOUNT, id: 'Coinbase Prime' },
    destination: { type: PeerType.VAULT_ACCOUNT, id: process.env.VAULT_NAME },
    note: `Auto-transfer ${asset} from Coinbase Prime to vault ${process.env.VAULT_NAME}`,
  });
}

export async function getVaultIdByName(name: string): Promise<string> {
  const { accounts = [] } = await fireblocks.getVaultAccountsWithPageInfo({});
  const vault = accounts.find((v) => v.name === name);
  if (!vault) throw new Error(`Vault '${name}' not found`);
  return vault.id;
}

export async function getCurrentHoldings(fundId: string) {
  const fund = funds.find((f) => f.id === fundId);
  if (!fund) throw new Error(`Fund '${fundId}' not found`);
  
  const vaultId = await getVaultIdByName(fund.vault_name);
  const balances: Record<string, { amount: number; price: number; value: number }> = {};
  if(test_mode) {
    const res = await pool.query(`
      SELECT btc as BTC_TEST, ltc as LTC_TEST, eth as ETH_TEST5, xrp as XRP_TEST, usdt as USDT_BSC_TEST
      FROM mock_hodl_index_vault
      ORDER BY updated_at DESC
      LIMIT 1
      `);
    const raw = res.rows[0] as Record<string, string>;
    const latestRow = Object.entries(raw).reduce((acc, [key, value]) => {
      acc[key.toUpperCase()] = value;
      return acc;
    }, {} as Record<string, string>);
    console.log(latestRow);
    for (const assetId of fund.asset_ids) {
      try {
        const amount = parseFloat(latestRow[assetId]);
        const price = await getPriceUSD(assetId);
        balances[assetId] = {
          amount,
          price,
          value: amount * price,
        };
      } catch (err) {
        balances[assetId] = { amount: 0, price: 0, value: 0 };
      }
    }
    console.log("balances: ", balances);
    return balances;
  } else {
    for (const assetId of fund.asset_ids) {
      try {
        const asset = await fireblocks.getVaultAccountAsset(vaultId, assetId);
        const amount = parseFloat(asset.total);
        const price = await getPriceUSD(assetId);
        balances[assetId] = {
          amount,
          price,
          value: amount * price,
        };
      } catch (err) {
        balances[assetId] = { amount: 0, price: 0, value: 0 };
      }
    }
    console.log("balances: ", balances);
    return balances;
  }
}

export async function createRebalanceTransaction(
  assetId: string,
  action: 'BUY' | 'SELL',
  amount: number
) {
  return await fireblocks.createTransaction({
    assetId,
    amount: amount.toFixed(8),
    source: action === 'SELL'
      ? { type: PeerType.VAULT_ACCOUNT, id: process.env.VAULT_NAME! }
      : { type: PeerType.EXCHANGE_ACCOUNT, id: 'Coinbase Prime' },
    destination: action === 'BUY'
      ? { type: PeerType.VAULT_ACCOUNT, id: process.env.VAULT_NAME! }
      : { type: PeerType.EXCHANGE_ACCOUNT, id: 'Coinbase Prime' },
    note: `Auto-${action} ${assetId} during rebalance`,
  });
}

