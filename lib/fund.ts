export const funds = [
    {
      id: "hodl_index",
      name: "HODL Index",
      asset_ids: ["BTC_TEST", "LTC_TEST", "ETH_TEST5", "XRP_TEST", "USDT_BSC_TEST"],
      normal_weight: [0.2, 0.2, 0.2, 0.2, 0.2],
      volatile_weight: [0.125, 0.125, 0.125, 0.125, 0.5],
      vault_name: "hodl_fund_main",
    },
    {
      id: "btc_ltc",
      name: "BTC/LTC Index",
      asset_ids: ["BTC_TEST", "LTC_TEST"],
      normal_weight: [0.5, 0.5],
      volatile_weight: [0.5, 0.5],
      vault_name: "hodl_fund_main",
    },
    {
      id: "defi_core",
      name: "DeFi Core Index",
      asset_ids: ["AAVE_TEST", "UNI_TEST", "COMP_TEST"],
      normal_weight: [0.4, 0.35, 0.25],
      volatile_weight: [0.4, 0.35, 0.25],
      vault_name: "hodl_fund_main",
    },
    {
      id: "ai_infra",
      name: "AI & Infrastructure Index",
      asset_ids: ["FET_TEST", "GRT_TEST", "RNDR_TEST"],
      normal_weight: [0.3, 0.4, 0.3],
      volatile_weight: [0.3, 0.4, 0.3],
      vault_name: "hodl_fund_main",
    },
];

export const COINGECKO_MAP: Record<string, string> = {
  BTC_TEST: 'bitcoin',
  LTC_TEST: 'litecoin',
  ETH_TEST: 'ethereum',
  ETH_TEST5: 'ethereum',
  XRP_TEST: 'ripple',
  USDT_TEST: 'tether',
  USDT_BSC_TEST: 'tether',
  SOL_TEST: 'solana',
  AAVE_TEST: 'aave',
  UNI_TEST: 'uniswap',
  COMP_TEST: 'compound-governance-token',
  FET_TEST: 'fetch-ai',
  GRT_TEST: 'the-graph',
  RNDR_TEST: 'render-token',
};
  