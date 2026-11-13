import test from "node:test";
import assert from "node:assert/strict";

import { agentsPart, costPart } from "../plugins/runway/hooks/lib/meters";
import type { Part } from "../plugins/runway/hooks/lib/view";

const text = (part: Part | null) => part?.runs.map((run) => run.text).join("");

test("the cost on a subscription is marked as an estimate, with the last turn's share", () => {
  const part = costPart(41.07, { usd: 0.58, fiveHourPoints: 1.5 }, true);

  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "≈ $41.07 (+$0.58 · +1.5% 5h)");
});

test("the cost on an API key is the plain figure", () => {
  assert.equal(text(costPart(3.2, null, false)), "$3.20");
});

test("a last turn too small to show adds nothing", () => {
  assert.equal(text(costPart(3.2, { usd: 0.001, fiveHourPoints: 0.04 }, false)), "$3.20");
  assert.equal(text(costPart(3.2, { usd: null, fiveHourPoints: null }, false)), "$3.20");
});

test("a last turn can show its dollars or its points alone", () => {
  assert.equal(text(costPart(3.2, { usd: 0.5, fiveHourPoints: null }, false)), "$3.20 (+$0.50)");
  assert.equal(text(costPart(3.2, { usd: null, fiveHourPoints: 2 }, true)), "≈ $3.20 (+2.0% 5h)");
});

test("no cost draws no part", () => {
  assert.equal(costPart(null, null, true), null);
  assert.equal(costPart(0, null, true), null);
  assert.equal(costPart(Number.NaN, null, true), null);
});

test("agents that run are counted", () => {
  assert.equal(text(agentsPart({ running: 1, total: 1 })), "1 agent running");
  assert.equal(text(agentsPart({ running: 2, total: 7 })), "2 agents running · 7 total");
});

test("no agent that runs draws no part", () => {
  assert.equal(agentsPart({ running: 0, total: 5 }), null);
  assert.equal(agentsPart({ running: Number.NaN, total: 5 }), null);
});
