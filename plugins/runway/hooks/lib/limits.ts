import { clamp, isNumber, span } from "./format";
import type { Limit, Part, PartId, Run, Style, Tone } from "./view";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Window = { id: PartId; label: string; ms: number; alertWithin: number };

const WINDOWS: Record<string, Window> = {
  five_hour: { id: "5h", label: "5h", ms: 5 * HOUR, alertWithin: 30 * MINUTE },
  seven_day: { id: "7d", label: "7d", ms: 7 * DAY, alertWithin: DAY }
};

export const CELLS = 8;

// Early in a window a small use reads as a huge pace, so the forecast waits for both.
const MIN_ELAPSED = 0.1;
const MIN_USED = 5;

function forecast(used: number, elapsed: number | null, window: Window, left: number | null): number | null {
  if (elapsed === null || left === null || elapsed < MIN_ELAPSED || used < MIN_USED || used >= 100) {
    return null;
  }

  const endsIn = ((100 - used) * elapsed * window.ms) / used;
  return endsIn < left ? endsIn : null;
}

function bar(used: number, elapsed: number | null, tone: Tone): Run[] {
  const usedCells = used <= 0 ? 0 : clamp(Math.round((used / 100) * CELLS), 1, CELLS);
  const timeCells = elapsed === null ? usedCells : Math.round(elapsed * CELLS);
  const ahead: Style = tone === "alert" ? "alert" : "warn";
  const runs: Run[] = [];

  for (let cell = 0; cell < CELLS; cell += 1) {
    let text = "▱";
    let style: Style = "dim";
    if (cell < usedCells) {
      text = "▰";
      style = cell >= timeCells ? ahead : "plain";
    } else if (cell < timeCells) {
      style = "good";
    }

    const lastRun = runs.at(-1);
    if (lastRun && lastRun.style === style) {
      lastRun.text += text;
    } else {
      runs.push({ text, style });
    }
  }
  return runs;
}

export function isLimitWindow(kind: string): boolean {
  return Object.hasOwn(WINDOWS, kind);
}

export function limitPart(limit: Limit, now: number): Part | null {
  const window = isLimitWindow(limit.kind) ? WINDOWS[limit.kind] : undefined;
  if (!window || !isNumber(limit.percentUsed) || limit.percentUsed < 0) {
    return null;
  }

  const used = clamp(limit.percentUsed, 0, 100);
  const reset = typeof limit.resetsAt === "string" ? Date.parse(limit.resetsAt) : Number.NaN;
  const hasReset = Number.isFinite(reset);
  // After its reset time a reading describes a window that is over.
  if (hasReset && reset <= now) {
    return null;
  }

  const left = hasReset ? reset - now : null;
  const elapsed = left === null ? null : clamp((window.ms - left) / window.ms, 0, 1);
  const endsIn = forecast(used, elapsed, window, left);

  let tone: Tone = "calm";
  if (used >= 100 || (endsIn !== null && endsIn <= window.alertWithin)) {
    tone = "alert";
  } else if (endsIn !== null || used >= 90) {
    tone = "warn";
  }

  const shown = used >= 100 ? 100 : Math.min(99, Math.round(used));
  const runs: Run[] = [
    { text: `${window.label} `, style: "plain" },
    ...bar(used, elapsed, tone),
    { text: ` ${shown}%`, style: tone === "calm" ? "plain" : tone }
  ];

  if (used >= 100) {
    runs.push({ text: left === null ? " reached" : ` reached · resets in ${span(left)}`, style: "alert" });
  } else {
    if (left !== null) {
      runs.push({ text: ` ${span(left)}`, style: "dim" });
    }
    if (endsIn !== null) {
      runs.push({ text: ` ends in ${span(endsIn)}`, style: tone === "alert" ? "alert" : "warn" });
    }
  }

  return { id: window.id, tone, runs };
}
