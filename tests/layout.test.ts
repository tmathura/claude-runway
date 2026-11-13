import test from "node:test";
import assert from "node:assert/strict";

import { arrange, describe, width } from "../plugins/runway/hooks/lib/layout";
import { EMPTY } from "../plugins/runway/hooks/lib/view";
import type { Part, View } from "../plugins/runway/hooks/lib/view";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-13T10:00:00Z");

const at = (ms: number) => new Date(NOW + ms).toISOString();
const ids = (parts: Part[]) => parts.map((part) => part.id);
const facts = { now: NOW, model: "model-a", isWorking: false };

const FULL: View = {
  limits: [
    { kind: "five_hour", percentUsed: 34, resetsAt: at(2.5 * HOUR) },
    { kind: "seven_day", percentUsed: 20, resetsAt: at(5 * DAY) }
  ],
  context: { tokens: 60_000, window: 200_000 },
  history: [60_000],
  pace: [60_000],
  cache: { at: NOW - 8 * MINUTE, read: 9500, written: 300, fresh: 200, model: "model-a" },
  isCompacted: false,
  usd: 41.07,
  mark: null,
  last: null,
  agents: { running: 2, total: 2 }
};

test("a view with no reading has no part", () => {
  assert.deepEqual(describe(EMPTY, facts), []);
  assert.deepEqual(arrange(describe(EMPTY, facts), 80), []);
});

test("a full view has every part, in the calm order", () => {
  assert.deepEqual(ids(describe(FULL, facts)), ["5h", "7d", "context", "cache", "cost", "agents"]);
});

test("an account with no limits still gets the other parts", () => {
  const view: View = { ...FULL, limits: [] };

  assert.deepEqual(ids(describe(view, facts)), ["context", "cache", "cost", "agents"]);
});

test("an unknown window does not take the place of a known one", () => {
  const view: View = { ...FULL, limits: [{ kind: "spend_limit", percentUsed: 50 }] };

  assert.deepEqual(ids(describe(view, facts)), ["context", "cache", "cost", "agents"]);
});

test("only a 5-hour or a 7-day window marks a subscription", () => {
  const text = (view: View) =>
    describe(view, facts)
      .find((part) => part.id === "cost")
      ?.runs.map((run) => run.text)
      .join("");

  assert.equal(text(FULL), "≈ $41.07");
  assert.equal(text({ ...FULL, limits: [{ kind: "spend_limit", percentUsed: 50 }] }), "$41.07");
  assert.equal(text({ ...FULL, limits: [] }), "$41.07");
});

test("the most urgent part comes first", () => {
  const view: View = {
    ...FULL,
    context: { tokens: 150_000, window: 200_000 },
    cache: { at: NOW - 61 * MINUTE, read: 9500, written: 300, fresh: 200, model: "model-a" }
  };

  assert.deepEqual(ids(arrange(describe(view, facts))), ["cache", "context", "5h", "7d", "cost", "agents"]);
});

test("a narrow row drops whole parts, the least urgent first", () => {
  const parts = describe(FULL, facts);
  const row = arrange(parts, 60);

  assert.ok(width(row) <= 60);
  assert.deepEqual(ids(row), ["5h", "7d", "context"]);
  for (const part of row) {
    assert.deepEqual(part, parts.find((whole) => whole.id === part.id));
  }
});

test("a narrow row keeps an alert and drops the calm parts", () => {
  const view: View = {
    ...FULL,
    cache: { at: NOW - 61 * MINUTE, read: 9500, written: 300, fresh: 200, model: "model-a" }
  };

  assert.deepEqual(ids(arrange(describe(view, facts), 30)), ["cache"]);
});

test("a row too narrow for any part is empty", () => {
  assert.deepEqual(arrange(describe(FULL, facts), 5), []);
});

test("a row with no width given keeps every part", () => {
  assert.equal(arrange(describe(FULL, facts)).length, 6);
  assert.equal(arrange(describe(FULL, facts), Number.NaN).length, 6);
});

test("the width counts the separators between the parts", () => {
  const parts: Part[] = [
    { id: "5h", tone: "calm", runs: [{ text: "ab", style: "plain" }] },
    { id: "7d", tone: "calm", runs: [{ text: "c", style: "plain" }, { text: "≈▰", style: "dim" }] }
  ];

  assert.equal(width(parts), 8);
  assert.equal(width([]), 0);
});
