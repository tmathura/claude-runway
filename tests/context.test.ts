import test from "node:test";
import assert from "node:assert/strict";

import { chart, contextPart, promptsLeft } from "../plugins/runway/hooks/lib/context";
import type { Part } from "../plugins/runway/hooks/lib/view";

const text = (part: Part | null) => part?.runs.map((run) => run.text).join("");

test("one turn shows the tokens and the share only", () => {
  const part = contextPart({ tokens: 120_000, window: 200_000 }, [120_000]);

  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "ctx 120k 60%");
});

test("a context that grows shows its chart, its change and the prompts left", () => {
  const history = [40_000, 60_000, 80_000, 100_000, 120_000];
  const part = contextPart({ tokens: 120_000, window: 200_000 }, history);

  assert.equal(text(part), "ctx 120k 60% ▁▃▅▆█ +20k ~4 left");
  assert.equal(part?.tone, "warn");
});

test("the share that Claude Code reports wins over the one worked out", () => {
  const part = contextPart({ tokens: 120_000, window: 200_000, percent: 58 }, []);

  assert.equal(text(part), "ctx 120k 58%");
});

test("a context at 90% of its window is an alert", () => {
  assert.equal(contextPart({ tokens: 184_000, window: 200_000 }, [])?.tone, "alert");
  assert.equal(contextPart({ tokens: 150_000, window: 200_000 }, [])?.tone, "warn");
});

test("a context that does not grow has no forecast", () => {
  const part = contextPart({ tokens: 100_000, window: 200_000 }, [100_000, 100_000, 100_000]);

  assert.equal(text(part), "ctx 100k 50% ▄▄▄ +0");
});

test("a context that shrank shows the drop and no forecast", () => {
  const part = contextPart({ tokens: 30_000, window: 200_000 }, [150_000, 30_000]);

  assert.equal(text(part), "ctx 30k 15% █▁ -120k");
});

test("a forecast of 100 prompts or more is not shown", () => {
  const part = contextPart({ tokens: 3000, window: 200_000 }, [1000, 2000, 3000]);

  assert.doesNotMatch(text(part) ?? "", /left/);
});

test("promptsLeft needs two turns that grew", () => {
  assert.equal(promptsLeft(80_000, []), null);
  assert.equal(promptsLeft(80_000, [100_000, 120_000]), null);
  assert.equal(promptsLeft(80_000, [80_000, 100_000, 120_000]), 4);
  assert.equal(promptsLeft(0, [80_000, 100_000, 120_000]), 0);
  assert.equal(promptsLeft(-5000, [80_000, 100_000, 120_000]), 0);
});

test("promptsLeft reads the last five changes only", () => {
  const history = [0, 90_000, 91_000, 92_000, 93_000, 94_000, 95_000];

  assert.equal(promptsLeft(10_000, history), 10);
});

test("chart draws one level for a flat history", () => {
  assert.equal(chart([5, 5]), "▄▄");
  assert.equal(chart([0, 7]), "▁█");
});

test("a reading with no part to draw", () => {
  assert.equal(contextPart(null, []), null);
  assert.equal(contextPart({ window: 200_000 }, []), null);
  assert.equal(contextPart({ tokens: 10, window: 0 }, []), null);
  assert.equal(contextPart({ tokens: Number.NaN, window: 200_000 }, []), null);
});

test("promptsLeft starts again after the context shrank", () => {
  assert.equal(promptsLeft(170_000, [80_000, 100_000, 120_000, 30_000]), null);
  assert.equal(promptsLeft(150_000, [80_000, 100_000, 120_000, 30_000, 50_000]), null);
  assert.equal(promptsLeft(130_000, [100_000, 120_000, 30_000, 50_000, 70_000]), 6);
});

test("a count below the last turn's shows no forecast", () => {
  const part = contextPart({ tokens: 30_000, window: 200_000 }, [80_000, 100_000, 120_000]);

  assert.equal(part?.tone, "calm");
  assert.doesNotMatch(text(part) ?? "", /left/);
});
