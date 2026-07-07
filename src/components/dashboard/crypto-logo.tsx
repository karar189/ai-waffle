"use client";

import { useState } from "react";

const COINCAP_ICON_BASE = "https://assets.coincap.io/assets/icons";

function cryptoIconUrl(symbol: string): string {
  const id = symbol.toLowerCase().replace(/\s+/g, "");
  return `${COINCAP_ICON_BASE}/${id}@2x.png`;
}

export function CryptoLogo({
  symbol,
  size = 28,
  className = "",
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = cryptoIconUrl(symbol);
  const sizeClass = size <= 24 ? "size-6" : size <= 32 ? "size-7" : "size-9";

  if (failed) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-400 ${className}`}
      >
        {symbol.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
