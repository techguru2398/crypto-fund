export const funds = [
    {
      id: "hodl_index",
      name: "HODL Index",
      asset_ids: ["BTC", "LTC", "ETH", "XRP", "USDT_BSC"],
      normal_weight: [0.2, 0.2, 0.2, 0.2, 0.2],
      volatile_weight: [0.125, 0.125, 0.125, 0.125, 0.5],
      vault_name: "hodl_fund_main",
    },
    {
      id: "btc_ltc",
      name: "BTC/LTC Index",
      asset_ids: ["BTC", "LTC"],
      normal_weight: [0.5, 0.5],
      volatile_weight: [0.5, 0.5],
      vault_name: "hodl_fund_main",
    },
    {
      id: "defi_core",
      name: "DeFi Core Index",
      asset_ids: ["AAVE", "UNI", "COMP"],
      normal_weight: [0.4, 0.35, 0.25],
      volatile_weight: [0.4, 0.35, 0.25],
      vault_name: "hodl_fund_main",
    },
    {
      id: "ai_infra",
      name: "AI & Infrastructure Index",
      asset_ids: ["FET", "GRT", "RNDR"],
      normal_weight: [0.3, 0.4, 0.3],
      volatile_weight: [0.3, 0.4, 0.3],
      vault_name: "hodl_fund_main",
    },
];

export const COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  ETH: 'ethereum',
  ETH5: 'ethereum',
  XRP: 'ripple',
  USDT: 'tether',
  USDT_BSC: 'tether',
  SOL: 'solana',
  AAVE: 'aave',
  UNI: 'uniswap',
  COMP: 'compound-governance-token',
  FET: 'fetch-ai',
  GRT: 'the-graph',
  RNDR: 'render-token',
};

export const COINBASE_MAP: Record<string, string> = {
  BTC: 'BTC-USD',
  LTC: 'LTC-USD',
  ETH: 'ETH-USD',
  ETH5: 'ETH-USD',
  XRP: 'XRP-USD',
  USDT: 'USDT-USD',
  USDT_BSC: 'USDT-USD',
  SOL: 'SOL-USD',
  AAVE: 'AAVE-USD',
  UNI: 'UNI-USD',
  COMP: 'COMP-USD',
  FET: 'FET-USD',
  GRT: 'GRT-USD',
  RNDR: 'RNDR-USD',
};
  