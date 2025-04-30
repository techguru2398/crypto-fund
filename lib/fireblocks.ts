import { FireblocksSDK, PeerType } from 'fireblocks-sdk';
import fs from 'fs';
import path from 'path';
import { funds, COINGECKO_MAP } from './fund';
import { getPriceUSD } from './coinbase';
import { pool } from './db';
import { getLatestNAV } from './nav';


// Read Fireblocks private key from file
const fireblocksPrivateKey = Buffer.from(process.env.FIREBLOCKS_SECRET_B64!, 'base64').toString('utf8');


const fireblocks = new FireblocksSDK(
  fireblocksPrivateKey,
  process.env.FIREBLOCKS_API_KEY!,
  'https://sandbox-api.fireblocks.io'
);

export async function getFiatBalance() {
  if(process.env.MODE == "test") {
    const res = await pool.query('SELECT balance FROM mock_bank');
    const bankBalance = res.rows[0].balance;
    console.log("bankBalance: ", bankBalance);
    return parseFloat(bankBalance);
  } else {
    const accounts = await fireblocks.getFiatAccounts();
    const account = accounts.find(acc => acc.id === process.env.Fireblocks_FIAT_ACCOUNT_ID);
    if (!account) {
      throw new Error(`FIAT account with ID ${process.env.Fireblocks_FIAT_ACCOUNT_ID} not found`);
    }
  
    const asset = account.assets.find(a => a.id === "USD");
    if (!asset) {
      throw new Error(`USD not found in the FIAT account`);
    }
  
    return parseFloat(asset.total);
  }
}

export async function transferUsdToExchange(amountUsd: number) {
  if(process.env.MODE == "test") {
    await pool.query(
      'UPDATE mock_bank SET balance = 0, updated_at = NOW()',
    );
    await pool.query(
      'UPDATE mock_exchange SET balance = balance + $1, updated_at = NOW()',
      [amountUsd]
    );
  } else {
    await fireblocks.createTransaction({
      assetId: "USD",
      amount: amountUsd.toFixed(8),
      source: { type: PeerType.FIAT_ACCOUNT, id: process.env.Fireblocks_FIAT_ACCOUNT_ID },
      destination: { type: PeerType.EXCHANGE_ACCOUNT, id: process.env.Fireblocks_EXCHANGE_ACCOUNT_ID },
      note: "Funding for crypto buy",
    });
  }
}

export async function transferCryptoToVault(asset: string, amount: string) {
  return await fireblocks.createTransaction({
    assetId: asset,
    amount: parseFloat(amount).toFixed(8),
    source: { type: PeerType.EXCHANGE_ACCOUNT, id: process.env.Fireblocks_EXCHANGE_ACCOUNT_ID },
    destination: { type: PeerType.VAULT_ACCOUNT, id: process.env.VAULT_NAME },
    note: `Transfer ${asset} from Coinbase Prime to vault ${process.env.VAULT_NAME}`,
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
  
  const balances: Record<string, { amount: number; price: number; value: number }> = {};
  if(process.env.MODE == "test") {
    let res;
    if(fundId == "hodl_index") {
      res = await pool.query(`
        SELECT btc as BTC, ltc as LTC, eth as ETH, xrp as XRP, usdt as USDT_BSC
        FROM mock_hodl_index_vault
      `);
    } else if(fundId == "btc_ltc") {
      res = await pool.query(`
        SELECT btc as BTC, ltc as LTC
        FROM mock_bl_index_vault
      `);
    } else if(fundId == "defi_core") {
      res = await pool.query(`
        SELECT aave as AAVE, uni as UNI, comp as COMP
        FROM mock_defi_index_vault
      `);
    } else if(fundId == "ai_infra") {
      res = await pool.query(`
        SELECT fet as FET, grt as GRT, rndr as RNDR
        FROM mock_ai_index_vault
      `);
    }
    const raw = res.rows[0] as Record<string, string>;
    const latestRow = Object.entries(raw).reduce((acc, [key, value]) => {
      acc[key.toUpperCase()] = value;
      return acc;
    }, {} as Record<string, string>);
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
    return balances;
  } else {
    const vaultId = await getVaultIdByName(fund.vault_name);
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


export async function sendUSDCToTransak(amount: number) {
  const treasury_usdc_id = await getVaultIdByName('treasury_usdc');
  const transaction = await fireblocks.createTransaction({
    assetId: "USDC",
    amount: amount.toFixed(8),
    source: {
      type: PeerType.VAULT_ACCOUNT,
      id: treasury_usdc_id,
    },
    destination: {
      type: PeerType.ONE_TIME_ADDRESS,
      oneTimeAddress: {
        address: process.env.TRANSAK_USDC_WALLET_ADDRESS!,
      },
    },
    note: "Offramp USDC to Transak",
  });

  return transaction;
}

export async function sellCrypto(amount: number, fund_id: string, email: string) {
  const fund = funds.find(f => f.id === fund_id);
  if (!fund) {
    throw new Error(`Fund ${fund_id} not found`);
  }

  const holdings = await getCurrentHoldings(fund_id);
  console.log('✅ Current Holdings:', holdings);

  let totalFundValueUSD = 0;
  for (const assetId of fund.asset_ids) {
    const assetData = holdings[assetId];
    if (!assetData) continue;
    totalFundValueUSD += assetData.value;
  }

  if (totalFundValueUSD < amount) {
    return { success: false, message: 'There is not enough fund.' };
  }

  console.log('✅ totalFundValueUSD:', totalFundValueUSD);

  const nav = await getLatestNAV(fund_id);
  const units = amount / nav;

  const unitsRes = await pool.query("SELECT units FROM user_units WHERE email = $1 AND fund_id = $2", [email, fund_id]);
  const currentUnits = unitsRes.rows.length > 0 ? parseFloat(unitsRes.rows[0].units) : 0;

  if (currentUnits < units) {
    return { success: false, message: 'There is not enough fund.' };
  }

  const proportionToSell = amount / totalFundValueUSD;
  console.log('✅ Proportion to sell:', proportionToSell);
  if(process.env.MODE == "test") {
    let updateSetClauses: string[] = [];
    let updateValues: any[] = [];
    let idx = 1;

    for (const assetId of fund.asset_ids) {
      const assetData = holdings[assetId];
      if (!assetData || assetData.amount === 0) continue;

      const amountToSell = assetData.amount * proportionToSell;
      if (amountToSell <= 0) continue;

      console.log(`🛒 Selling ${amountToSell} units of ${assetId}`);

      updateSetClauses.push(`${assetId.toLowerCase()} = ${assetId.toLowerCase()} - $${idx++}`);
      updateValues.push(amountToSell);
    }

    if (updateSetClauses.length > 0) {
      let tableName = getMockVaultTableName(fund_id);

      await pool.query(
        `UPDATE ${tableName} SET ${updateSetClauses.join(', ')} updated_at = NOW()`,
        updateValues
      );
      console.log('✅ Mock vault updated.');
    }

    await pool.query(
      `INSERT INTO mock_treasury_usdc_vault (balance) VALUES ($1)`,
      [amount]
    );
    console.log('✅ Mock exchange updated (USDC added).');

    await pool.query(
      `UPDATE user_units SET units = units - $1 last_updated = NOW() WHERE email = $2 AND fund_id = $3`,
      [units, email, fund_id]
    );

    await pool.query(
      `INSERT INTO redemption_log (email, units, value_usd, fund_id, status) VALUES ($1, $2, $3, $4, $5)`,
      [email, units, amount, fund_id, "complete"]
    );
    
    return { success: true, soldAmount: amount };
  } else {

    console.log(`🚀 Starting sellCrypto for ${amount} USDC from fund: ${fund_id}`);
  
    // 1. Find Fund Details
    const fund = funds.find(f => f.id === fund_id);
    if (!fund) {
      throw new Error(`Fund ${fund_id} not found`);
    }
  
    const vaultId = await getVaultIdByName(fund.vault_name);
  
    // 2. Get Current Holdings
    const holdings = await getCurrentHoldings(fund_id);
    console.log('✅ Current Holdings:', holdings);
  
    // 3. Calculate NAV (Net Asset Value)
    let totalFundValueUSD = 0;
    for (const assetId of fund.asset_ids) {
      const assetData = holdings[assetId];
      if (!assetData) continue;
      totalFundValueUSD += assetData.value;
    }
    console.log('✅ Fund NAV (total value in USD):', totalFundValueUSD);
  
    if (totalFundValueUSD === 0) {
      throw new Error('Total fund value is zero. Cannot sell.');
    }
  
    // 4. Calculate units to burn for each asset
    const proportionToSell = amount / totalFundValueUSD;
    console.log('✅ Proportion to sell:', proportionToSell);
  
    // Track how much USDC we expect to get
    let expectedUSDC = 0;
  
    for (const assetId of fund.asset_ids) {
      const assetData = holdings[assetId];
      if (!assetData || assetData.amount === 0) {
        console.log(`⚠️ Skipping ${assetId} because no balance.`);
        continue;
      }
  
      const amountToSell = assetData.amount * proportionToSell;
  
      if (amountToSell <= 0) {
        console.log(`⚠️ Skipping ${assetId} because sell amount is too small.`);
        continue;
      }
  
      console.log(`🛒 Selling ${amountToSell} of ${assetId}...`);
  
      // 5. Fireblocks sell transaction (Vault -> Exchange)
      await createRebalanceTransaction(assetId, 'SELL', amountToSell);
  
      expectedUSDC += amountToSell * assetData.price;
    }
  
    console.log(`✅ Expected USDC to be received: ${expectedUSDC} USD`);
  
    // 6. (Optional) Wait a few minutes for trades to settle on exchange before transferring USDC.
    //    In real production, you would check balance instead of sleeping.
  
    // 7. Transfer USDC from Exchange to Treasury Vault
    await transferCryptoToVault('USDC', expectedUSDC.toFixed(8));
    console.log('✅ USDC transferred to treasury_usdc vault.');
  
    return { expectedUSDC };
  }

}

function getMockVaultTableName(fundId: string) {
  if (fundId === "hodl_index") return "mock_hodl_index_vault";
  if (fundId === "btc_ltc") return "mock_bl_index_vault";
  if (fundId === "defi_core") return "mock_defi_index_vault";
  if (fundId === "ai_infra") return "mock_ai_index_vault";
  throw new Error(`Unknown fund id: ${fundId}`);
}


