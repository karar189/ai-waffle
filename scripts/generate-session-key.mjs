/**
 * Generate a dedicated Ed25519 session keypair for the agent's auto-sign path.
 *
 * This is a SEPARATE, disposable testnet key — never your main wallet key.
 * Fund the printed public key from the Casper testnet faucet, then paste the
 * private key hex into .env as CASPER_SESSION_PRIVATE_KEY_HEX.
 *
 * Run: node scripts/generate-session-key.mjs
 */

import { promises as fs } from "fs";
import path from "path";
import pkg from "casper-js-sdk";
const { PrivateKey, KeyAlgorithm } = pkg;

const key = await PrivateKey.generate(KeyAlgorithm.ED25519);

const publicKeyHex = key.publicKey.toHex();
const accountHash = key.publicKey.accountHash().toHex?.() ?? "(n/a)";

// Private key material.
let privateKeyHex = "";
try {
  const bytes = key.toBytes?.() ?? key.key?.raw ?? null;
  if (bytes) privateKeyHex = Buffer.from(bytes).toString("hex");
} catch {}
if (!privateKeyHex && typeof key.toHex === "function") {
  privateKeyHex = key.toHex();
}

const pem = typeof key.toPem === "function" ? key.toPem() : null;

const outDir = path.join(process.cwd(), ".agent-data");
await fs.mkdir(outDir, { recursive: true });
const pemPath = path.join(outDir, "session-key.pem");
if (pem) await fs.writeFile(pemPath, pem, "utf8");

console.log("\n=== Casper session key (TESTNET, dedicated) ===\n");
console.log("PUBLIC KEY (fund this at the faucet):");
console.log("  " + publicKeyHex + "\n");
console.log("ACCOUNT HASH:");
console.log("  " + accountHash + "\n");
console.log("PRIVATE KEY HEX (paste into .env):");
console.log("  CASPER_SESSION_PRIVATE_KEY_HEX=" + privateKeyHex);
console.log("  CASPER_SESSION_KEY_ALGO=ed25519\n");
if (pem) {
  console.log("PEM also saved to (gitignored): " + pemPath);
  console.log("  (alternatively use CASPER_SESSION_PRIVATE_KEY_PEM=" + pemPath + ")\n");
}
console.log("Faucet: https://testnet.cspr.live/tools/faucet\n");
