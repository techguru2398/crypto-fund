import yahooFinance from 'yahoo-finance2';

export async function getVIX(): Promise<number> {
  try {
    const vix = await yahooFinance.quote("^VIX");
    return vix.regularMarketPrice ?? 0;
  } catch (err) {
    console.error("❌ Failed to fetch VIX:", err);
    return 0;
  }
}

