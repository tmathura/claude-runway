import { clamp, count, isNumber, signed } from "./format";
import type { ContextReading, Part, Run, Tone } from "./view";

const LEVELS = "▁▂▃▄▅▆▇█";
const RECENT = 5;

export function chart(history: number[]): string {
  const low = Math.min(...history);
  const high = Math.max(...history);

  return history
    .map((tokens) => {
      const level = high === low ? 3 : Math.round(((tokens - low) / (high - low)) * (LEVELS.length - 1));
      return LEVELS[level];
    })
    .join("");
}

export function promptsLeft(room: number, history: number[]): number | null {
  const grew: number[] = [];
  for (let turn = Math.max(1, history.length - RECENT); turn < history.length; turn += 1) {
    const change = (history[turn] ?? 0) - (history[turn - 1] ?? 0);
    if (change > 0) {
      grew.push(change);
    } else if (change < 0) {
      // A drop is a compaction or a clear: the pace before it says nothing about the pace after.
      grew.length = 0;
    }
  }

  // One turn that grew is not a pace.
  if (grew.length < 2) {
    return null;
  }

  const mean = grew.reduce((sum, change) => sum + change, 0) / grew.length;
  return Math.max(0, Math.floor(room / mean));
}

export function contextPart(context: ContextReading | null, history: number[]): Part | null {
  if (!context || !isNumber(context.tokens) || !isNumber(context.window) || context.window <= 0) {
    return null;
  }

  const tokens = context.tokens;
  const percent = clamp(isNumber(context.percent) ? context.percent : (tokens / context.window) * 100, 0, 100);
  const left = promptsLeft(context.window - tokens, history);

  let tone: Tone = "calm";
  if (percent >= 90 || (left !== null && left <= 3)) {
    tone = "alert";
  } else if (percent >= 75 || (left !== null && left <= 10)) {
    tone = "warn";
  }

  const runs: Run[] = [
    { text: `ctx ${count(tokens)}`, style: tone === "calm" ? "plain" : tone },
    { text: ` ${Math.round(percent)}%`, style: "dim" }
  ];

  if (history.length >= 2) {
    runs.push({ text: ` ${chart(history)}`, style: "plain" });
    runs.push({ text: ` ${signed((history.at(-1) ?? 0) - (history.at(-2) ?? 0))}`, style: "dim" });
  }
  if (left !== null && left < 100) {
    runs.push({ text: ` ~${left} left`, style: tone === "calm" ? "dim" : tone });
  }

  return { id: "context", tone, runs };
}
