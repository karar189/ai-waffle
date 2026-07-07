"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CandlestickChart,
  Download,
  ExternalLink,
  Layers3,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { marketsApi } from "@/lib/markets/client";
import type {
  CasperMarketContractType,
  CasperMarketRow,
  CasperMarketTotals,
  CasperMarketsResponse,
} from "@/lib/markets/types";

type VenueTab = "all" | "cex" | "dex";

const CARD = "rounded-2xl border border-black/10 bg-white shadow-sm";
const BOARD =
  "rounded-[2rem] border border-black/10 bg-white text-black shadow-sm";
const VENUE_LOGO_DOMAINS: Record<string, string> = {
  bybit: "bybit.com",
  htx: "htx.com",
  okx: "okx.com",
  mexc: "mexc.com",
  gate: "gate.io",
  bingx: "bingx.com",
  bithumb: "bithumb.com",
  bitmart: "bitmart.com",
  kucoin: "kucoin.com",
  cryptocom: "crypto.com",
  coinex: "coinex.com",
  bitstamp: "bitstamp.net",
  bitrue: "bitrue.com",
};

function fmtUsd(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.0001) return "< $0.0001";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtFractionPct(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const percent = value * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(digits)}%`;
}

function tone(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "text-black/35";
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-500";
  return "text-black/60";
}

function getVenueLogoUrl(row: CasperMarketRow): string | null {
  const normalizedExchange = row.exchange.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain =
    VENUE_LOGO_DOMAINS[normalizedExchange] ??
    (row.pairUrl ? new URL(row.pairUrl).hostname.replace(/^www\./, "") : null);

  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }

  return (current - previous) / previous;
}

function getRows(
  data: CasperMarketsResponse | null,
  venue: VenueTab,
  contractType: CasperMarketContractType
): CasperMarketRow[] {
  if (!data) return [];
  if (venue === "cex") return data.cex[contractType];
  if (venue === "dex") return data.dex[contractType];
  return [...data.cex[contractType], ...data.dex[contractType]];
}

function getTotals(
  data: CasperMarketsResponse | null,
  venue: VenueTab,
  contractType: CasperMarketContractType
): CasperMarketTotals {
  if (!data) {
    return {
      pairCount: 0,
      totalVolume24h: 0,
      totalOiUsd: null,
    };
  }

  if (venue === "cex") return data.totals.cex[contractType];
  if (venue === "dex") return data.totals.dex[contractType];

  const cex = data.totals.cex[contractType];
  const dex = data.totals.dex[contractType];
  const oiValues = [cex.totalOiUsd, dex.totalOiUsd].filter(
    (value): value is number => value !== null
  );

  return {
    pairCount: cex.pairCount + dex.pairCount,
    totalVolume24h: (cex.totalVolume24h ?? 0) + (dex.totalVolume24h ?? 0),
    totalOiUsd: oiValues.length ? oiValues.reduce((sum, value) => sum + value, 0) : null,
  };
}

export default function MarketsPage() {
  const [data, setData] = useState<CasperMarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [venue, setVenue] = useState<VenueTab>("dex");
  const [contractType, setContractType] = useState<CasperMarketContractType>("spot");

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    try {
      const result = await marketsApi.list();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load markets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const venueTabs = useMemo(() => {
    if (!data) return [];

    const allCount =
      data.totals.cex.spot.pairCount +
      data.totals.cex.linear_perp.pairCount +
      data.totals.cex.inverse_perp.pairCount +
      data.totals.dex.spot.pairCount +
      data.totals.dex.linear_perp.pairCount +
      data.totals.dex.inverse_perp.pairCount;

    const cexCount =
      data.totals.cex.spot.pairCount +
      data.totals.cex.linear_perp.pairCount +
      data.totals.cex.inverse_perp.pairCount;
    const dexCount =
      data.totals.dex.spot.pairCount +
      data.totals.dex.linear_perp.pairCount +
      data.totals.dex.inverse_perp.pairCount;

    return [
      { id: "cex" as const, label: "CEX", count: cexCount },
      { id: "dex" as const, label: "DEX", count: dexCount },
      { id: "all" as const, label: "All", count: allCount },
    ].filter((tab) => tab.count > 0);
  }, [data]);

  useEffect(() => {
    if (!venueTabs.length) return;
    if (!venueTabs.some((tab) => tab.id === venue)) {
      setVenue(venueTabs[0].id);
    }
  }, [venue, venueTabs]);

  const contractTabs = useMemo(() => {
    if (!data) return [];

    const options: { id: CasperMarketContractType; label: string }[] = [
      { id: "spot", label: "Spot" },
      { id: "linear_perp", label: "Linear Perp" },
      { id: "inverse_perp", label: "Inverse Perp" },
    ];

    return options.filter((option) => getRows(data, venue, option.id).length > 0);
  }, [data, venue]);

  useEffect(() => {
    if (!contractTabs.length) return;
    if (!contractTabs.some((tab) => tab.id === contractType)) {
      setContractType(contractTabs[0].id);
    }
  }, [contractTabs, contractType]);

  const networkLabel =
    data?.network === "casper-mainnet" ? "Casper mainnet" : "Casper testnet";
  const currentTotals = getTotals(data, venue, contractType);
  const normalizedSearch = search.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    return getRows(data, venue, contractType)
      .filter((row) => {
        if (!normalizedSearch) return true;
        return (
          row.exchange.toLowerCase().includes(normalizedSearch) ||
          row.symbol.toLowerCase().includes(normalizedSearch) ||
          row.venueKind.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [contractType, data, normalizedSearch, venue]);

  const visibleVolume = visibleRows.reduce((sum, row) => sum + (row.volume24h ?? 0), 0);
  const visibleOiValues = visibleRows
    .map((row) => row.oiUsd)
    .filter((value): value is number => value !== null);
  const visibleOi = visibleOiValues.length
    ? visibleOiValues.reduce((sum, value) => sum + value, 0)
    : null;
  const topRow = visibleRows[0] ?? null;
  const allDexRows = useMemo(
    () => data ? [...data.dex.spot, ...data.dex.linear_perp, ...data.dex.inverse_perp] : [],
    [data]
  );
  const dexVolume = allDexRows.reduce((sum, row) => sum + (row.volume24h ?? 0), 0);

  const exportCsv = () => {
    if (!visibleRows.length) return;

    const rows = [
      [
        "Rank",
        "Venue Type",
        "Venue",
        "Pair",
        "Price",
        "24h Change",
        "24h Volume",
        "Volume Delta",
        "Open Interest",
        "OI Delta",
        "Funding 8h",
        "Max Leverage",
        "Maker Fee",
        "Taker Fee",
        "Link",
      ],
      ...visibleRows.map((row, index) => [
        String(index + 1),
        row.venueKind.toUpperCase(),
        row.exchange,
        row.symbol,
        row.price?.toString() ?? "",
        row.priceChange24h?.toString() ?? "",
        row.volume24h?.toString() ?? "",
        pctChange(row.volume24h, row.volumePrev24h)?.toString() ?? "",
        row.oiUsd?.toString() ?? "",
        pctChange(row.oiUsd, row.oiPrevUsd)?.toString() ?? "",
        row.fundingRate8h?.toString() ?? "",
        row.maxLeverage?.toString() ?? "",
        row.makerFee?.toString() ?? "",
        row.takerFee?.toString() ?? "",
        row.pairUrl ?? "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "casper-markets.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const venueBadgeTone = (row: CasperMarketRow) =>
    row.venueKind === "cex"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  const showPerpsColumns = contractType !== "spot";

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/60">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {networkLabel} market monitor
            </div>
            <h1
              className="text-3xl font-medium tracking-tight text-black md:text-4xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Markets
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-black/60">
              Track Casper market activity with DefiLlama CEX pairs for{" "}
              <span className="font-medium text-black/75">{data?.tokenSymbol ?? "CSPR"}</span>{" "}
              and native CSPR.cloud DEX rows in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/agent"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black"
            >
              Open agent
            </Link>
            <Button
              variant="outline"
              className="rounded-full border-black/10 bg-white text-black hover:bg-black/5"
              onClick={() => load("refresh")}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Layers3 className="size-4" />}
            label="Pairs tracked"
            value={loading ? "…" : String(currentTotals.pairCount)}
            sub={`${venue.toUpperCase()} · ${contractType.replaceAll("_", " ")}`}
          />
          <SummaryCard
            icon={<Wallet className="size-4" />}
            label="Visible 24h volume"
            value={loading ? "…" : fmtUsd(visibleVolume)}
            sub={`${visibleRows.length} rows in current view`}
            accent
          />
          <SummaryCard
            icon={<CandlestickChart className="size-4" />}
            label="Native DEX rows"
            value={loading ? "…" : String(allDexRows.length)}
            sub={`${fmtUsd(dexVolume)} DEX volume`}
          />
          <SummaryCard
            icon={<BarChart3 className="size-4" />}
            label="Top venue"
            value={loading ? "…" : topRow?.exchange ?? "—"}
            sub={topRow ? `${topRow.symbol} · ${fmtUsd(topRow.volume24h)}` : "No market in view"}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}
      </div>

      <section className={cn(CARD, "mx-auto w-full max-w-[92rem] p-5")}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-black">Native DEX markets</h2>
            <p className="mt-1 text-sm text-black/55">
              CSPR.cloud DEX rows are shown separately here and are also available through the DEX tab below.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-3 w-fit rounded-full border-black/10 bg-white text-black/70 hover:bg-black/5 sm:mt-0"
            onClick={() => setVenue("dex")}
          >
            Show DEX table
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-black/[0.04]" />
            ))
          ) : allDexRows.length ? (
            allDexRows.slice(0, 4).map((row) => (
              <div key={row.id} className="rounded-2xl border border-violet-500/10 bg-violet-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">{row.exchange}</p>
                    <p className="mt-1 truncate text-sm text-black/45">{row.symbol}</p>
                  </div>
                  <Badge className="border border-violet-200 bg-white text-violet-700">DEX</Badge>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-black/45">24h volume</p>
                    <p className="text-xl font-medium text-black">{fmtUsd(row.volume24h)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-black/45">Price</p>
                    <p className="text-sm font-medium text-violet-700">
                      {fmtUsd(row.price, row.price !== null && row.price < 1 ? 5 : 2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 text-sm text-black/50 md:col-span-2 xl:col-span-4">
              No DEX markets returned yet. Refresh after CSPR.cloud market data is available.
            </div>
          )}
        </div>
      </section>

      <section className={cn(BOARD, "mx-auto w-full max-w-[92rem] overflow-hidden")}>
        <div className="border-b border-black/10 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-black">Market Pairs</h2>
              <p className="mt-1 text-sm text-black/60">
                CEX data comes from DefiLlama&apos;s live token markets feed. DEX rows are
                derived from native CSPR.cloud LP snapshots, so spot coverage can differ
                between the two sources.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {venueTabs.map((tab) => (
                <SegmentTab
                  key={tab.id}
                  active={venue === tab.id}
                  onClick={() => setVenue(tab.id)}
                  label={tab.label}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatPanel label="Pairs" value={String(currentTotals.pairCount)} />
              <StatPanel
                label="24h Volume"
                value={fmtUsd(currentTotals.totalVolume24h)}
                sub={
                  visibleRows.length !== currentTotals.pairCount
                    ? `${visibleRows.length} filtered rows`
                    : undefined
                }
              />
              <StatPanel label="Open Interest" value={fmtUsd(currentTotals.totalOiUsd)} />
              <StatPanel label="Source" value={data?.source ?? "Loading"} />
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {contractTabs.map((tab) => (
                  <MetricPill
                    key={tab.id}
                    active={contractType === tab.id}
                    onClick={() => setContractType(tab.id)}
                    label={tab.label}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-black/45">
                <span>
                  {data ? `Updated ${new Date(data.fetchedAt).toLocaleTimeString()}` : "Loading"}
                </span>
                <Button
                  variant="outline"
                  className="rounded-xl border-black/10 bg-white text-black/75 hover:bg-black/[0.04] hover:text-black"
                  onClick={exportCsv}
                  disabled={!visibleRows.length}
                >
                  <Download className="mr-2 size-4" />
                  CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative min-w-[16rem] flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exchanges or pairs"
                className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.02] pl-10 pr-4 text-sm text-black outline-none placeholder:text-black/35 focus:border-black/20"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-[0.16em] text-black/45">
                <th className="px-5 py-4 md:px-6">#</th>
                <th className="px-5 py-4 md:px-6">Venue</th>
                <th className="px-5 py-4 md:px-6">Pair</th>
                <th className="px-5 py-4 md:px-6">Price</th>
                <th className="px-5 py-4 md:px-6">24h</th>
                <th className="px-5 py-4 md:px-6">24h Volume</th>
                <th className="px-5 py-4 md:px-6">Vol Δ</th>
                {showPerpsColumns && <th className="px-5 py-4 md:px-6">Open Interest</th>}
                {showPerpsColumns && <th className="px-5 py-4 md:px-6">OI Δ</th>}
                {showPerpsColumns && <th className="px-5 py-4 md:px-6">Funding 8h</th>}
                {showPerpsColumns && <th className="px-5 py-4 md:px-6">Max Lev</th>}
                <th className="px-5 py-4 md:px-6">Maker Fee</th>
                <th className="px-5 py-4 md:px-6">Taker Fee</th>
                <th className="px-5 py-4 md:px-6">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-black/6">
                    {Array.from({ length: showPerpsColumns ? 14 : 10 }).map((__, column) => (
                      <td key={column} className="px-5 py-4 md:px-6">
                        <div className="h-4 w-24 animate-pulse rounded bg-black/[0.06]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleRows.length ? (
                visibleRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-black/6 transition-colors hover:bg-black/[0.02]"
                  >
                    <td className="px-5 py-4 text-sm text-black/65 md:px-6">{index + 1}</td>
                    <td className="px-5 py-4 md:px-6">
                      <div className="flex min-w-[14rem] items-center gap-3">
                        <VenueAvatar row={row} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-medium text-black">
                              {row.exchange}
                            </p>
                            {venue === "all" && (
                              <Badge className={cn("border", venueBadgeTone(row))}>
                                {row.venueKind.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-sm text-black/40">
                            {row.contractType.replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-base text-black md:px-6">{row.symbol}</td>
                    <td className="px-5 py-4 text-base text-black/85 md:px-6">
                      {fmtUsd(row.price, row.price !== null && row.price < 1 ? 5 : 2)}
                    </td>
                    <td className={cn("px-5 py-4 text-base md:px-6", tone(row.priceChange24h))}>
                      {fmtFractionPct(row.priceChange24h)}
                    </td>
                    <td className="px-5 py-4 text-base text-black md:px-6">
                      {fmtUsd(row.volume24h)}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-4 text-base md:px-6",
                        tone(pctChange(row.volume24h, row.volumePrev24h))
                      )}
                    >
                      {fmtFractionPct(pctChange(row.volume24h, row.volumePrev24h))}
                    </td>
                    {showPerpsColumns && (
                      <td className="px-5 py-4 text-base text-black/85 md:px-6">
                        {fmtUsd(row.oiUsd)}
                      </td>
                    )}
                    {showPerpsColumns && (
                      <td
                        className={cn(
                          "px-5 py-4 text-base md:px-6",
                          tone(pctChange(row.oiUsd, row.oiPrevUsd))
                        )}
                      >
                        {fmtFractionPct(pctChange(row.oiUsd, row.oiPrevUsd))}
                      </td>
                    )}
                    {showPerpsColumns && (
                      <td className={cn("px-5 py-4 text-base md:px-6", tone(row.fundingRate8h))}>
                        {fmtFractionPct(row.fundingRate8h, 3)}
                      </td>
                    )}
                    {showPerpsColumns && (
                      <td className="px-5 py-4 text-base text-black/85 md:px-6">
                        {row.maxLeverage === null ? "—" : `${row.maxLeverage}x`}
                      </td>
                    )}
                    <td className="px-5 py-4 text-base text-black/85 md:px-6">
                      {fmtFractionPct(row.makerFee, 3)}
                    </td>
                    <td className="px-5 py-4 text-base text-black/85 md:px-6">
                      {fmtFractionPct(row.takerFee, 3)}
                    </td>
                    <td className="px-5 py-4 md:px-6">
                      {row.pairUrl ? (
                        <a
                          href={row.pairUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-sky-700 transition-colors hover:text-sky-800"
                        >
                          Open <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="text-sm text-black/30">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={showPerpsColumns ? 14 : 10}
                    className="px-5 py-16 text-center text-sm text-black/45 md:px-6"
                  >
                    No markets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(CARD, accent && "border-transparent bg-[#2B2644] text-white")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm", accent ? "text-white/60" : "text-black/50")}>{label}</p>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              accent ? "bg-white/10 text-white" : "bg-black/[0.04] text-black/60"
            )}
          >
            {icon}
          </span>
        </div>
        <p
          className={cn(
            "mt-3 text-2xl font-medium tracking-tight",
            accent ? "text-white" : "text-black"
          )}
        >
          {value}
        </p>
        <p className={cn("mt-1 text-sm", accent ? "text-white/60" : "text-black/45")}>{sub}</p>
      </CardContent>
    </Card>
  );
}

function SegmentTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors",
        active
          ? "border-black/15 bg-black text-white"
          : "border-black/10 bg-white text-black/60 hover:bg-black/[0.04] hover:text-black"
      )}
    >
      {label}
    </button>
  );
}

function MetricPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-2 text-sm transition-colors",
        active
          ? "border-black/15 bg-black text-white"
          : "border-black/10 bg-white text-black/60 hover:bg-black/[0.04] hover:text-black"
      )}
    >
      {label}
    </button>
  );
}

function StatPanel({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3">
      <p className="text-sm text-black/55">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight text-black">{value}</p>
      {sub ? <p className="mt-1 text-sm text-black/35">{sub}</p> : null}
    </div>
  );
}

function VenueAvatar({ row }: { row: CasperMarketRow }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = getVenueLogoUrl(row);

  if (!logoUrl || imageFailed) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.03] ring-1 ring-black/8">
        <span className="text-sm font-semibold text-black/70">
          {row.exchange.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/8">
      <img
        src={logoUrl}
        alt={`${row.exchange} logo`}
        className="size-7 object-contain"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
