/**
 * Read real on-chain positions for an account: liquid (idle) CSPR plus each
 * active delegation, mapped into the agent's Position shape so the decision
 * engine rebalances actual funds.
 */

import { getAccount, getAccountDelegations } from "./csprcloud";
import { motesToCspr } from "./normalize";
import type { Position } from "@/lib/rebalance/types";

const IDLE_VENUE_ID = "idle";

export async function getAccountPositions(
  publicKey: string,
  signal?: AbortSignal
): Promise<Position[]> {
  const [account, delegations] = await Promise.all([
    getAccount(publicKey, signal),
    getAccountDelegations(publicKey, { signal }).catch(() => ({ data: [] })),
  ]);

  const positions: Position[] = [];

  const idle = account.balance ? motesToCspr(account.balance) : 0;
  positions.push({
    venueId: IDLE_VENUE_ID,
    protocol: "Idle wallet balance",
    amountCspr: idle,
  });

  for (const d of delegations.data) {
    positions.push({
      venueId: `staking:${d.validator_public_key}`,
      protocol: `Validator ${d.validator_public_key.slice(0, 8)}…${d.validator_public_key.slice(-4)}`,
      amountCspr: motesToCspr(d.stake),
    });
  }

  return positions;
}
