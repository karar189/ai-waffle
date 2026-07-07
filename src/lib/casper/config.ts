/**
 * Casper / CSPR.cloud endpoint resolution.
 *
 * All values are server-side. The CSPR.cloud access token is read from
 * CSPR_CLOUD_API_KEY and must never reach the browser.
 */

export type CasperNetwork = "testnet" | "mainnet";

export const CASPER_NETWORK: CasperNetwork =
  process.env.CASPER_NETWORK === "mainnet" ? "mainnet" : "testnet";

/** CAIP-2 network identifier used by the x402 facilitator. */
export const CASPER_CAIP2 =
  CASPER_NETWORK === "mainnet" ? "casper:casper" : "casper:casper-test";

const DEFAULTS = {
  testnet: {
    rest: "https://api.testnet.cspr.cloud",
    stream: "wss://streaming.testnet.cspr.cloud",
    nodeRpc: "https://node.testnet.cspr.cloud/rpc",
    mcp: "https://mcp.testnet.cspr.cloud/mcp",
    explorer: "https://testnet.cspr.live",
    // Wrapped CSPR (WCSPR) contract package — the CSPR-denominated quote token
    // used to price LP reserves. Override via WCSPR_CONTRACT_PACKAGE_HASH.
    wcspr: "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e",
  },
  mainnet: {
    rest: "https://api.cspr.cloud",
    stream: "wss://streaming.cspr.cloud",
    nodeRpc: "https://node.cspr.cloud/rpc",
    mcp: "https://mcp.cspr.cloud/mcp",
    explorer: "https://cspr.live",
    // Set the mainnet WCSPR package hash via WCSPR_CONTRACT_PACKAGE_HASH.
    wcspr: "",
  },
} as const;

const d = DEFAULTS[CASPER_NETWORK];

export const CSPR_CLOUD = {
  network: CASPER_NETWORK,
  restUrl: process.env.CSPR_CLOUD_REST_URL ?? d.rest,
  streamUrl: process.env.CSPR_CLOUD_STREAM_URL ?? d.stream,
  nodeRpcUrl: process.env.CSPR_CLOUD_NODE_RPC_URL ?? d.nodeRpc,
  mcpUrl: process.env.CSPR_CLOUD_MCP_URL ?? d.mcp,
  x402FacilitatorUrl:
    process.env.CSPR_X402_FACILITATOR_URL ?? "https://x402-facilitator.cspr.cloud",
  explorerUrl: d.explorer,
  /** WCSPR contract package hash used to price LP reserves in CSPR. */
  wcsprPackageHash: process.env.WCSPR_CONTRACT_PACKAGE_HASH ?? d.wcspr,
} as const;

/**
 * CSPR.trade (Uniswap-V2-style DEX) router config used for LP execution.
 *
 * Sending native CSPR into the router requires a `proxy_caller` session WASM
 * that funds a purse and forwards the call. The router package hash is the same
 * on testnet as used across the CSPR.trade reference implementations.
 */
export const CSPR_TRADE = {
  /** Router contract package hash (StoredVersionedContractByHash target). */
  routerPackageHash:
    process.env.CSPR_TRADE_ROUTER_PACKAGE_HASH ??
    "04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867",
  /** WCSPR package hash — always the first hop of a CSPR swap path. */
  wcsprPackageHash: process.env.WCSPR_CONTRACT_PACKAGE_HASH ?? d.wcspr,
} as const;

/** Read the CSPR.cloud token, throwing a clear error when it is missing. */
export function getCsprCloudApiKey(): string {
  const key = process.env.CSPR_CLOUD_API_KEY;
  if (!key) {
    throw new Error(
      "CSPR_CLOUD_API_KEY is not set. Request an access token at https://cspr.cloud/ and add it to your .env (server-side only)."
    );
  }
  return key;
}

/** Build an explorer deploy URL for execution proof links. */
export function explorerDeployUrl(deployHash: string): string {
  return `${CSPR_CLOUD.explorerUrl}/deploy/${deployHash}`;
}

/** Build an explorer account URL. */
export function explorerAccountUrl(publicKey: string): string {
  return `${CSPR_CLOUD.explorerUrl}/account/${publicKey}`;
}
