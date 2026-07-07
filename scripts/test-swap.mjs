/**
 * Phase 0 spike: prove we can execute a CSPR.trade router swap on testnet.
 * Builds swap_exact_cspr_for_tokens via proxy_caller.wasm + SessionBuilder,
 * signs with the session key, submits, and prints the tx hash.
 *
 * Run: node --env-file=.env scripts/test-swap.mjs <csprAmount> <targetTokenHash>
 */

import fs from "fs";
import path from "path";
import pkg from "casper-js-sdk";
const {
  SessionBuilder,
  Args,
  PublicKey,
  PrivateKey,
  KeyAlgorithm,
  Key,
  Hash,
  CLTypeUInt8,
  CLTypeKey,
  CLValue,
  HttpHandler,
  RpcClient,
} = pkg;

const ROUTER_PACKAGE_HASH =
  "04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867";
const WCSPR = "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e";
const RPC = "https://node.testnet.cspr.cloud/rpc";
const T = process.env.CSPR_CLOUD_API_KEY;

const csprAmount = process.argv[2] ?? "5";
// Default target: WUSDC (proven-liquid testnet pool in the reference impl).
const targetToken =
  process.argv[3] ?? "073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396";

const amountMotes = (BigInt(Math.round(Number(csprAmount) * 1e9))).toString();

const key = PrivateKey.fromHex(
  process.env.CASPER_SESSION_PRIVATE_KEY_HEX,
  KeyAlgorithm.ED25519
);
const sender = key.publicKey;
const senderHex = sender.toHex();

const wcsprKey = CLValue.newCLKey(Key.newKey(`hash-${WCSPR}`));
const targetKey = CLValue.newCLKey(Key.newKey(`hash-${targetToken}`));
const accountHash = sender.accountHash().toHex();
const recipient = CLValue.newCLKey(Key.newKey(`account-hash-${accountHash}`));
const deadline = Date.now() + 10 * 60 * 1000;

const odraArgs = Args.fromMap({
  amount_out_min: CLValue.newCLUInt256("1"), // spike: accept any output
  path: CLValue.newCLList(CLTypeKey, [wcsprKey, targetKey]),
  to: recipient,
  deadline: CLValue.newCLUint64(deadline),
});

const serializedArgs = CLValue.newCLList(
  CLTypeUInt8,
  Array.from(odraArgs.toBytes()).map((v) => CLValue.newCLUint8(v))
);

const args = Args.fromMap({
  amount: CLValue.newCLUInt512(amountMotes),
  attached_value: CLValue.newCLUInt512(amountMotes),
  entry_point: CLValue.newCLString("swap_exact_cspr_for_tokens"),
  package_hash: CLValue.newCLByteArray(Hash.fromHex(ROUTER_PACKAGE_HASH).toBytes()),
  args: serializedArgs,
});

const wasm = new Uint8Array(
  fs.readFileSync(
    path.join(process.cwd(), "src/lib/casper/wasm/proxy_caller.wasm")
  )
);

const tx = new SessionBuilder()
  .from(sender)
  .runtimeArgs(args)
  .wasm(wasm)
  .payment(30_000_000_000) // 30 CSPR gas (observed swap cost)
  .chainName("casper-test")
  .build();

await tx.sign(key);

const client = new RpcClient(
  (() => {
    const h = new HttpHandler(RPC);
    h.setCustomHeaders({ Authorization: T });
    return h;
  })()
);

console.log("sender:", senderHex);
console.log("swapping", csprAmount, "CSPR -> token", targetToken.slice(0, 10), "...");
const res = await client.putTransaction(tx);
const hash =
  res?.transactionHash?.toHex?.() ?? res?.transactionHash ?? res?.deployHash ?? "";
console.log("SUBMITTED tx:", String(hash));
console.log("explorer: https://testnet.cspr.live/transaction/" + String(hash));
