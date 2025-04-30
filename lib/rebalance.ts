import { pool } from './db'; // global pg.Pool instance
import axios from 'axios';
import { COINGECKO_MAP, funds } from './fund';
import { getCurrentHoldings, createRebalanceTransaction } from './fireblocks'
import { getVIX } from './vix';

type ActionPlan = {
  assetId: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
};

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
  const btc = weights['BTC'] || 0;
  const ltc = weights['LTC'] || 0;
  const eth = weights['ETH'] || weights['ETH'] || 0;
  const xrp = weights['XRP'] || 0;
  const usdt = weights['USDT_BSC'] || weights['USDT'] || 0;

  await pool.query(
    `INSERT INTO hodl_index_weights (btc, ltc, eth, xrp, usdt, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [btc, ltc, eth, xrp, usdt]
  );

  console.log('✅ HODL weights saved:', { btc, ltc, eth, xrp, usdt });
}

export async function rebalancePortfolio(fundId: string, force) {
  const vix = await getVIX();
  await logVIX(vix);
  const useVolatileAllocation = vix > Number(process.env.VIX_THRESHOLD);

  if(process.env.MODE == "test") {
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) throw new Error(`Fund '${fundId}' not found`);
    
    const holdings = await getCurrentHoldings(fundId);
    const totalValue = Object.values(holdings).reduce((sum, h) => sum + h.value, 0);
    console.log("totalValue: ", totalValue);
    const targetWeights = useVolatileAllocation ? fund.volatile_weight : fund.normal_weight;
    const assetIds = fund.asset_ids;

    const finalWeights: Record<string, number> = {};
    for (const assetId of assetIds) {
      finalWeights[assetId] = (holdings[assetId]?.value || 0) / totalValue;
    }
    if(fundId == "hodl_index")
      await saveHodlWeights(finalWeights);

    let needsRebalance = false;
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const targetWeight = targetWeights[i];
      const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
      const currentWeight = current.value / totalValue;

      const delta = targetWeight - currentWeight;
      if (Math.abs(delta) >= Number(process.env.REBALANCE_THRESHOLD)) {
        needsRebalance = true;
        break;
      }
    }

    if (needsRebalance || force) {
      const newAmounts: Record<string, number> = {};
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const targetWeight = targetWeights[i];
        const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
        const currentWeight = current.value / totalValue;

        const delta = targetWeight - currentWeight;
        const price = current.price || 1; // Prevent divide-by-zero
        if(price == 0)
          return;
        const amount = (delta * totalValue) / price;
        const action: 'BUY' | 'SELL' = delta > 0 ? 'BUY' : 'SELL';
        newAmounts[assetId] = current.amount + amount;
        await logRebalance(assetId, action, Math.abs(amount), delta);
      }
      console.log("newAmounts: ", newAmounts);
      if(fundId == "hodl_index") {
        console.log("hodl_index: ", newAmounts);
        await pool.query(
          'UPDATE mock_hodl_index_vault SET btc = $1, ltc = $2, eth = $3, xrp = $4, usdt = $5, updated_at = NOW()',
          [newAmounts["BTC"], newAmounts["LTC"], newAmounts["ETH"], newAmounts["XRP"], newAmounts["USDT_BSC"]]
        );
      } else if(fundId == "btc_ltc") {
        console.log("btc_ltc: ", newAmounts);
        await pool.query(
          'UPDATE mock_bl_index_vault SET btc = $1, ltc = $2, updated_at = NOW()',
          [newAmounts["BTC"], newAmounts["LTC"]]
        );
      } else if(fundId == "defi_core") {
        console.log("defi_core: ", newAmounts);
        await pool.query(
          'UPDATE mock_defi_index_vault SET aave = $1, uni = $2, comp = $3, updated_at = NOW()',
          [newAmounts["AAVE"], newAmounts["UNI"], newAmounts["COMP"]]
        );
      } else if(fundId == "ai_infra") {
        console.log("ai_infra: ", newAmounts);
        await pool.query(
          'UPDATE mock_ai_index_vault SET fet = $1, grt = $2, rndr = $3, updated_at = NOW()',
          [newAmounts["FET"], newAmounts["GRT"], newAmounts["RNDR"]]
        );
      }
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
      if (Math.abs(delta) >= Number(process.env.REBALANCE_THRESHOLD)) {
        needsRebalance = true;
        break;
      }
    }

    if (needsRebalance || force) {
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const targetWeight = targetWeights[i];
        const current = holdings[assetId] || { amount: 0, price: 0, value: 0 };
        const currentWeight = current.value / totalValue;

        const delta = targetWeight - currentWeight;
        const price = current.price || 1; // Prevent divide-by-zero
        if(price == 0)
          return;
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