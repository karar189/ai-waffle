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
    nodeRpc: "https://node.testnet.cspr.cloud",
    mcp: "https://mcp.testnet.cspr.cloud/mcp",
    explorer: "https://testnet.cspr.live",
  },
  mainnet: {
    rest: "https://api.cspr.cloud",
    stream: "wss://streaming.cspr.cloud",
    nodeRpc: "https://node.cspr.cloud",
    mcp: "https://mcp.cspr.cloud/mcp",
    explorer: "https://cspr.live",
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
