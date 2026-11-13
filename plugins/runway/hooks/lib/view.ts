import { isNumber } from "./format";
import type {
  Agents,
  CacheReading,
  ContextReading,
  CostMark,
  LastTurn,
  Limit,
  View
} from "../../types";

export type Tone = "calm" | "warn" | "alert";
export type Style = "plain" | "dim" | "good" | "warn" | "alert";
export type Run = { text: string; style: Style };
export type PartId = "5h" | "7d" | "context" | "cache" | "cost" | "agents";
export type Part = { id: PartId; tone: Tone; runs: Run[] };

// The view is the mod's state contract, which Claude Code reads from one file with no imports.
export type { Agents, CacheReading, ContextReading, CostMark, LastTurn, Limit, View };

// What Claude Code reports. Every field can be absent or wrong: the API is early access.
export type Reading = { context?: unknown; rateLimits?: unknown; cost?: unknown; changed?: unknown };
export type TurnTokens = {
  input_tokens?: unknown;
  cache_read_input_tokens?: unknown;
  cache_creation_input_tokens?: unknown;
};
export type Turn = {
  reading: Reading;
  tokens: TurnTokens | null;
  now: number;
  model: string | null;
};

export const HISTORY = 8;

export const EMPTY: View = {
  limits: [],
  context: null,
  history: [],
  pace: [],
  cache: null,
  isCompacted: false,
  usd: null,
  mark: null,
  last: null,
  agents: { running: 0, total: 0 }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function cleanLimits(value: unknown): Limit[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const limits: Limit[] = [];
  for (const entry of value) {
    if (isRecord(entry) && typeof entry.kind === "string" && isNumber(entry.percentUsed) && entry.percentUsed >= 0) {
      const limit: Limit = { kind: entry.kind, percentUsed: entry.percentUsed };
      if (typeof entry.resetsAt === "string") {
        limit.resetsAt = entry.resetsAt;
      }
      limits.push(limit);
    }
  }
  return limits;
}

function cleanContext(value: unknown): ContextReading | null {
  if (!isRecord(value) || !isNumber(value.window) || value.window <= 0) {
    return null;
  }

  const context: ContextReading = { window: value.window };
  if (isNumber(value.tokens) && value.tokens >= 0) {
    context.tokens = value.tokens;
  }
  if (isNumber(value.percent) && value.percent >= 0) {
    context.percent = value.percent;
  }
  return context;
}

function cleanUsd(value: unknown): number | null {
  return isRecord(value) && isNumber(value.usd) && value.usd >= 0 ? value.usd : null;
}

function cleanCache(tokens: TurnTokens | null, now: number, model: string | null): CacheReading | null {
  if (!tokens) {
    return null;
  }

  const read = tokens.cache_read_input_tokens;
  const written = tokens.cache_creation_input_tokens;
  const fresh = tokens.input_tokens;
  if (!isNumber(read) || !isNumber(written) || !isNumber(fresh) || read < 0 || written < 0 || fresh < 0) {
    return null;
  }
  // A turn that sent nothing to the model renews no cache.
  if (read + written + fresh === 0) {
    return null;
  }
  return { at: now, read, written, fresh, model };
}

function markOf(usd: number | null, limits: Limit[]): CostMark {
  const limit = limits.find((entry) => entry.kind === "five_hour");
  return { usd, fiveHour: limit?.percentUsed ?? null, resetsAt: limit?.resetsAt ?? null };
}

// A mark from a window that has ended since is another window's figure: no difference to show.
function sameWindow(mark: CostMark, now: number): boolean {
  return typeof mark.resetsAt !== "string" || !(now >= Date.parse(mark.resetsAt));
}

// A figure that went down means the window or the session started again: no difference to show.
function grown(now: number | null, before: number | null): number | null {
  return now !== null && before !== null && now >= before ? now - before : null;
}

// True when Claude Code says the limits themselves moved, which an empty list alone does not say.
export function limitsChanged(reading: Reading): boolean {
  return Array.isArray(reading.changed) && reading.changed.includes("rateLimits");
}

export function withMeasure(view: View, reading: Reading): View {
  const limits = cleanLimits(reading.rateLimits);
  const context = cleanContext(reading.context);
  // A reading with no token count would hide the part: the last count for the same window stands.
  const hasNoCount =
    context && !isNumber(context.tokens) && isNumber(view.context?.tokens) && view.context.window === context.window;
  const count = hasNoCount ? undefined : context?.tokens;

  return {
    ...view,
    // A count below the last turn's is a compaction: the pace before it says nothing about after.
    pace: isNumber(count) && count < (view.pace.at(-1) ?? 0) ? [] : view.pace,
    // An empty list also comes before the first answer of a session. It clears a reading only when
    // Claude Code says the limits left, as after a change to an account that has none.
    limits: limits.length > 0 || limitsChanged(reading) ? limits : view.limits,
    context: (hasNoCount ? null : context) ?? view.context,
    usd: cleanUsd(reading.cost) ?? view.usd
  };
}

export function withSaved(view: View, saved: unknown, now: number): View {
  if (view.limits.length > 0 || !isRecord(saved)) {
    return view;
  }

  // A saved reading is another session's. It is shown only while its own reset time says it holds.
  const limits = cleanLimits(saved.limits).filter(
    (limit) => typeof limit.resetsAt === "string" && Date.parse(limit.resetsAt) > now
  );
  return { ...view, limits };
}

export function withStart(view: View, reading: Reading): View {
  const next = withMeasure(view, reading);
  // The mark is this session's own figure. A saved reading is older, and the difference to it
  // would count other sessions' use as the first prompt's.
  return { ...next, mark: next.mark ?? markOf(next.usd, cleanLimits(reading.rateLimits)) };
}

// A new conversation in the same process: the limits and the agents go on, the rest starts again.
export function withClear(view: View): View {
  return { ...EMPTY, limits: view.limits, agents: view.agents };
}

export function withTurn(view: View, turn: Turn): View {
  const measured = withMeasure(view, turn.reading);
  const tokens = measured.context?.tokens;
  const cache = cleanCache(turn.tokens, turn.now, turn.model);
  // After an answer, the list is what the account has. An empty one then means "no limits", also
  // when the limits shown came from another session's saved reading.
  const next = cache ? { ...measured, limits: cleanLimits(turn.reading.rateLimits) } : measured;
  const mark = markOf(next.usd, next.limits);

  return {
    ...next,
    history: isNumber(tokens) ? [...next.history, tokens].slice(-HISTORY) : next.history,
    pace: isNumber(tokens) ? [...next.pace, tokens].slice(-HISTORY) : next.pace,
    // A turn with no token counts was interrupted: the cache of the turn before still stands.
    cache: cache ?? next.cache,
    isCompacted: cache ? false : next.isCompacted,
    mark,
    last: view.mark
      ? {
          usd: grown(mark.usd, view.mark.usd),
          fiveHourPoints: sameWindow(view.mark, turn.now) ? grown(mark.fiveHour, view.mark.fiveHour) : null
        }
      : null
  };
}

export function withCompact(view: View): View {
  return { ...view, pace: [], cache: null, isCompacted: true };
}

export function withAgents(view: View, list: unknown): View {
  const agents = Array.isArray(list) ? list : [];
  const running = agents.filter((agent) => isRecord(agent) && agent.status === "running").length;

  // The same object back means "nothing to write" to the caller.
  if (view.agents.running === running && view.agents.total === agents.length) {
    return view;
  }
  return { ...view, agents: { running, total: agents.length } };
}
