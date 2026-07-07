/**
 * Phase 0b: prove add_liquidity_cspr end-to-end.
 *   step 1 (approve): grant the router an allowance on our WUSDC
 *   step 2 (deposit): add_liquidity_cspr with WUSDC + CSPR -> receive LP tokens
 *
 * Run: node --env-file=.env scripts/test-add-liquidity.mjs approve
 *      node --env-file=.env scripts/test-add-liquidity.mjs deposit <tokenAmount> <csprDesired>
 */
import fs from "fs";
import path from "path";
import pkg from "casper-js-sdk";
const {
  SessionBuilder, ContractCallBuilder, Args, PublicKey, PrivateKey, KeyAlgorithm,
  Key, Hash, CLTypeUInt8, CLTypeKey, CLValue, HttpHandler, RpcClient,
} = pkg;

const ROUTER = "04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867";
const WUSDC = "073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396";
const RPC = "https://node.testnet.cspr.cloud/rpc";
const T = process.env.CSPR_CLOUD_API_KEY;
const motes = (c) => BigInt(Math.round(Number(c) * 1e9)).toString();

const key = PrivateKey.fromHex(process.env.CASPER_SESSION_PRIVATE_KEY_HEX, KeyAlgorithm.ED25519);
const sender = key.publicKey;
const accountHash = sender.accountHash().toHex();
const toKey = CLValue.newCLKey(Key.newKey(`account-hash-${accountHash}`));
const hkey = (h) => CLValue.newCLKey(Key.newKey(`hash-${h}`));
const wasm = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "src/lib/casper/wasm/proxy_caller.wasm")));

const client = new RpcClient((() => { const h = new HttpHandler(RPC); h.setCustomHeaders({ Authorization: T }); return h; })());
async function submit(tx) {
  await tx.sign(key);
  const res = await client.putTransaction(tx);
  const hash = res?.transactionHash?.toHex?.() ?? res?.transactionHash ?? "";
  return String(hash);
}

const mode = process.argv[2];

if (mode === "approve") {
  const amount = process.argv[3] ?? "100000"; // base units allowance
  const args = Args.fromMap({ spender: hkey(ROUTER), amount: CLValue.newCLUInt256(amount) });
  const tx = new ContractCallBuilder()
    .from(sender).byPackageHash(WUSDC).entryPoint("approve").runtimeArgs(args)
    .payment(5_000_000_000).chainName("casper-test").build();
  const h = await submit(tx);
  console.log("APPROVE tx:", h);
  console.log("explorer: https://testnet.cspr.live/transaction/" + h);
} else if (mode === "deposit") {
  const tokenDesired = process.argv[3] ?? "22617";
  const csprDesired = process.argv[4] ?? "8";
  const deadline = Date.now() + 10 * 60 * 1000;
  const inner = Args.fromMap({
    token: hkey(WUSDC),
    amount_token_desired: CLValue.newCLUInt256(tokenDesired),
    amount_token_min: CLValue.newCLUInt256("1"),
    amount_cspr_min: CLValue.newCLUInt256("1"),
    to: toKey,
    deadline: CLValue.newCLUint64(deadline),
  });
  const serialized = CLValue.newCLList(CLTypeUInt8, Array.from(inner.toBytes()).map((v) => CLValue.newCLUint8(v)));
  const proxyArgs = Args.fromMap({
    amount: CLValue.newCLUInt512(motes(csprDesired)),
    attached_value: CLValue.newCLUInt512(motes(csprDesired)),
    entry_point: CLValue.newCLString("add_liquidity_cspr"),
    package_hash: CLValue.newCLByteArray(Hash.fromHex(ROUTER).toBytes()),
    args: serialized,
  });
  const tx = new SessionBuilder()
    .from(sender).runtimeArgs(proxyArgs).wasm(wasm)
    .payment(30_000_000_000).chainName("casper-test").build();
  const h = await submit(tx);
  console.log("ADD_LIQUIDITY tx:", h);
  console.log("explorer: https://testnet.cspr.live/transaction/" + h);
} else {
  console.log("usage: approve | deposit <tokenAmount> <csprDesired>");
}
