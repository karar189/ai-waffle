/**
 * CSPR.cloud discovery probe.
 *
 * Confirms the API key works and reveals the real data shapes we build on:
 * DEX list, recent swaps (token contract package hashes + dex ids), deploys,
 * and (optionally) an account's delegation rewards / token holdings.
 *
 * Run:
 *   node --env-file=.env scripts/casper-discovery.mjs [publicKey]
 *
 * The optional publicKey enables account-scoped probes (delegation rewards,
 * token ownership). Reads CSPR_CLOUD_API_KEY and CASPER_NETWORK from env.
 */

const NETWORK = process.env.CASPER_NETWORK === "mainnet" ? "mainnet" : "testnet";
const REST =
  process.env.CSPR_CLOUD_REST_URL ??
  (NETWORK === "mainnet" ? "https://api.cspr.cloud" : "https://api.testnet.cspr.cloud");
const TOKEN = process.env.CSPR_CLOUD_API_KEY;
const PUBLIC_KEY = process.argv[2];

if (!TOKEN) {
  console.error(
    "\n[x] CSPR_CLOUD_API_KEY is not set.\n    Add it to .env, then run: node --env-file=.env scripts/casper-discovery.mjs\n"
  );
  process.exit(1);
}

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

async function probe(label, path, { params } = {}) {
  const url = new URL(path, REST);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  process.stdout.write(`${DIM}--> ${label}: GET ${url.pathname}${url.search}${RESET}\n`);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: TOKEN },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    if (!res.ok) {
      console.log(`${RED}[FAIL ${res.status}]${RESET} ${label}`);
      console.log(`${DIM}${JSON.stringify(body)?.slice(0, 300)}${RESET}\n`);
      return null;
    }
    console.log(`${GREEN}[OK ${res.status}]${RESET} ${label}`);
    const data = body?.data ?? body;
    const sample = Array.isArray(data) ? data.slice(0, 3) : data;
    console.log(JSON.stringify(sample, null, 2)?.slice(0, 1200));
    if (body?.item_count !== undefined) {
      console.log(`${DIM}item_count=${body.item_count} page_count=${body.page_count}${RESET}`);
    }
    console.log("");
    return data;
  } catch (err) {
    console.log(`${RED}[ERROR]${RESET} ${label}: ${err.message}\n`);
    return null;
  }
}

async function main() {
  console.log(`\n=== CSPR.cloud discovery (${NETWORK}) ===`);
  console.log(`REST: ${REST}\n`);

  // 1. DEX list — the protocols we can route between.
  const dexes = await probe("DEXes", "/dexes");

  // 2. Recent swaps — reveal real token contract package hashes + dex ids.
  const swaps = await probe("Recent swaps", "/swaps", {
    params: { page_size: 5, order_by: "timestamp", order_direction: "DESC" },
  });

  // 3. Recent deploys — sanity check + execution-proof shape.
  await probe("Recent deploys", "/deploys", { params: { page_size: 3 } });

  // Account-scoped probes.
  if (PUBLIC_KEY) {
    await probe("Account", `/accounts/${PUBLIC_KEY}`, {
      params: { includes: "balance" },
    });
    await probe("Delegation rewards", `/accounts/${PUBLIC_KEY}/delegation-rewards`, {
      params: { page_size: 5 },
    });
    await probe("Token ownership", `/accounts/${PUBLIC_KEY}/fungible-token-ownership`, {
      params: { page_size: 10 },
    });
  } else {
    console.log(
      `${DIM}(Pass a public key as an argument to probe account rewards + holdings.)${RESET}\n`
    );
  }

  // Summary hints for the next build steps.
  console.log("=== Summary ===");
  if (Array.isArray(dexes)) {
    console.log(
      "DEXes:",
      dexes
        .map((d) => `${d.ID ?? d.id}:${d.Name ?? d.name ?? d.Code ?? d.code}`)
        .join(", ") || "(none)"
    );
  }
  if (Array.isArray(swaps) && swaps.length) {
    const s = swaps[0];
    console.log("Sample swap keys:", Object.keys(s).join(", "));
    console.log(
      "-> Copy token_contract_package_hash / target hash + dex_id from swaps into your protocol registry."
    );
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
