"use client";

import { useEffect, useRef } from "react";

const TICKER_SYMBOLS = [
  { description: "ETH/USD", proName: "BINANCE:ETHUSDT" },
  { description: "BNB/USD", proName: "BINANCE:BNBUSDT" },
  { description: "SOL/USD", proName: "BINANCE:SOLUSDT" },
  { description: "XRP/USD", proName: "BINANCE:XRPUSDT" },
  { description: "ADA/USD", proName: "BINANCE:ADAUSDT" },
  { description: "DOGE/USD", proName: "BINANCE:DOGEUSDT" },
  { description: "BTC/USD", proName: "BINANCE:BTCUSDT" },
  { description: "HYPE/USD", proName: "BINANCE:HYPEUSDT" },
  { description: "SUI/USD", proName: "BINANCE:SUIUSDT" },
  { description: "JUP/USD", proName: "BINANCE:JUPUSDT" },
];

const WIDGET_SCRIPT_URL = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";

export function TradingViewTickerTape({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const config = {
      symbols: TICKER_SYMBOLS,
      showSymbolLogo: true,
      colorTheme: "dark" as const,
      isTransparent: true,
      displayMode: "regular" as const,
      width: "100%",
      height: 46,
      locale: "en",
    };

    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.textContent = JSON.stringify(config);

    const widgetScript = document.createElement("script");
    widgetScript.type = "text/javascript";
    widgetScript.src = WIDGET_SCRIPT_URL;
    widgetScript.async = true;

    container.appendChild(configScript);
    container.appendChild(widgetScript);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container overflow-hidden ${className ?? ""}`}
      style={{ height: 46 }}
    />
  );
}
