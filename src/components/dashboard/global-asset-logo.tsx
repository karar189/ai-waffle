"use client";

import { useState } from "react";

const FLAG_CDN = "https://flagcdn.com";
const FLAG_SIZE = 40;

// Base currency (first part of pair) -> ISO 3166-1 alpha-2 for flag
const FOREX_BASE_FLAG: Record<string, string> = {
  EUR: "eu",
  GBP: "gb",
  USD: "us",
  JPY: "jp",
  CHF: "ch",
  AUD: "au",
  CAD: "ca",
  NZD: "nz",
};

// Index name -> country code for flag
const INDEX_FLAG: Record<string, string> = {
  "S&P 500": "us",
  "US 100": "us",
  "DAX": "de",
  "FTSE 100": "gb",
  "Nikkei 225": "jp",
  "CAC 40": "fr",
  "Hang Seng": "hk",
  "NIFTY 50": "in",
  "BANK NIFTY": "in",
  "Nifty IT": "in",
  "Nifty Bank": "in",
  "Nifty Auto": "in",
  "Nifty FMCG": "in",
  "Nifty Pharma": "in",
  "Nifty Metal": "in",
  "Nifty Realty": "in",
  "Sensex": "in",
};

function forexPairToFlagCode(pair: string): string | null {
  const base = pair.split("/")[0]?.trim() ?? "";
  return FOREX_BASE_FLAG[base] ?? null;
}

function indexToFlagCode(name: string): string | null {
  return INDEX_FLAG[name] ?? null;
}

export function GlobalAssetLogo({
  label,
  type,
  size = 28,
  className = "",
}: {
  label: string;
  type: "forex" | "index" | "commodity" | "stock";
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size <= 24 ? "size-6" : size <= 32 ? "size-7" : "size-9";

  let flagCode: string | null = null;
  if (type === "forex") flagCode = forexPairToFlagCode(label);
  if (type === "index" || type === "stock") flagCode = type === "index" ? indexToFlagCode(label) : null;

  const logoSrc = flagCode ? `${FLAG_CDN}/w${FLAG_SIZE}/${flagCode}.png` : null;

  if (failed || !logoSrc) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-semibold text-amber-400 ${className}`}
      >
        {label.slice(0, 2).replace(/\s/g, "")}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt=""
      width={size}
      height={size}
      className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-white/10 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
