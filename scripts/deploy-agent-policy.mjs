/**
 * Build + deploy the Waffle Trade Agent Policy contract to Casper testnet.
 *
 * Run:
 *   rustup target add wasm32v1-none --toolchain nightly
 *   cargo +nightly build --release --target wasm32v1-none --manifest-path contracts/agent-policy/Cargo.toml
 *   node --env-file=.env scripts/deploy-agent-policy.mjs
 *
 * Prints the transaction hash and the package hash to copy into:
 *   WAFFLE_AGENT_POLICY_PACKAGE_HASH=...
 */
import fs from "fs";
import path from "path";
import pkg from "casper-js-sdk";

const {
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  Args,
  PrivateKey,
  KeyAlgorithm,
  HttpHandler,
  RpcClient,
} = pkg;

const NETWORK = process.env.CASPER_NETWORK === "mainnet" ? "casper" : "casper-test";
const RPC =
  process.env.CSPR_CLOUD_NODE_RPC_URL ??
  (NETWORK === "casper"
    ? "https://node.cspr.cloud/rpc"
    : "https://node.testnet.cspr.cloud/rpc");
const EXPLORER =
  NETWORK === "casper" ? "https://cspr.live" : "https://testnet.cspr.live";
const API_KEY = process.env.CSPR_CLOUD_API_KEY;
const PRIVATE_KEY_HEX = process.env.CASPER_SESSION_PRIVATE_KEY_HEX;
const NAMED_KEY = "waffle_trade_agent_policy_package_hash";
const WASM_CANDIDATES = [
  "contracts/agent-policy/target/wasm32v1-none/release/waffle_agent_policy.wasm",
].map((p) => path.join(process.cwd(), p));
const WASM_PATH = WASM_CANDIDATES.find((p) => fs.existsSync(p));

if (!API_KEY) throw new Error("CSPR_CLOUD_API_KEY is required.");
if (!PRIVATE_KEY_HEX) throw new Error("CASPER_SESSION_PRIVATE_KEY_HEX is required.");
if (!WASM_PATH) {
  throw new Error(
    `Contract WASM not found. Build it first with: cargo +nightly build --release --target wasm32v1-none --manifest-path contracts/agent-policy/Cargo.toml`
  );
}

const key = PrivateKey.fromHex(PRIVATE_KEY_HEX, KeyAlgorithm.ED25519);
const sender = key.publicKey;
const wasm = new Uint8Array(fs.readFileSync(WASM_PATH));
const handler = new HttpHandler(RPC);
handler.setCustomHeaders({ Authorization: API_KEY });
const client = new RpcClient(handler);

function txHash(res) {
  const raw = res?.transactionHash ?? res?.deployHash ?? res?.hash;
  return String(raw?.toHex?.() ?? raw ?? "");
}

function extractHash(value) {
  if (!value) return "";
  const raw =
    value.key ??
    value.value ??
    value.namedKey ??
    value.name ??
    String(value);
  return String(raw).replace(/^hash-/, "");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAccountNamedKey(publicKeyHex, name, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const info = await client.getAccountInfo(publicKeyHex);
      const account = info?.account ?? info?.Account ?? info;
      const namedKeys = account?.namedKeys ?? account?.named_keys ?? [];
      const row = namedKeys.find((k) => k.name === name || k.Name === name);
      const hash = extractHash(row);
      if (hash && /^[0-9a-fA-F]{64}$/.test(hash)) return hash.toLowerCase();
    } catch {
      // Account state may not reflect the install yet.
    }
    await sleep(10_000);
  }
  return "";
}

const header = new DeployHeader(
  NETWORK,
  [],
  1,
  undefined,
  undefined,
  sender
);
const payment = ExecutableDeployItem.standardPayment(
  "80000000000"
);
const session = ExecutableDeployItem.newModuleBytes(wasm, Args.fromMap({}));
const deploy = Deploy.makeDeploy(header, payment, session);
deploy.sign(key);
const submitted = await client.putDeploy(deploy);
const hash = txHash(submitted) || txHash(deploy);

console.log("sender:", sender.toHex());
console.log("install tx:", hash);
console.log("explorer:", `${EXPLORER}/deploy/${hash}`);
console.log("waiting for named key:", NAMED_KEY);

const packageHash = await waitForAccountNamedKey(sender.toHex(), NAMED_KEY);
if (!packageHash) {
  console.log("Could not read package hash yet. Re-run this later:");
  console.log(`node --env-file=.env scripts/read-agent-policy-package.mjs ${sender.toHex()}`);
  process.exit(0);
}

console.log("WAFFLE_AGENT_POLICY_PACKAGE_HASH=" + packageHash);
