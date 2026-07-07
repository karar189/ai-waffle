/**
 * Session key management for the agent's auto-sign path (server-side only).
 *
 * The private key is read from the environment and NEVER exposed to the client.
 * When no session key is configured, auto-sign is disabled and every move must
 * go through the human-approval (Casper Wallet) path.
 *
 * Supported env:
 *   CASPER_SESSION_PRIVATE_KEY_HEX  - raw private key hex
 *   CASPER_SESSION_KEY_ALGO         - "ed25519" (default) | "secp256k1"
 *   CASPER_SESSION_PRIVATE_KEY_PEM  - absolute path to a PEM key file
 */

import { promises as fs } from "fs";
import { PrivateKey, KeyAlgorithm } from "casper-js-sdk";

let cached: PrivateKey | null | undefined;

function algoFromEnv(): KeyAlgorithm {
  return process.env.CASPER_SESSION_KEY_ALGO === "secp256k1"
    ? KeyAlgorithm.SECP256K1
    : KeyAlgorithm.ED25519;
}

/** Returns the configured session PrivateKey, or null if auto-sign is disabled. */
export async function getSessionKey(): Promise<PrivateKey | null> {
  if (cached !== undefined) return cached;

  const hex = process.env.CASPER_SESSION_PRIVATE_KEY_HEX;
  const pemPath = process.env.CASPER_SESSION_PRIVATE_KEY_PEM;

  try {
    if (hex) {
      cached = PrivateKey.fromHex(hex, algoFromEnv());
    } else if (pemPath) {
      const pem = await fs.readFile(pemPath, "utf8");
      cached = PrivateKey.fromPem(pem, algoFromEnv());
    } else {
      cached = null;
    }
  } catch (e) {
    console.error("[casper/keys] failed to load session key:", e);
    cached = null;
  }
  return cached ?? null;
}

/** Public key hex of the session key, or null. */
export async function getSessionPublicKeyHex(): Promise<string | null> {
  const key = await getSessionKey();
  if (!key) return null;
  try {
    return key.publicKey.toHex();
  } catch {
    return null;
  }
}

export async function isAutoSignEnabled(): Promise<boolean> {
  return (await getSessionKey()) !== null;
}
