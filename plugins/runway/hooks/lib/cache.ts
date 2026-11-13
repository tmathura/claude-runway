import { count, isNumber, span } from "./format";
import type { CacheReading, Part, Run } from "./view";

const MINUTE = 60_000;

// Claude Code does not report how long a cache entry lives. A subscription gets one hour, an
// API key five minutes.
const LIFE_SUBSCRIPTION = 60 * MINUTE;
const LIFE_API_KEY = 5 * MINUTE;

export type CacheFacts = {
  now: number;
  isSubscription: boolean;
  model: string | null;
  isWorking: boolean;
  tokens: number | null;
};

export function cachePart(cache: CacheReading | null, isCompacted: boolean, facts: CacheFacts): Part | null {
  if (isCompacted) {
    return { id: "cache", tone: "calm", runs: [{ text: "cache compacted", style: "dim" }] };
  }
  if (!cache || !isNumber(cache.at)) {
    return null;
  }
  // Each request of a running turn renews the cache.
  if (facts.isWorking) {
    return { id: "cache", tone: "calm", runs: [{ text: "cache warm", style: "plain" }] };
  }
  if (facts.model && cache.model && facts.model !== cache.model) {
    return { id: "cache", tone: "warn", runs: [{ text: "cache: model changed", style: "warn" }] };
  }

  const life = facts.isSubscription ? LIFE_SUBSCRIPTION : LIFE_API_KEY;
  const left = cache.at + life - facts.now;

  if (left <= 0) {
    const rewrite = isNumber(facts.tokens) && facts.tokens > 0 ? ` · ${count(facts.tokens)} to rewrite` : "";
    return { id: "cache", tone: "alert", runs: [{ text: `cache cold${rewrite}`, style: "alert" }] };
  }

  const isSoon = left <= life / 6;
  const runs: Run[] = [{ text: `cache ${span(left)}`, style: isSoon ? "warn" : "plain" }];

  const total = cache.read + cache.written + cache.fresh;
  if (total > 0 && cache.read / total < 0.9) {
    runs.push({ text: ` · ${Math.round((cache.read / total) * 100)}% read`, style: "dim" });
  }

  return { id: "cache", tone: isSoon ? "warn" : "calm", runs };
}
