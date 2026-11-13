import { cachePart } from "./cache";
import { contextPart } from "./context";
import { isNumber } from "./format";
import { isLimitWindow, limitPart } from "./limits";
import { agentsPart, costPart } from "./meters";
import type { Part, PartId, Tone, View } from "./view";

export const SEPARATOR = " │ ";

export type Facts = { now: number; model: string | null; isWorking: boolean };

const URGENCY: Record<Tone, number> = { alert: 0, warn: 1, calm: 2 };

// The first name is the first part to go when the row is too narrow.
const DROP_ORDER: PartId[] = ["agents", "cost", "cache", "context", "7d", "5h"];

export function describe(view: View, facts: Facts): Part[] {
  // Only a 5-hour or a 7-day window marks a subscription: a gateway's spend limit does not.
  const isSubscription = view.limits.some((entry) => isLimitWindow(entry.kind));
  const limit = (kind: string) => {
    const reading = view.limits.find((entry) => entry.kind === kind);
    return reading ? limitPart(reading, facts.now) : null;
  };

  const parts = [
    limit("five_hour"),
    limit("seven_day"),
    contextPart(view.context, view.history, view.pace),
    cachePart(view.cache, view.isCompacted, {
      now: facts.now,
      isSubscription,
      model: facts.model,
      isWorking: facts.isWorking,
      tokens: view.context?.tokens ?? null
    }),
    costPart(view.usd, view.last, isSubscription),
    agentsPart(view.agents)
  ];

  return parts.filter((part): part is Part => part !== null);
}

export function width(parts: Part[]): number {
  const text = parts.map((part) => part.runs.map((run) => run.text).join("")).join(SEPARATOR);
  // Every character the band draws takes one cell, so the count of characters is the width.
  return [...text].length;
}

export function arrange(parts: Part[], columns?: number): Part[] {
  // The sort is stable: parts of one urgency keep the order they came in.
  const row = [...parts].sort((a, b) => URGENCY[a.tone] - URGENCY[b.tone]);
  if (!isNumber(columns)) {
    return row;
  }

  while (row.length > 0 && width(row) > columns) {
    const calmest = Math.max(...row.map((part) => URGENCY[part.tone]));
    const candidates = row.filter((part) => URGENCY[part.tone] === calmest);
    const drop = DROP_ORDER.map((id) => candidates.find((part) => part.id === id)).find((part) => part);
    if (!drop) {
      break;
    }
    row.splice(row.indexOf(drop), 1);
  }
  return row;
}
