# FinArc

**Agentic Trading Intelligence for Retail Investors**

---

## Overview

Retail investors operate at a structural disadvantage. Institutions rely on high-frequency data infrastructure, quantitative research teams, and advanced AI systems to inform trading decisions. Retail traders, by contrast, often depend on fragmented tools, informal signals, and reactive workflows.

**FinArc narrows that gap.**

FinArc is an AI-native trading intelligence engine powered by Claude and a Council of AI agents. It unifies structured market data, sentiment signals, and user-defined risk preferences into a disciplined, risk-aware decision framework.

This is not an automated trading bot.
It is a structured decision-support layer designed to improve clarity, not encourage impulsive trading.

---

## Problem

Retail traders face:

* Fragmented market data sources
* Lack of structured risk modeling
* Overexposure to leverage
* Sentiment-driven decision-making
* No institutional-grade intelligence layer

Access to markets has been democratized.
Access to structured intelligence has not.

---

## Solution — FinArc

FinArc introduces a **Council of AI Agents** that aggregate and reason over:

* Forex market data (Alpha Vantage)
* Crypto market data (CoinMarketCap)
* News & sentiment (NewsData)

Users provide:

* Market (Forex / Crypto)
* Asset
* Capital amount
* Risk profile (Conservative / Moderate / Aggressive)

FinArc processes structured OHLCV, rankings, and sentiment data through Claude and generates a disciplined trade framework.

---

## What FinArc Generates

For each analysis, FinArc provides:

* Market overview
* Technical context
* BUY / SELL / HOLD bias
* Suggested entry
* Take-profit (TP)
* Stop-loss (SL)
* Risk assessment
* Confidence score
* Counter-arguments (why the trade may fail)

All strategies are paper-traded first.

Users retain full control over execution.

---

## Key Principles

### 1. Risk-Aware by Design

FinArc emphasizes downside modeling and position sizing discipline.

### 2. AI as Decision Support

The system does not custody funds or execute trades autonomously.

### 3. Unified Intelligence

Market data + sentiment + user risk profile are processed in a single reasoning pipeline.

### 4. Paper Trading First

Users evaluate structured trade frameworks without risking real capital.

---

## Architecture

**Frontend**

* Next.js (App Router)
* Tailwind CSS
* Modular dashboard layout
* AI Copilot panel

**Backend**

* Claude for structured reasoning
* MCP data sources:

  * Alpha Vantage (Forex)
  * CoinMarketCap (Crypto)
  * NewsData (Sentiment)

**Core Engine**

* Multi-agent reasoning pipeline
* Structured JSON output
* Risk profile integration
* Paper-trade simulation layer

---

## Regulatory Positioning

FinArc is a decision-support and research tool.
It does not act as a broker, custodian, or automated execution engine.

If scaled commercially, the platform would align with applicable regulatory frameworks (e.g., SEBI in India) either through advisory registration or licensed partnerships.

---

## Why FinArc Matters

Retail participation in global markets is rising rapidly.
However, structured intelligence has not scaled with participation.

FinArc aims to:

* Reduce impulsive decision-making
* Improve clarity and risk awareness
* Provide institutional-style reasoning without institutional infrastructure

---

## How to run

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev
```

For production:

```bash
npm run build
npm start
```

Optional: copy `.env.example` to `.env` and add any API keys (e.g. for Alpha Vantage, CoinMarketCap, NewsData) if you use live data sources.

---

## Demo Flow

1. Select market and asset
2. Enter capital and risk profile
3. Generate AI trade framework
4. Review structured risk model
5. Paper-trade simulation

---

## Disclaimer

FinArc does not provide financial advice.
All outputs are AI-generated analytical frameworks intended for educational and research purposes only.

Users are responsible for their own financial decisions.
