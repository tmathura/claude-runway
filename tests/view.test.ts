import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY,
  cleanLimits,
  withAgents,
  withClear,
  withCompact,
  withMeasure,
  withSaved,
  withStart,
  withTurn
} from "../plugins/runway/hooks/lib/view";
import type { View } from "../plugins/runway/hooks/lib/view";

const NOW = Date.parse("2026-11-13T10:00:00Z");
const RESET = "2026-11-13T12:00:00Z";

const reading = (percentUsed: number, tokens: number, usd: number) => ({
  rateLimits: [{ kind: "five_hour", percentUsed, resetsAt: RESET }],
  context: { tokens, window: 200_000, percent: (tokens / 200_000) * 100 },
  cost: { usd }
});
const tokens = { input_tokens: 200, cache_read_input_tokens: 9500, cache_creation_input_tokens: 300 };

test("cleanLimits keeps only whole readings", () => {
  const limits = cleanLimits([
    { kind: "five_hour", percentUsed: 34, resetsAt: RESET, extra: true },
    { kind: "seven_day", percentUsed: "41" },
    { percentUsed: 5 },
    null,
    "five_hour",
    { kind: "seven_day", percentUsed: 41, resetsAt: 12 }
  ]);

  assert.deepEqual(limits, [
    { kind: "five_hour", percentUsed: 34, resetsAt: RESET },
    { kind: "seven_day", percentUsed: 41 }
  ]);
  assert.deepEqual(cleanLimits(undefined), []);
  assert.deepEqual(cleanLimits({ kind: "five_hour" }), []);
});

test("a measure takes the limits, the context and the cost", () => {
  const view = withMeasure(EMPTY, reading(34, 60_000, 1.5));

  assert.deepEqual(view.limits, [{ kind: "five_hour", percentUsed: 34, resetsAt: RESET }]);
  assert.deepEqual(view.context, { window: 200_000, tokens: 60_000, percent: 30 });
  assert.equal(view.usd, 1.5);
});

test("a measure with a bad or absent figure keeps the reading before it", () => {
  const before = withMeasure(EMPTY, reading(34, 60_000, 1.5));
  const view = withMeasure(before, { rateLimits: [], context: { window: 0 }, cost: { usd: -1 } });

  assert.deepEqual(view, before);
  assert.deepEqual(withMeasure(before, {}), before);
  assert.deepEqual(withMeasure(before, { rateLimits: "none", context: 7, cost: null }), before);
});

test("a context with no token count yet keeps its window", () => {
  assert.deepEqual(withMeasure(EMPTY, { context: { window: 200_000 } }).context, { window: 200_000 });
});

test("a measure that says the limits left clears them", () => {
  const before = withMeasure(EMPTY, reading(34, 60_000, 1.5));

  assert.deepEqual(withMeasure(before, { rateLimits: [], changed: ["rateLimits"] }).limits, []);
  assert.deepEqual(withMeasure(before, { rateLimits: [], changed: ["cost"] }).limits, before.limits);
  assert.deepEqual(withMeasure(before, { rateLimits: [], changed: "rateLimits" }).limits, before.limits);
});

test("a reading with a negative share is dropped", () => {
  assert.deepEqual(cleanLimits([{ kind: "five_hour", percentUsed: -1 }]), []);
});

test("a saved reading fills a view that has no limits", () => {
  const saved = { limits: [{ kind: "seven_day", percentUsed: 41, resetsAt: RESET }] };

  assert.deepEqual(withSaved(EMPTY, saved, NOW).limits, saved.limits);
  assert.deepEqual(withSaved(EMPTY, null, NOW), EMPTY);
  assert.deepEqual(withSaved(EMPTY, "limits", NOW), EMPTY);
  assert.deepEqual(withSaved(EMPTY, { limits: "none" }, NOW).limits, []);
});

test("a saved reading is used only while its reset time is ahead", () => {
  const saved = {
    limits: [
      { kind: "five_hour", percentUsed: 34, resetsAt: "2026-11-13T09:59:00Z" },
      { kind: "seven_day", percentUsed: 41 },
      { kind: "seven_day", percentUsed: 41, resetsAt: "soon" }
    ]
  };

  assert.deepEqual(withSaved(EMPTY, saved, NOW).limits, []);
});

test("a saved reading does not replace the session's own", () => {
  const own = withMeasure(EMPTY, reading(34, 60_000, 1.5));

  assert.deepEqual(withSaved(own, { limits: [{ kind: "seven_day", percentUsed: 41, resetsAt: RESET }] }, NOW), own);
});

test("the start marks the cost and the 5-hour share once", () => {
  const started = withStart(EMPTY, reading(34, 60_000, 1.5));

  assert.deepEqual(started.mark, { usd: 1.5, fiveHour: 34, resetsAt: RESET });
  assert.deepEqual(withStart(started, reading(40, 70_000, 2)).mark, { usd: 1.5, fiveHour: 34, resetsAt: RESET });
});

test("the start does not take its 5-hour mark from a saved reading", () => {
  const saved = { limits: [{ kind: "five_hour", percentUsed: 10, resetsAt: RESET }] };
  const started = withStart(withSaved(EMPTY, saved, NOW), { cost: { usd: 0 } });
  const view = withTurn(started, { reading: reading(31, 60_000, 0.4), tokens, now: NOW, model: null });

  assert.deepEqual(started.mark, { usd: 0, fiveHour: null, resetsAt: null });
  assert.equal(view.last?.fiveHourPoints, null);
  assert.equal(view.last?.usd, 0.4);

  const interrupted = withTurn(started, { reading: {}, tokens: null, now: NOW, model: null });
  const answered = withTurn(interrupted, { reading: reading(31, 60_000, 0.4), tokens, now: NOW, model: null });

  assert.equal(interrupted.mark?.fiveHour, null);
  assert.equal(answered.last?.fiveHourPoints, null);
});

test("a new conversation keeps the limits, the agents and the 5-hour mark", () => {
  const first = withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: "model-a" });
  const cleared = withClear(withAgents(first, [{ status: "running" }]));

  const mark = { usd: null, fiveHour: 34, resetsAt: RESET };
  const next = withTurn(cleared, { reading: reading(36, 20_000, 0.2), tokens, now: NOW, model: "model-a" });

  assert.deepEqual(cleared, { ...EMPTY, limits: first.limits, agents: { running: 1, total: 1 }, mark });
  assert.deepEqual(next.last, { usd: null, fiveHourPoints: 2 });
});

test("an agents reading that changes nothing gives the same view back", () => {
  const view = withAgents(EMPTY, [{ status: "running" }]);

  assert.equal(withAgents(view, [{ status: "running" }]), view);
  assert.notEqual(withAgents(view, []), view);
});

test("a turn records the context, the cache and what it added", () => {
  const started = withStart(EMPTY, reading(34, 60_000, 1.5));
  const view = withTurn(started, { reading: reading(35.5, 80_000, 2.08), tokens, now: NOW, model: "model-a" });

  assert.deepEqual(view.history, [80_000]);
  assert.deepEqual(view.cache, { at: NOW, read: 9500, written: 300, fresh: 200, model: "model-a" });
  assert.equal(view.last?.fiveHourPoints, 1.5);
  assert.ok(Math.abs((view.last?.usd ?? 0) - 0.58) < 1e-9);
  assert.deepEqual(view.mark, { usd: 2.08, fiveHour: 35.5, resetsAt: RESET });
});

test("the history keeps the last 8 turns", () => {
  let view: View = EMPTY;
  for (let turn = 1; turn <= 10; turn += 1) {
    view = withTurn(view, { reading: reading(34, turn * 1000, 1), tokens, now: NOW, model: null });
  }

  assert.deepEqual(view.history, [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10_000]);
});

test("the first turn of a view with no mark shows no share", () => {
  const view = withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: null });

  assert.equal(view.last, null);
});

test("a figure that went down gives no share", () => {
  const started = withStart(EMPTY, reading(90, 60_000, 5));
  const view = withTurn(started, { reading: reading(2, 80_000, 1), tokens, now: NOW, model: null });

  assert.deepEqual(view.last, { usd: null, fiveHourPoints: null });
});

test("an interrupted turn keeps the cache of the turn before", () => {
  const first = withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: "model-a" });
  const second = withTurn(first, { reading: reading(34, 60_000, 1.5), tokens: null, now: NOW + 5000, model: "model-a" });
  const third = withTurn(first, { reading: {}, tokens: { input_tokens: "many" }, now: NOW + 5000, model: null });

  assert.deepEqual(second.cache, first.cache);
  assert.deepEqual(third.cache, first.cache);
});

test("a compaction clears the cache until the next turn with counts", () => {
  const first = withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: null });
  const compacted = withCompact(first);

  assert.equal(compacted.cache, null);
  assert.equal(compacted.isCompacted, true);
  assert.equal(withTurn(compacted, { reading: {}, tokens: null, now: NOW, model: null }).isCompacted, true);
  assert.equal(withTurn(compacted, { reading: {}, tokens, now: NOW, model: null }).isCompacted, false);
});

test("agents are counted by their state", () => {
  const list = [{ status: "running" }, { status: "completed" }, { status: "running" }, { status: "idle" }, null];

  assert.deepEqual(withAgents(EMPTY, list).agents, { running: 2, total: 5 });
  assert.deepEqual(withAgents(EMPTY, undefined).agents, { running: 0, total: 0 });
});

test("a turn with negative token counts keeps the cache of the turn before", () => {
  const first = withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: "model-a" });
  const bad = { input_tokens: 100, cache_read_input_tokens: -100, cache_creation_input_tokens: 200 };
  const second = withTurn(first, { reading: {}, tokens: bad, now: NOW + 5000, model: "model-a" });

  assert.deepEqual(second.cache, first.cache);
});

test("a context reading with no token count keeps the last count for the same window", () => {
  const first = withMeasure(EMPTY, { context: { tokens: 60_000, window: 200_000 } });

  assert.deepEqual(withMeasure(first, { context: { window: 200_000 } }).context, first.context);
  assert.deepEqual(withMeasure(first, { context: { window: 1_000_000 } }).context, { window: 1_000_000 });
  assert.deepEqual(withMeasure(EMPTY, { context: { window: 200_000 } }).context, { window: 200_000 });
});

test("a mark from a 5-hour window that has ended gives no 5-hour share", () => {
  const started = withStart(EMPTY, reading(10, 60_000, 1));
  const later = {
    ...reading(20, 80_000, 2),
    rateLimits: [{ kind: "five_hour", percentUsed: 20, resetsAt: "2026-11-13T17:00:00Z" }]
  };
  const view = withTurn(started, { reading: later, tokens, now: Date.parse(RESET) + 60_000, model: null });

  assert.equal(view.last?.fiveHourPoints, null);
  assert.equal(view.last?.usd, 1);
});

test("a negative context percentage is left out", () => {
  const view = withMeasure(EMPTY, { context: { tokens: 184_000, window: 200_000, percent: -1 } });

  assert.deepEqual(view.context, { tokens: 184_000, window: 200_000 });
});

test("a turn with token counts of zero keeps the cache of the turn before", () => {
  const first = withCompact(
    withTurn(EMPTY, { reading: reading(34, 60_000, 1.5), tokens, now: NOW, model: "model-a" })
  );
  const zero = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const second = withTurn(first, { reading: {}, tokens: zero, now: NOW + 5000, model: "model-a" });

  assert.equal(second.cache, null);
  assert.equal(second.isCompacted, true);
});

test("an answer with no limits clears the limits that another session saved", () => {
  const saved = { limits: [{ kind: "five_hour", percentUsed: 10, resetsAt: RESET }] };
  const started = withStart(withSaved(EMPTY, saved, NOW), { rateLimits: [] });
  const answered = withTurn(started, { reading: { rateLimits: [] }, tokens, now: NOW, model: null });
  const interrupted = withTurn(started, { reading: { rateLimits: [] }, tokens: null, now: NOW, model: null });

  assert.equal(started.limits.length, 1);
  assert.deepEqual(answered.limits, []);
  assert.equal(interrupted.limits.length, 1);
});

test("a compaction starts the pace again and keeps the chart's history", () => {
  let view: View = EMPTY;
  for (const count of [40_000, 60_000, 80_000]) {
    view = withTurn(view, { reading: reading(34, count, 1), tokens, now: NOW, model: null });
  }
  const after = withTurn(withCompact(view), { reading: reading(34, 90_000, 1), tokens, now: NOW, model: null });
  const measured = withMeasure(view, { context: { tokens: 30_000, window: 200_000 } });

  assert.deepEqual(view.pace, [40_000, 60_000, 80_000]);
  assert.deepEqual(after.pace, [90_000]);
  assert.deepEqual(after.history, [40_000, 60_000, 80_000, 90_000]);
  assert.deepEqual(measured.pace, []);
});

test("a turn that brings no count of its own adds no point to the pace or the chart", () => {
  const before = withCompact(withTurn(EMPTY, { reading: reading(34, 80_000, 1), tokens, now: NOW, model: null }));
  const noReading = withTurn(before, { reading: {}, tokens, now: NOW, model: null });
  const interrupted = withTurn(before, { reading: reading(34, 80_000, 1), tokens: null, now: NOW, model: null });

  assert.deepEqual(noReading.pace, []);
  assert.deepEqual(noReading.history, [80_000]);
  assert.deepEqual(interrupted.pace, []);
  assert.deepEqual(interrupted.history, [80_000]);
});

test("an answer with an absent or wrong list of limits keeps the limits", () => {
  const saved = { limits: [{ kind: "five_hour", percentUsed: 10, resetsAt: RESET }] };
  const started = withStart(withSaved(EMPTY, saved, NOW), { rateLimits: [] });

  for (const rateLimits of [undefined, "none", [{ kind: 5 }]]) {
    const answered = withTurn(started, { reading: { rateLimits }, tokens, now: NOW, model: null });
    assert.equal(answered.limits.length, 1);
  }
});