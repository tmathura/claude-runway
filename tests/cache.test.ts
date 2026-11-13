import test from "node:test";
import assert from "node:assert/strict";

import { cachePart } from "../plugins/runway/hooks/lib/cache";
import type { CacheFacts } from "../plugins/runway/hooks/lib/cache";
import type { CacheReading, Part } from "../plugins/runway/hooks/lib/view";

const MINUTE = 60_000;
const NOW = Date.parse("2026-11-13T10:00:00Z");

const text = (part: Part | null) => part?.runs.map((run) => run.text).join("");
const read = (ago: number, more: Partial<CacheReading> = {}): CacheReading => ({
  at: NOW - ago,
  read: 9500,
  written: 300,
  fresh: 200,
  model: "model-a",
  ...more
});
const facts = (more: Partial<CacheFacts> = {}): CacheFacts => ({
  now: NOW,
  isSubscription: true,
  model: "model-a",
  isWorking: false,
  tokens: 289_000,
  ...more
});

test("a warm cache shows the time before it lapses", () => {
  const part = cachePart(read(8 * MINUTE), false, facts());

  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "cache 52m");
});

test("a cache in its last sixth warns", () => {
  const part = cachePart(read(55 * MINUTE), false, facts());

  assert.equal(part?.tone, "warn");
  assert.equal(text(part), "cache 5m");
});

test("a lapsed cache is cold and says what the next message writes again", () => {
  const part = cachePart(read(61 * MINUTE), false, facts());

  assert.equal(part?.tone, "alert");
  assert.equal(text(part), "cache cold · 289k to rewrite");
});

test("a cold cache with no context reading says cold only", () => {
  assert.equal(text(cachePart(read(61 * MINUTE), false, facts({ tokens: null }))), "cache cold");
});

test("an account with no limits has a cache of five minutes", () => {
  assert.equal(text(cachePart(read(2 * MINUTE), false, facts({ isSubscription: false }))), "cache 3m");
  assert.equal(cachePart(read(6 * MINUTE), false, facts({ isSubscription: false }))?.tone, "alert");
});

test("a running turn keeps the cache warm", () => {
  const part = cachePart(read(61 * MINUTE), false, facts({ isWorking: true }));

  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "cache warm");
});

test("another model than the one that wrote the cache warns", () => {
  const part = cachePart(read(8 * MINUTE), false, facts({ model: "model-b" }));

  assert.equal(part?.tone, "warn");
  assert.equal(text(part), "cache: model changed");
});

test("an unknown model is not a changed model", () => {
  assert.equal(text(cachePart(read(8 * MINUTE), false, facts({ model: null }))), "cache 52m");
  assert.equal(text(cachePart(read(8 * MINUTE, { model: null }), false, facts())), "cache 52m");
});

test("a compacted session says so, with or without a reading", () => {
  assert.equal(text(cachePart(null, true, facts())), "cache compacted");
  assert.equal(text(cachePart(read(8 * MINUTE), true, facts())), "cache compacted");
});

test("a turn that read less than 90% from the cache shows the share", () => {
  const part = cachePart(read(8 * MINUTE, { read: 700, written: 200, fresh: 100 }), false, facts());

  assert.equal(text(part), "cache 52m · 70% read");
});

test("a turn with no input tokens shows no share", () => {
  const part = cachePart(read(8 * MINUTE, { read: 0, written: 0, fresh: 0 }), false, facts());

  assert.equal(text(part), "cache 52m");
});

test("no reading draws no part", () => {
  assert.equal(cachePart(null, false, facts()), null);
  assert.equal(cachePart(read(0, { at: Number.NaN }), false, facts()), null);
});
