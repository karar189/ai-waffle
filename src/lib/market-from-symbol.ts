/**
 * Shared market data and resolver used by simulate page and market-dropdown.
 * Kept in lib so simulate page can import a plain function (avoids client-component import issues).
 */

export type MarketItem = {
  id: string;
  icon: string;
  pair: string;
  leverage: string;
  volume: string;
  price: string;
  change: string;
  changePositive: boolean;
  marketCap: string;
  symbol: string;
};

export const MARKETS: MarketItem[] = [
  { id: "eth", icon: "Ξ", pair: "ETH/USD", leverage: "10x", volume: "$6.71M", price: "2,924.49", change: "+0.01%", changePositive: true, marketCap: "$352.9B", symbol: "BINANCE:ETHUSDT" },
  { id: "sol", icon: "S", pair: "SOL/USD", leverage: "10x", volume: "$6.31M", price: "123.21", change: "+0.98%", changePositive: true, marketCap: "$69.4B", symbol: "BINANCE:SOLUSDT" },
  { id: "bnb", icon: "B", pair: "BNB/USD", leverage: "10x", volume: "$2.25M", price: "839.50", change: "+0.92%", changePositive: true, marketCap: "$115.6B", symbol: "BINANCE:BNBUSDT" },
  { id: "btc", icon: "₿", pair: "BTC/USD", leverage: "10x", volume: "$1.27M", price: "87,440.20", change: "+0.25%", changePositive: true, marketCap: "$1.7T", symbol: "BINANCE:BTCUSDT" },
  { id: "usdt", icon: "₮", pair: "USDT/USD", leverage: "10x", volume: "$1.06M", price: "0.9996", change: "0.00%", changePositive: true, marketCap: "$186.8B", symbol: "BINANCE:USDTUSDT" },
  { id: "hype", icon: "H", pair: "HYPE/USD", leverage: "8x", volume: "$391.34K", price: "25.593", change: "-2.75%", changePositive: false, marketCap: "$12.7B", symbol: "BINANCE:HYPEUSDT" },
  { id: "sui", icon: "S", pair: "SUI/USD", leverage: "10x", volume: "$171.40K", price: "1.4212", change: "+2.64%", changePositive: true, marketCap: "$5.3B", symbol: "BINANCE:SUIUSDT" },
];

const CRYPTO_ICONS: Record<string, string> = { BTC: "₿", ETH: "Ξ", SOL: "◎", BNB: "●", XRP: "⚫", SUI: "💧", HYPE: "⬡", LIT: "⚡", PAXG: "🟡", DOGE: "🐕", USDT: "₮" };

/** Resolve symbol (e.g. "BTC") or pair (e.g. "BTC/USD") to a MarketItem. */
export function marketFromSymbolOrPair(symbolOrPair: string): MarketItem {
  const normalized = symbolOrPair.replace(/-PERP$/, "").trim().toUpperCase();
  const pair = normalized.includes("/") ? normalized : `${normalized}/USD`;
  const found = MARKETS.find(
    (m) => m.pair === pair || m.pair.replace("/", "") === normalized || m.id === normalized.toLowerCase()
  );
  if (found) return found;
  const base = pair.split("/")[0] ?? normalized;
  const icon = CRYPTO_ICONS[base] ?? base.charAt(0);
  return {
    id: base.toLowerCase(),
    icon,
    pair,
    leverage: "10x",
    volume: "—",
    price: "—",
    change: "—",
    changePositive: true,
    marketCap: "—",
    symbol: `BINANCE:${base}USDT`,
  };
}
