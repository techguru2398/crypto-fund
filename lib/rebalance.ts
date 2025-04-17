import { pool } from './db'; // global pg.Pool instance
import axios from 'axios';
import { COINGECKO_MAP, funds } from './fund';
import { getCurrentHoldings, createRebalanceTransaction } from './fireblocks'
import yahooFinance from 'yahoo-finance2';
import { test_mode } from './mode';

const VIX_THRESHOLD = 20;
const VIX_BUFFER = 0.04;
const REBALANCE_THRESHOLD = 0.05;

type ActionPlan = {
  assetId: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
};

async function getVIX(): Promise<number> {
  try {
    const vix = await yahooFinance.quote("^VIX");
    return vix.regularMarketPrice ?? 0;
  } catch (err) {
    console.error("❌ Failed to fetch VIX:", err);
    return 0;
  }
}

async function logVIX(value: number) {
  try {
    await pool.query(`
      INSERT INTO vix_log (value)
      VALUES ($1)
    `, [value]);
    console.log("📝 VIX logged to DB:", value);
  } catch (err) {
    console.error("❌ Failed to log VIX:", err);
  }
}

async function logRebalance(assetId: string, action: string, amount: number, delta: number) {
  await pool.query(
    `INSERT INTO rebalance_logs (asset_id, action, amount, delta) VALUES ($1, $2, $3, $4)`,
    [assetId, action, amount, delta]
  );
}

async function saveHodlWeights(weights: Record<string, number>) {
  const btc = weights['BTC_TEST'] || 0;
  const ltc = weights['LTC_TEST'] || 0;
  const eth = weights['ETH_TEST5'] || weights['ETH_TEST'] || 0;
  const xrp = weights['XRP_TEST'] || 0;
  const usdt = weights['USDT_BSC_TEST'] || weights['USDT_TEST'] || 0;

  await pool.query(
    `INSERT INTO hodl_index_weights (btc, ltc, eth, xrp, usdt, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [btc, ltc, eth, xrp, usdt]
  );

  console.log('✅ HODL weights saved:', { btc, ltc, eth, xrp, usdt });
}

export async function rebalancePortfolio(fundId = "hodl_index", tolerance = REBALANCE_THRESHOLD) {
  const vix = await getVIX();
  await logVIX(vix);
  const useVolatileAllocation = vix > VIX_THRESHOLD;

  if(test_mode) {
    const fundId = "hodl_index";
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) throw new Error(`Fund '${fundId}' not found`);
    
    const holdings = await getCurrentHoldings(fundId);
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.value, 0);
    const targetWeights = useVolatileAllocation ? fund.volatile_weight : fund.normal_weight;
    const assetIds = fund.asset_ids;

    const finalWeights: Record<string, number> = {};
    for (const assetId of assetIds) {
      finalWeights[assetId] = (holdings[assetId]?.value || 0) / totalValue;
    }
    await saveHodlWeights(finalWeights);

    let needsRebalance = false;
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const targetWeight = targetWeights[i];
      const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
      const currentWeight = current.value / totalValue;

      const delta = targetWeight - currentWeight;
      if (Math.abs(delta) >= tolerance) {
        needsRebalance = true;
        break;
      }
    }

    if (needsRebalance) {
      const newAmounts: Record<string, number> = {};
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const targetWeight = targetWeights[i];
        const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
        const currentWeight = current.value / totalValue;

        const delta = targetWeight - currentWeight;
        const price = current.price || 1; // Prevent divide-by-zero
        const amount = (delta * totalValue) / price;
        const action: 'BUY' | 'SELL' = delta > 0 ? 'BUY' : 'SELL';
        newAmounts[assetId] = current.amount + amount;
        await logRebalance(assetId, action, Math.abs(amount), delta);
      }
      console.log("newAmounts: ", newAmounts);
      await pool.query(
        `INSERT INTO mock_hodl_index_vault (btc, ltc, eth, xrp, usdt)
         VALUES ($1, $2, $3, $4, $5)`,
        [newAmounts["BTC_TEST"], newAmounts["LTC_TEST"], newAmounts["ETH_TEST5"], newAmounts["XRP_TEST"], newAmounts["USDT_BSC_TEST"]]
      );
    }
  } else {
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) throw new Error(`Fund '${fundId}' not found`);
    const holdings = await getCurrentHoldings(fund.id);
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.value, 0);
    const targetWeights = useVolatileAllocation ? fund.volatile_weight : fund.normal_weight;
    const assetIds = fund.asset_ids;

    const finalWeights: Record<string, number> = {};
    const plan: ActionPlan[] = [];

    for (const assetId of assetIds) {
      finalWeights[assetId] = (holdings[assetId]?.value || 0) / totalValue;
    }
    await saveHodlWeights(finalWeights);

    let needsRebalance = false;
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const targetWeight = targetWeights[i];
      const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
      const currentWeight = current.value / totalValue;

      const delta = targetWeight - currentWeight;
      if (Math.abs(delta) >= tolerance) {
        needsRebalance = true;
        break;
      }
    }

    if (needsRebalance) {
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const targetWeight = targetWeights[i];
        const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
        const currentWeight = current.value / totalValue;

        const delta = targetWeight - currentWeight;
        const price = current.price || 1; // Prevent divide-by-zero
        const amount = (delta * totalValue) / price;
        const action: 'BUY' | 'SELL' = delta > 0 ? 'BUY' : 'SELL';

        plan.push({ assetId, action, amount: Math.abs(amount), price });
        await logRebalance(assetId, action, Math.abs(amount), delta);
      }
    }

    // Step 1: SELL - Vault → Exchange
    for (const p of plan.filter(p => p.action === 'SELL')) {
      console.log(`🔁 Transferring ${p.amount} ${p.assetId} from Vault to Exchange`);
      await createRebalanceTransaction(p.assetId, 'SELL', p.amount);
    }

    // Step 2: TRADE - Simulate or execute trade on exchange (implement separately)
    for (const p of plan.filter(p => p.action === 'SELL')) {
      console.log(`💱 Selling ${p.amount} ${p.assetId} on exchange...`);
      // await exchangeApi.sell(p.assetId, p.amount); // <-- implement this
    }
    for (const p of plan.filter(p => p.action === 'BUY')) {
      console.log(`💱 Buying ${p.amount} ${p.assetId} on exchange...`);
      // await exchangeApi.buy(p.assetId, p.amount); // <-- implement this
    }

    // Step 3: BUY - Exchange → Vault
    for (const p of plan.filter(p => p.action === 'BUY')) {
      console.log(`🔁 Transferring ${p.amount} ${p.assetId} from Exchange to Vault`);
      await createRebalanceTransaction(p.assetId, 'BUY', p.amount);
    }
  }
}