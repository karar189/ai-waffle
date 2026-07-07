export type CasperMarketVenueKind = "cex" | "dex";
export type CasperMarketContractType = "spot" | "linear_perp" | "inverse_perp";
export type CasperMarketRowSource = "defillama" | "csprcloud";

export interface CasperMarketRow {
  id: string;
  venueKind: CasperMarketVenueKind;
  contractType: CasperMarketContractType;
  source: CasperMarketRowSource;
  exchange: string;
  symbol: string;
  pairUrl: string | null;
  price: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  volumePrev24h: number | null;
  oiUsd: number | null;
  oiPrevUsd: number | null;
  fundingRate8h: number | null;
  maxLeverage: number | null;
  makerFee: number | null;
  takerFee: number | null;
}

export interface CasperMarketTotals {
  pairCount: number;
  totalVolume24h: number;
  totalOiUsd: number | null;
}

export interface CasperMarketBuckets<T> {
  spot: T[];
  linear_perp: T[];
  inverse_perp: T[];
}

export interface CasperMarketTotalsBuckets {
  spot: CasperMarketTotals;
  linear_perp: CasperMarketTotals;
  inverse_perp: CasperMarketTotals;
}

export interface CasperMarketsResponse {
  fetchedAt: string;
  network: "casper-mainnet" | "casper-testnet";
  source: "DefiLlama + CSPR.cloud" | "Static Snapshot";
  tokenSymbol: string;
  exchangeCount: number;
  marketCount: number;
  totalVolume24h: number;
  totalOiUsd: number | null;
  cex: CasperMarketBuckets<CasperMarketRow>;
  dex: CasperMarketBuckets<CasperMarketRow>;
  totals: {
    cex: CasperMarketTotalsBuckets;
    dex: CasperMarketTotalsBuckets;
  };
}
