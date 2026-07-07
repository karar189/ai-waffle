import pkg from "casper-js-sdk";

const { PrivateKey, KeyAlgorithm, HttpHandler, RpcClient } = pkg;

const NETWORK = process.env.CASPER_NETWORK === "mainnet" ? "casper" : "casper-test";
const RPC =
  process.env.CSPR_CLOUD_NODE_RPC_URL ??
  (NETWORK === "casper"
    ? "https://node.cspr.cloud/rpc"
    : "https://node.testnet.cspr.cloud/rpc");
const API_KEY = process.env.CSPR_CLOUD_API_KEY;
const NAMED_KEY = "waffle_trade_agent_policy_package_hash";

if (!API_KEY) throw new Error("CSPR_CLOUD_API_KEY is required.");

const publicKey =
  process.argv[2] ??
  (process.env.CASPER_SESSION_PRIVATE_KEY_HEX
    ? PrivateKey.fromHex(
        process.env.CASPER_SESSION_PRIVATE_KEY_HEX,
        KeyAlgorithm.ED25519
      ).publicKey.toHex()
    : "");

if (!publicKey) {
  throw new Error("Pass a public key or configure CASPER_SESSION_PRIVATE_KEY_HEX.");
}

const handler = new HttpHandler(RPC);
handler.setCustomHeaders({ Authorization: API_KEY });
const client = new RpcClient(handler);
const info = await client.getAccountInfo(publicKey);
const account = info?.account ?? info?.Account ?? info;
const namedKeys = account?.namedKeys ?? account?.named_keys ?? [];
const row = namedKeys.find((k) => k.name === NAMED_KEY || k.Name === NAMED_KEY);

if (!row) {
  console.log(`Named key ${NAMED_KEY} not found for ${publicKey}.`);
  process.exit(1);
}

const raw = row.key ?? row.value ?? row.namedKey ?? String(row);
console.log(String(raw).replace(/^hash-/, ""));
