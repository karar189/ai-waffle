/**
 * CSPR.cloud REST client (server-side only).
 *
 * Docs: https://docs.cspr.cloud/  Skill: https://cspr.cloud/skill.md
 * Successful responses wrap payloads in `data`. Paginated responses also
 * include `item_count` and `page_count`. Auth is the raw token in the
 * `Authorization` header.
 */

import { CSPR_CLOUD, getCsprCloudApiKey } from "./config";

export interface CsprCloudResponse<T> {
  data: T;
}

export interface CsprCloudPaginated<T> {
  data: T[];
  item_count: number;
  page_count: number;
}

export interface CsprCloudErrorBody {
  error?: { code?: string; message?: string };
}

export class CsprCloudError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "CsprCloudError";
  }
}

// --- Entity types (only the fields we consume) ---

/** Raw /dexes row. The API returns PascalCase for this entity. */
interface DexRaw {
  ID?: number;
  Name?: string;
  Code?: string;
  id?: number;
  name?: string;
  code?: string;
}

/** Normalized DEX shape used across the app. */
export interface Dex {
  id: number;
  name: string;
}

export interface Swap {
  dex_id: number;
  pair_contract_package_hash: string;
  token0_contract_package_hash: string;
  token1_contract_package_hash: string;
  amount0_in: string | null;
  amount0_out: string | null;
  amount1_in: string | null;
  amount1_out: string | null;
  decimals0: number;
  decimals1: number;
  block_height: number;
  timestamp: string;
  transaction_hash: string;
}

export interface DexRate {
  token_contract_package_hash: string;
  target_token_contract_package_hash: string;
  /** Rate expressed in the target token. Returned as a numeric string. */
  amount: string;
  volume: string;
  dex_id: number;
  transaction_hash: string;
  timestamp: string;
}

export interface Validator {
  public_key: string;
  era_id: number;
  fee: number;
  is_active: boolean;
  rank?: number;
  self_stake: string;
  delegators_stake: string;
  total_stake: string;
  delegators_number: number;
  network_share?: string;
  minimum_delegation_amount?: string;
  maximum_delegation_amount?: string;
}

export interface AuctionMetrics {
  current_era_id: number;
  active_validator_number: number;
  total_bids_number: number;
  active_bids_number: number;
  total_active_era_stake: string;
}

export interface DelegatorReward {
  amount: string;
  delegator_identifier?: string;
  delegator_identifier_type_id?: number;
  era_id: number;
  public_key: string;
  timestamp: string;
  validator_public_key: string;
}

export interface Account {
  public_key?: string;
  account_hash: string;
  main_purse_uref?: string;
  balance?: string;
  main_purse_balance?: string;
}

export interface FungibleTokenOwnership {
  owner_hash: string;
  contract_package_hash: string;
  /** 0 = account, 1 = contract. */
  owner_type: number;
  balance: string;
}

/** Contract package metadata (fungible tokens expose name/symbol/decimals). */
export interface ContractPackage {
  contract_package_hash: string;
  name?: string;
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    balances_uref?: string;
    total_supply_uref?: string;
  };
}

export interface Deploy {
  deploy_hash: string;
  block_hash?: string;
  caller_public_key?: string;
  execution_type_id?: number;
  timestamp?: string;
  error_message?: string | null;
  status?: string;
}

export interface Delegation {
  public_key: string;
  validator_public_key: string;
  stake: string;
  bonding_purse?: string;
  delegator_identifier?: string;
}

// --- Core fetch helper ---

interface FetchOptions {
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

async function csprFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const token = getCsprCloudApiKey();
  const url = new URL(path, CSPR_CLOUD.restUrl);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", Authorization: token },
    signal: opts.signal,
    // Never cache authenticated blockchain reads.
    cache: "no-store",
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as CsprCloudErrorBody;
      if (body?.error) {
        code = body.error.code;
        message = body.error.message ?? message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new CsprCloudError(`CSPR.cloud ${path} failed: ${message}`, res.status, code);
  }

  return (await res.json()) as T;
}

// --- Endpoints ---

/** List DEXes indexed by CSPR.cloud (e.g. CSPR.trade, Friendly Market, CSPR.fun). */
export async function getDexes(signal?: AbortSignal): Promise<Dex[]> {
  const res = await csprFetch<
    CsprCloudPaginated<DexRaw> | CsprCloudResponse<DexRaw[]>
  >("/dexes", { signal });
  return res.data.map((d) => ({
    id: (d.ID ?? d.id) as number,
    name: (d.Name ?? d.name ?? d.Code ?? d.code ?? `DEX ${d.ID ?? d.id}`) as string,
  }));
}

/** Recent swaps across DEXes (newest first). Rich pair-level data with volume. */
export async function getSwaps(
  opts: {
    dexId?: number;
    pairContractPackageHash?: string;
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  } = {}
): Promise<CsprCloudPaginated<Swap>> {
  return csprFetch<CsprCloudPaginated<Swap>>("/swaps", {
    params: {
      dex_id: opts.dexId,
      pair_contract_package_hash: opts.pairContractPackageHash,
      page: opts.page ?? 1,
      page_size: opts.pageSize ?? 250,
      order_by: "timestamp",
      order_direction: "DESC",
    },
    signal: opts.signal,
  });
}

/** Latest DEX rate for a source->target fungible token pair. */
export async function getLatestDexRate(
  sourceContractPackageHash: string,
  targetContractPackageHash: string,
  dexId?: number,
  signal?: AbortSignal
): Promise<DexRate> {
  const res = await csprFetch<CsprCloudResponse<DexRate>>(
    `/ft/${sourceContractPackageHash}/dex-rates/latest`,
    {
      params: {
        target_contract_package_hash: targetContractPackageHash,
        dex_id: dexId,
      },
      signal,
    }
  );
  return res.data;
}

/** Historical DEX rates for a pair (newest first). Used to derive yield/return. */
export async function getHistoricalDexRates(
  sourceContractPackageHash: string,
  targetContractPackageHash: string,
  opts: { dexId?: number; page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<DexRate>> {
  return csprFetch<CsprCloudPaginated<DexRate>>(
    `/ft/${sourceContractPackageHash}/dex-rates`,
    {
      params: {
        target_contract_package_hash: targetContractPackageHash,
        dex_id: opts.dexId,
        page: opts.page ?? 1,
        page_size: opts.pageSize ?? 250,
        order_by: "timestamp",
        order_direction: "DESC",
      },
      signal: opts.signal,
    }
  );
}

/** Network auction metrics (current era, active validators, total staked). */
export async function getAuctionMetrics(signal?: AbortSignal): Promise<AuctionMetrics> {
  const res = await csprFetch<CsprCloudResponse<AuctionMetrics>>("/auction-metrics", {
    signal,
  });
  return res.data;
}

/** Validators for a given era (requires era_id). Used to model staking venues. */
export async function getValidators(
  eraId: number,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<Validator>> {
  return csprFetch<CsprCloudPaginated<Validator>>("/validators", {
    params: {
      era_id: eraId,
      page: opts.page ?? 1,
      page_size: opts.pageSize ?? 50,
      order_by: "total_stake",
      order_direction: "DESC",
    },
    signal: opts.signal,
  });
}

/** Per-era delegator rewards for an account. Used to derive staking APY. */
export async function getDelegatorRewards(
  publicKey: string,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<DelegatorReward>> {
  return csprFetch<CsprCloudPaginated<DelegatorReward>>(
    `/accounts/${publicKey}/delegation-rewards`,
    {
      params: {
        page: opts.page ?? 1,
        page_size: opts.pageSize ?? 250,
      },
      signal: opts.signal,
    }
  );
}

/** Account overview (account hash, main purse, balance). */
export async function getAccount(
  publicKeyOrHash: string,
  signal?: AbortSignal
): Promise<Account> {
  const res = await csprFetch<CsprCloudResponse<Account>>(
    `/accounts/${publicKeyOrHash}`,
    { params: { includes: "balance" }, signal }
  );
  return res.data;
}

/** Fungible token holdings for an account. */
export async function getFungibleTokenOwnership(
  publicKeyOrHash: string,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<FungibleTokenOwnership>> {
  return csprFetch<CsprCloudPaginated<FungibleTokenOwnership>>(
    `/accounts/${publicKeyOrHash}/fungible-token-ownership`,
    {
      params: {
        page: opts.page ?? 1,
        page_size: opts.pageSize ?? 250,
      },
      signal: opts.signal,
    }
  );
}

/**
 * Token holders for a fungible token contract package, sorted by balance desc.
 * Used to read AMM pool reserves: a pair's reserve of a token is the balance
 * held by the pair contract package hash (which is the `owner_hash`).
 */
export async function getContractPackageTokenOwnership(
  tokenContractPackageHash: string,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<FungibleTokenOwnership>> {
  return csprFetch<CsprCloudPaginated<FungibleTokenOwnership>>(
    `/contract-packages/${tokenContractPackageHash}/ft-token-ownership`,
    {
      params: {
        page: opts.page ?? 1,
        page_size: opts.pageSize ?? 250,
        order_by: "balance",
        order_direction: "DESC",
      },
      signal: opts.signal,
    }
  );
}

/** Fetch a contract package (fungible tokens expose name/symbol/decimals). */
export async function getContractPackage(
  contractPackageHash: string,
  signal?: AbortSignal
): Promise<ContractPackage> {
  const res = await csprFetch<CsprCloudResponse<ContractPackage>>(
    `/contract-packages/${contractPackageHash}`,
    { signal }
  );
  return res.data;
}

/** Active delegations (staked positions) for an account. */
export async function getAccountDelegations(
  publicKey: string,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
): Promise<CsprCloudPaginated<Delegation>> {
  return csprFetch<CsprCloudPaginated<Delegation>>(
    `/accounts/${publicKey}/delegations`,
    {
      params: { page: opts.page ?? 1, page_size: opts.pageSize ?? 100 },
      signal: opts.signal,
    }
  );
}

/** Fetch a single deploy for execution proof. */
export async function getDeploy(
  deployHash: string,
  signal?: AbortSignal
): Promise<Deploy> {
  const res = await csprFetch<CsprCloudResponse<Deploy>>(
    `/deploys/${deployHash}`,
    { signal }
  );
  return res.data;
}
