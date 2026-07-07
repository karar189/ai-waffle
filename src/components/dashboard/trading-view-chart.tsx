"use client";

import { useEffect, useRef } from "react";

// Extend window to include TradingView
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: TradingViewWidgetConfig) => void;
    };
  }
}

interface TradingViewWidgetConfig {
  autosize?: boolean;
  symbol?: string;
  interval?: string;
  timezone?: string;
  theme?: string;
  style?: string;
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  hide_top_toolbar?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  container_id?: string;
  height?: number | string;
  width?: number | string;
  backgroundColor?: string;
  gridColor?: string;
}

interface TradingViewChartProps {
  className?: string;
  symbol?: string;
  interval?: string;
  containerId?: string;
}

export function TradingViewChart({
  className,
  symbol = "BINANCE:ETHUSDT",
  interval = "15",
  containerId = "tradingview-chart",
}: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const initChart = () => {
      if (!window.TradingView || !chartRef.current) return;

      // Clear existing chart
      chartRef.current.innerHTML = "";

      // Wait for next frame to ensure container is properly sized
      requestAnimationFrame(() => {
        if (!window.TradingView || !chartRef.current) return;

        // Get actual container dimensions (min 500 so chart doesn't collapse in flex layouts)
        const container = chartRef.current.parentElement;
        const calculatedHeight = container ? Math.max(container.offsetHeight, 500) : 500;

        new window.TradingView.widget({
          autosize: false,
          symbol: symbol,
          interval: interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1", // Candlestick
          locale: "en",
          toolbar_bg: "#000000",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          height: calculatedHeight,
          width: "100%",
          backgroundColor: "rgba(0, 0, 0, 0)",
          gridColor: "rgba(255, 255, 255, 0.05)",
        });
      });
    };

    // Check if TradingView script is already loaded
    if (window.TradingView) {
      initChart();
    } else {
      // Load TradingView script if not already loaded
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = initChart;
        document.body.appendChild(script);
      } else {
        // Script exists but TradingView not ready yet, wait for it
        const checkTradingView = setInterval(() => {
          if (window.TradingView) {
            clearInterval(checkTradingView);
            initChart();
          }
        }, 100);

        return () => clearInterval(checkTradingView);
      }
    }

    return () => {
      // Cleanup: TradingView widget doesn't provide a direct cleanup method
      // The widget manages its own lifecycle in the iframe
      if (chartRef.current) {
        chartRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval, containerId]);

  return <div id={containerId} ref={chartRef} className={className} />;
}
