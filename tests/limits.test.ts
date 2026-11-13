import test from "node:test";
import assert from "node:assert/strict";

import { limitPart } from "../plugins/runway/hooks/lib/limits";
import type { Part } from "../plugins/runway/hooks/lib/view";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-13T10:00:00Z");

const at = (ms: number) => new Date(NOW + ms).toISOString();
const text = (part: Part | null) => part?.runs.map((run) => run.text).join("");

test("a limit under its pace is calm and has no forecast", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 34, resetsAt: at(2.5 * HOUR) }, NOW);

  assert.equal(part?.id, "5h");
  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "5h ▰▰▰▱▱▱▱▱ 34% 2h30m");
});

test("the bar marks the time that passed unused", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 34, resetsAt: at(2.5 * HOUR) }, NOW);

  assert.deepEqual(part?.runs.slice(1, 4), [
    { text: "▰▰▰", style: "plain" },
    { text: "▱", style: "good" },
    { text: "▱▱▱▱", style: "dim" }
  ]);
});

test("a limit ahead of its pace warns and says when it ends", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 60, resetsAt: at(4 * HOUR) }, NOW);

  assert.equal(part?.tone, "warn");
  assert.equal(text(part), "5h ▰▰▰▰▰▱▱▱ 60% 4h ends in 40m");
  assert.deepEqual(part?.runs.slice(1, 4), [
    { text: "▰▰", style: "plain" },
    { text: "▰▰▰", style: "warn" },
    { text: "▱▱▱", style: "dim" }
  ]);
});

test("a 5-hour limit that ends within 30 minutes is an alert", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 80, resetsAt: at(4 * HOUR) }, NOW);

  assert.equal(part?.tone, "alert");
  assert.match(text(part) ?? "", /ends in 15m$/);
});

test("a 7-day limit ahead of its pace warns until one day is left", () => {
  const part = limitPart({ kind: "seven_day", percentUsed: 50, resetsAt: at(5 * DAY) }, NOW);

  assert.equal(part?.id, "7d");
  assert.equal(part?.tone, "warn");
  assert.equal(text(part), "7d ▰▰▰▰▱▱▱▱ 50% 5d ends in 2d");
});

test("a limit that is reached says so and when it resets", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 100, resetsAt: at(40 * MINUTE) }, NOW);

  assert.equal(part?.tone, "alert");
  assert.equal(text(part), "5h ▰▰▰▰▰▰▰▰ 100% reached · resets in 40m");
});

test("a share over 100 is drawn as reached", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 140, resetsAt: at(40 * MINUTE) }, NOW);

  assert.match(text(part) ?? "", / 100% reached/);
});

test("a share just under 100 is not drawn as 100", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 99.6, resetsAt: at(40 * MINUTE) }, NOW);

  assert.match(text(part) ?? "", / 99% /);
});

test("a high share early in the window warns without a forecast", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 95, resetsAt: at(4.75 * HOUR) }, NOW);

  assert.equal(part?.tone, "warn");
  assert.doesNotMatch(text(part) ?? "", /ends in/);
});

test("a limit with no reset time shows its share only", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 34 }, NOW);

  assert.equal(part?.tone, "calm");
  assert.equal(text(part), "5h ▰▰▰▱▱▱▱▱ 34%");
});

test("a share of zero draws an empty bar", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 0, resetsAt: at(2.5 * HOUR) }, NOW);

  assert.equal(text(part), "5h ▱▱▱▱▱▱▱▱ 0% 2h30m");
});

test("a reading with no part to draw", async (t) => {
  await t.test("its reset time has passed", () => {
    assert.equal(limitPart({ kind: "five_hour", percentUsed: 34, resetsAt: at(-MINUTE) }, NOW), null);
  });
  await t.test("its window is not known", () => {
    assert.equal(limitPart({ kind: "spend_limit", percentUsed: 34 }, NOW), null);
    assert.equal(limitPart({ kind: "constructor", percentUsed: 34 }, NOW), null);
  });
  await t.test("its share is not a number", () => {
    assert.equal(limitPart({ kind: "five_hour", percentUsed: Number.NaN }, NOW), null);
  });
  await t.test("its share is negative", () => {
    assert.equal(limitPart({ kind: "five_hour", percentUsed: -3 }, NOW), null);
  });
});

test("a reset time that is not a date is read as no reset time", () => {
  const part = limitPart({ kind: "five_hour", percentUsed: 34, resetsAt: "soon" }, NOW);

  assert.equal(text(part), "5h ▰▰▰▱▱▱▱▱ 34%");
});
