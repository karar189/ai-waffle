/**
 * Parses a Claude strategy recommendation from chat content into a structured JSON object.
 * Saves to and reads from localStorage.
 */

export interface ParsedStrategy {
  market?: string;
  capital?: string;
  maxLossPerTrade?: string;
  leverage?: string;
  timeframe?: string;
  entrySignals?: string[];
  positionSizing?: string;
  stopLoss?: string;
  takeProfit?: string;
  maxTradesPerDay?: string;
  notes?: string[];
  optionalBoost?: string[];
}

export interface SavedStrategy {
  id: string;
  importedAt: string;
  title: string;
  rawText: string;
  parsed: ParsedStrategy;
}

const STORAGE_KEY = "copilot_saved_strategies";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAfterLabel(text: string, label: string): string | undefined {
  const escaped = escapeRe(label);
  const patterns = [
    new RegExp(`\\*\\*${escaped}\\*\\*:?\\s*([^\n*]+)`, "i"),
    new RegExp(`${escaped}:?\\s*([^\n]+)`, "i"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function extractSection(text: string, sectionTitle: string): string[] {
  const lines: string[] = [];
  const re = new RegExp(
    `\\*\\*${sectionTitle}\\*\\*:?\\s*([\\s\\S]*?)(?=\\*\\*[A-Z]|##|$)`,
    "i"
  );
  const m = text.match(re);
  if (!m?.[1]) return lines;
  const block = m[1];
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/^[\s\-*•]+/, "").trim();
    if (trimmed) lines.push(trimmed);
  }
  return lines;
}

/** Infer stop-loss from prose like "20% stop-loss", "stop at 20% below entry", "Max Loss: $20 (20%)" */
function inferStopLossFromProse(text: string): string | undefined {
  const m =
    text.match(/\*\*Max Loss\*\*:?\s*\$?\d+\s*\((\d+%[^)]*)\)/i) ??
    text.match(/(\d+%)\s*stop(-?\s*loss)?/i) ??
    text.match(/stop\s+at\s+(\d+%)\s*(below|under)/i) ??
    text.match(/(\d+%)\s*below\s+entry/i);
  if (m?.[1]) return m[1].trim() + " stop-loss";
  const m2 = text.match(/max loss[:\s]*\$?\d+/i);
  if (m2) return m2[0].replace(/\*\*/g, "").trim();
  return undefined;
}

/**
 * Detect if the message content looks like a trading strategy recommendation.
 */
export function looksLikeStrategy(content: string): boolean {
  const lower = content.toLowerCase();
  const hasStrategy =
    lower.includes("strategy") &&
    (lower.includes("**market**") ||
      lower.includes("**capital**") ||
      lower.includes("leverage") ||
      lower.includes("setup") ||
      lower.includes("entry") ||
      lower.includes("risk management") ||
      lower.includes("stop loss") ||
      lower.includes("take profit"));
  return hasStrategy;
}

/**
 * Parse strategy fields from Claude's message text into a structured object.
 */
export function parseStrategyFromMessage(content: string): SavedStrategy {
  const parsed: ParsedStrategy = {};

  parsed.market = extractAfterLabel(content, "Market");
  parsed.capital = extractAfterLabel(content, "Capital");
  parsed.maxLossPerTrade =
    extractAfterLabel(content, "Max Loss Per Trade") ??
    extractAfterLabel(content, "Max Loss");
  parsed.leverage = extractAfterLabel(content, "Leverage");

  parsed.positionSizing = extractAfterLabel(content, "Position Sizing");
  parsed.stopLoss =
    extractAfterLabel(content, "Stop Loss") ??
    inferStopLossFromProse(content);
  parsed.takeProfit = extractAfterLabel(content, "Take Profit");
  parsed.maxTradesPerDay = extractAfterLabel(content, "Max.*trades per day");

  const setupBlock = content.match(/\*\*Setup\*\*:?[\s\S]*?(?=\*\*Position|\*\*Risk|$)/i);
  if (setupBlock) {
    const setup = setupBlock[0];
    parsed.timeframe = extractAfterLabel(setup, "Timeframe");
    const entryMatch = setup.match(/\*\*Entry Signal\*\*:?[\s\S]*?(?=\*\*|$)/i);
    if (entryMatch) {
      const entryText = entryMatch[0].replace(/\*\*Entry Signal\*\*:?/i, "").trim();
      parsed.entrySignals = entryText
        .split(/\n|(?=\-\s)/)
        .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
        .filter(Boolean);
    }
  }

  if (!parsed.timeframe && /quick trades|hours to days|scalping|momentum|short-term/i.test(content))
    parsed.timeframe = "Short-term / quick trades";
  if (!parsed.entrySignals?.length && /price alert|key levels|support|resistance|breakout/i.test(content))
    parsed.entrySignals = ["Price levels / key support-resistance"];
  if (!parsed.stopLoss && /stop at \d+%|\d+% stop|max loss \$?\d+/i.test(content))
    parsed.stopLoss = parsed.stopLoss ?? inferStopLossFromProse(content);
  if (!parsed.optionalBoost?.length && /suggested next steps|consider a stop-loss|set up.*alert/i.test(content))
    parsed.optionalBoost = ["Price alerts at key levels", "Stop-loss strategy"];

  const riskSection = extractSection(content, "Risk Management");
  if (riskSection.length) parsed.notes = riskSection;

  const optionalMatch = content.match(/\*\*Optional Boost\*\*:?[\s\S]*?(?=\*\*|$)/i);
  if (optionalMatch) {
    const optText = optionalMatch[0].replace(/\*\*Optional Boost\*\*:?/i, "").trim();
    parsed.optionalBoost = optText
      .split(/\n/)
      .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
      .filter(Boolean);
  }

  const titleMatch = content.match(/##\s*\*?\*?([^*\n]+?)\*?\*?\s*$/m) ?? content.match(/##\s*\*?\*?([^*\n]+)\*?\*?/);
  const title = titleMatch ? titleMatch[1].trim() : "Imported strategy";

  return {
    id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    importedAt: new Date().toISOString(),
    title,
    rawText: content,
    parsed,
  };
}

/**
 * Save a strategy to localStorage (appends to list).
 */
export function saveStrategyToStorage(strategy: SavedStrategy): SavedStrategy[] {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
  const list: SavedStrategy[] = raw ? (JSON.parse(raw) as SavedStrategy[]) : [];
  list.push(strategy);
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

/**
 * Read all saved strategies from localStorage.
 */
export function getSavedStrategiesFromStorage(): SavedStrategy[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedStrategy[];
  } catch {
    return [];
  }
}

/**
 * Get a single saved strategy by id.
 */
export function getSavedStrategyById(id: string): SavedStrategy | null {
  const list = getSavedStrategiesFromStorage();
  return list.find((s) => s.id === id) ?? null;
}
