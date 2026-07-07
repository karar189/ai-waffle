"use client";

import { useEffect, useRef } from "react";

const FOREX_SYMBOLS = [
  { proName: "FX:EURUSD", description: "Euro / US Dollar" },
  { proName: "FX:GBPUSD", description: "British Pound / US Dollar" },
  { proName: "FX:USDJPY", description: "US Dollar / Japanese Yen" },
  { proName: "FX:USDCHF", description: "US Dollar / Swiss Franc" },
  { proName: "FX:AUDUSD", description: "Australian Dollar / US Dollar" },
  { proName: "FX:NZDUSD", description: "New Zealand Dollar / US Dollar" },
  { proName: "FX:USDCAD", description: "US Dollar / Canadian Dollar" },
  { proName: "FX:EURGBP", description: "Euro / British Pound" },
];

const TICKER_TAPE_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
const MARKET_OVERVIEW_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";

const tickerTapeConfig = {
  symbols: FOREX_SYMBOLS,
  showSymbolLogo: true,
  colorTheme: "dark" as const,
  isTransparent: true,
  displayMode: "adaptive" as const,
  locale: "en",
};

const marketOverviewConfig = {
  colorTheme: "dark" as const,
  dateRange: "12M" as const,
  showChart: true,
  locale: "en",
  width: "100%",
  height: "400",
  largeChartUrl: "",
  isTransparent: true,
  showSymbolLogo: true,
  showFloatingTooltip: false,
  plotLineColorGrowing: "rgba(16, 185, 129, 1)",
  plotLineColorFalling: "rgba(239, 68, 68, 1)",
  gridLineColor: "rgba(255, 255, 255, 0.06)",
  scaleFontColor: "rgba(255, 255, 255, 0.5)",
  belowLineFillColorGrowing: "rgba(16, 185, 129, 0.05)",
  belowLineFillColorFalling: "rgba(239, 68, 68, 0.05)",
  belowLineFillColorGrowingBottom: "rgba(16, 185, 129, 0)",
  belowLineFillColorFallingBottom: "rgba(239, 68, 68, 0)",
  symbolActiveColor: "rgba(255, 255, 255, 0.12)",
  tabs: [
    {
      title: "Major pairs",
      symbols: [
        { s: "FX:EURUSD", d: "Euro / US Dollar" },
        { s: "FX:GBPUSD", d: "British Pound / US Dollar" },
        { s: "FX:USDJPY", d: "US Dollar / Japanese Yen" },
        { s: "FX:USDCHF", d: "US Dollar / Swiss Franc" },
        { s: "FX:AUDUSD", d: "Australian Dollar / US Dollar" },
        { s: "FX:USDCAD", d: "US Dollar / Canadian Dollar" },
      ],
    },
    {
      title: "Crosses",
      symbols: [
        { s: "FX:EURGBP", d: "Euro / British Pound" },
        { s: "FX:EURJPY", d: "Euro / Japanese Yen" },
        { s: "FX:GBPJPY", d: "British Pound / Japanese Yen" },
        { s: "FX:AUDJPY", d: "Australian Dollar / Japanese Yen" },
        { s: "FX:NZDUSD", d: "New Zealand Dollar / US Dollar" },
      ],
    },
  ],
};

function useTradingViewWidget(
  scriptUrl: string,
  config: Record<string, unknown>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.textContent = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [scriptUrl, config, containerRef]);
}

export function TradingViewForexTicker({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTradingViewWidget(TICKER_TAPE_SCRIPT, tickerTapeConfig, containerRef);

  return (
    <div
      className={className}
      style={{ height: 46 }}
    >
      <div ref={containerRef} className="tradingview-widget-container w-full" />
    </div>
  );
}

export function TradingViewForexMarketOverview({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTradingViewWidget(MARKET_OVERVIEW_SCRIPT, marketOverviewConfig, containerRef);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full"
        style={{ minHeight: 400 }}
      />
    </div>
  );
}
