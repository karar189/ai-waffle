# Casper Hackathon Handoff

Date: July 7, 2026

This file summarizes the key points from our discussion so it can be pasted into another chat.

## 1. Repository fit vs problem statement

Problem statement:

> Autonomous Yield-Routing Agents via MCP  
> Build an autonomous agent that actively monitors yield opportunities across Casper DeFi protocols. The agent uses Model Context Protocol (MCP) servers to expose Casper smart contract states to an AI LLM. The AI Agent Skill naively signs transactions and reallocates funds when yield thresholds are met, transforming a passive wallet into an active, self-driving portfolio manager.

Current repo status:

- The repo is strong on the `AI agent + backend + execution` pattern.
- The repo is currently built around `BNB Chain perpetual trading`, not `Casper DeFi yield routing`.
- The reusable parts are:
  - AI planning / decision engine
  - wallet auth
  - kill switch
  - revocable AI-style controls
  - backend/executor split

Main mismatch:

- Current project: `AI-powered perpetual trading on BNB Chain`
- Required project: `Casper-native yield routing across DeFi protocols using MCP`

High-level conclusion:

- This is not a direct fit as-is.
- It is better treated as a `pivot / adaptation` rather than a finished submission for that exact problem statement.

## 2. Main gaps we identified

### Chain mismatch

- Your current smart contract and executor flow are built for `BNB Chain`.
- Casper generally expects a different stack and should be treated as a separate chain integration path.

### Product mismatch

- Your current product is about:
  - trading signals
  - perps
  - market execution
- The problem statement is about:
  - APY monitoring
  - protocol comparison
  - fund reallocation
  - yield optimization

### MCP gap

- We did not find a Casper-specific MCP layer in the repo.
- For the hackathon, you need an MCP server that exposes:
  - protocol state
  - wallet position state
  - yield/risk snapshots

### Protocol-routing gap

- No current APY scanner
- No protocol adapter layer
- No rebalance policy engine
- No yield threshold-based reallocator

### Security / execution gap

- The current AI execution model is too backend-owner driven.
- Judges may ask whether the user truly delegates or whether your backend key is effectively the trader.

### Completeness gap

- Some execution paths are real, but parts of the lifecycle are still incomplete.
- Open-order execution is more real.
- Some close / management paths are still stubbed or missing.

## 3. What to do about the backend-owner execution issue

Current concern:

- If the backend key is the ultimate authority, then the AI system is not really user-controlled.

Recommended fix:

- Move from `backend-owner executes` to `user-scoped delegation`.

Best model:

- The backend becomes `planner + relayer`
- The user remains the actual authority
- The contract verifies user-approved actions or policy limits

Recommended approaches:

### Preferred

- `Signed user intents`
- User signs a structured message approving an exact action
- Backend only relays it

### Better autonomous UX

- `Session keys / temporary delegation`
- User grants short-lived limited permissions

### Add policy controls

- max allocation
- protocol allowlist
- slippage cap
- min APY delta
- expiry
- nonce
- cooldown

What not to do:

- Do not claim full self-custody autonomy if the backend private key can unilaterally trade.

## 4. Stub / mock execution clarification

We clarified this wording:

- Yes, by “stubbed live execution paths” we effectively meant `mock / placeholder paths`.
- More accurate wording:
  - `Open-order execution is partially implemented`
  - `Some live execution paths are still mocked/stubbed`
  - `The trade lifecycle is incomplete because close and full position management are not fully wired end-to-end`

## 5. Feature list to focus on for the Casper problem statement

### Must-have MVP

- Casper protocol state reader
- MCP server for Casper
- yield comparison engine
- threshold-based rebalance logic
- wallet portfolio view
- reallocation execution
- user controls and revoke/pause

### Agent features

- decision policy and reasoning
- autonomous monitoring loop
- reasoning + action log
- safe delegation

### MCP-specific features

- one protocol adapter per supported Casper protocol
- structured MCP outputs
- tool separation for:
  - protocol state
  - wallet state
  - execution proposal
  - execution

### Risk/safety features

- risk scoring
- max move size
- cooldown
- emergency stop
- dry run / simulation mode
- manual override

### Best demo features

- live dashboard
- one-click start
- execution proof
- before/after allocation
- agent timeline

## 6. Suggested build order

1. Casper wallet + balance/position reader
2. MCP server exposing 2-3 protocol states
3. yield ranking + threshold logic
4. rebalance execution for one simple route
5. dashboard + decision log
6. safety controls + revoke/pause

## 7. Casper DeFi yield products we discussed

### High-confidence, verified

- `Native CSPR delegation / staking`
- This is the strongest currently verified Casper-native yield surface we discussed.

Possible agent use cases:

- validator rotation
- delegation optimization
- validator performance tracking
- fee/performance comparison

### Lower-confidence / needs manual verification before building around them

- DEX LP / farm products
- lending / supply markets
- protocol-specific staking products

Important note:

- Casper’s public DeFi surface looked thinner than larger EVM ecosystems from what we could confidently verify in indexed sources.
- Before promising “across Casper DeFi protocols,” manually confirm:
  - active app
  - active liquidity
  - live contracts
  - readable state
  - working wallet execution path

## 8. CSPR.build console: how to get a CSPR.cloud API key

We inspected the live `console.cspr.build` frontend flow and recovered the main steps from its public UI code.

### If you already have an account

1. Go to `https://console.cspr.build/sign-in`
2. Enter email and password
3. Click `Login now`
4. You land on Home

### If you do not have an account

1. Go to `https://console.cspr.build/sign-up`
2. Choose `Company` or `Individual`
3. Fill:
   - Name
   - Email
   - Password
   - Company name if applicable
4. Complete reCAPTCHA
5. Accept Privacy Policy / Terms
6. Submit
7. Confirm your email
8. Sign in

### To create the API key

1. After login, go to Home
2. In `CSPR.cloud keys`, click `Create key`
3. A modal opens titled `Create CSPR.cloud key`
4. Enter a key name
5. Click `Create`
6. On success, the app shows:
   - `New CSPR.cloud key is ready!`
7. The key is added to your `CSPR.cloud keys` list

Tier notes:

- Free tier: up to 1 key
- Pro tier: up to 10 keys
- If the limit is exceeded, the flow switches to upgrade

## 9. Casper Wallet browser extension and private key guidance

Question asked:

- How to find the private key from the Casper Wallet browser extension?

Practical answer:

- We could not confidently verify a current official public flow for exporting a raw private key from the extension.
- The extension may expose:
  - recovery phrase / seed backup
  - but not necessarily raw private-key export

Recommended guidance:

- Do not use your main wallet private key for automation
- Instead:
  - create a separate automation wallet
  - fund it with limited capital
  - use that key on the agent backend
  - keep the main wallet as the controller / owner wallet

Suggested architecture:

- `Owner wallet`: user-controlled, no backend custody
- `Agent wallet`: separate hot wallet, limited funds
- `Policy layer`: spend caps, protocol allowlist, revoke switch

## 10. Recommended submission framing

Do not submit the current repo as:

- “fully finished Casper yield-routing agent”

Better framing:

- “existing AI execution stack being adapted into a Casper-native MCP-based yield router”

Best submission path:

- make a Casper-focused branch
- reduce scope
- target one real Casper yield surface first
- show a real end-to-end monitor -> decide -> rebalance flow

## 11. Suggested MVP framing for judges

Good v1 framing:

- `Autonomous CSPR staking / delegation optimizer with MCP-based protocol state access`

Good v2 framing:

- `staking + one DEX / LP opportunity scanner`

Good v3 framing:

- `full yield router across staking + LP + lending`

## 12. Short copy-paste summary

You can paste this short version into another chat:

> I have an existing repo called Arcgenesis that is currently an AI-powered BNB Chain perp trading system with a backend planner, executor service, wallet auth, and AI enable/revoke patterns. I want to adapt it for a Casper hackathon problem statement: an autonomous yield-routing agent via MCP. We identified that the current repo is architecturally reusable but not a direct fit because it targets BNB perps, not Casper DeFi yield routing. The biggest gaps are Casper chain integration, MCP server support, protocol state adapters, APY/risk comparison, and user-scoped safe delegation instead of backend-owner execution. We also discussed using a separate automation wallet instead of exporting my main Casper Wallet browser extension private key, and we recovered the `console.cspr.build` flow for creating a `CSPR.cloud` key through the Home -> CSPR.cloud keys -> Create key flow. I want help planning the MVP architecture and implementation path for the Casper version.

