import { expect, mock, test } from "claude-code/testing";
import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = Date.parse("2026-11-13T10:00:00Z");
const RESET = new Date(NOW + 2.5 * HOUR).toISOString();

const SURFACES = ["terminal", "desktop", "vscode"] as const;

const usage = (percentUsed: number, tokens: number, usd: number) => ({
  startedAt: NOW,
  context: { tokens, window: 200_000, percent: (tokens / 200_000) * 100 },
  rateLimits: [{ kind: "five_hour", percentUsed, resetsAt: RESET }],
  cost: { usd }
});
const NOTHING = { startedAt: NOW, context: { window: 200_000 }, rateLimits: [] };

const TURN = {
  turnId: "t1",
  answer: "done",
  durationMs: 1000,
  isAborted: false,
  reason: "answer",
  usage: { model: "api-model-a", input_tokens: 200, output_tokens: 50, cache_read_input_tokens: 9500, cache_creation_input_tokens: 300 }
};

const band = (bodyColumns: number, isWorking = false) => ({
  plugin: "runway",
  component: "AbovePrompt",
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking,
    maxRows: 10,
    bodyColumns,
    scroll: { offset: 0, bodyRows: 10 }
  }
});

// Each hook here stands for Claude Code: it answers what the mod asks and ends each event.
// The store is a Map of the test's own, so that a test can read what the mod left in it.
function world(on: On, readings: unknown[], saved: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: NOW });
  const store = new Map(Object.entries(saved));
  // beforeRead gets the number of the read, so a test can change the store between two reads.
  const it = { clock, store, isReadOnly: false, reads: 0, deletes: 0, beforeRead: (_read: number) => {} };
  on("store.get", (_, e) => {
    it.beforeRead(++it.reads);
    return { value: store.get(e.key) } as never;
  });
  on("store.set", (_, e) => ({ value: void store.set(e.key, e.value) }) as never);
  on("store.delete", (_, e) => {
    it.deletes += 1;
    if (it.isReadOnly) {
      throw new Error("the store is read-only");
    }
    return { value: void store.delete(e.key) } as never;
  });
  let asked = 0;
  on("session.usage", () => ({ value: readings[Math.min(asked++, readings.length - 1)] }) as never);
  on("session.model", () => ({ value: "model-a" }) as never);
  on("agent.list", () => ({ value: [] }) as never);
  on("session.start", (_, e) => ({ cwd: e.cwd }) as never);
  on("session.measure", (_, e) => ({ changed: e.changed }));
  on("turn.complete", () => ({ text: "done" }) as never);
  on("session.end", (_, e) => ({ sessionId: e.sessionId }) as never);

  return it;
}

const END = { sessionId: "s1", resume: {} };

const START = { cwd: "/", surface: "terminal", isInteractive: true } as never;

async function shown($: Engine, surface: (typeof SURFACES)[number], bodyColumns = 120) {
  const ui = await $.ui.mount({ ...band(bodyColumns), surface } as never);
  const texts = await ui.findAll({ type: "Text" });
  await ui.unmount();

  return texts.map((text) => text.text).join("");
}

test("the band shows every part with a reading, on every surface", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  await $.session.start(START);
  await $.turn.complete(TURN as never);

  for (const surface of SURFACES) {
    expect(await shown($, surface)).toBe(
      "5h ▰▰▰▱▱▱▱▱ 36% 2h30m │ ctx 80k 40% │ cache 1h │ ≈ $2.08 (+$0.58 · +1.5% 5h)"
    );
  }
});

test("with no reading the mod draws nothing of its own", async ($, on) => {
  const it = world(on, [NOTHING]);
  await $.session.start(START);

  for (const surface of SURFACES) {
    expect(await shown($, surface)).toBe("");
  }
  expect(it.store.size).toBe(0);
  expect(it.deletes).toBe(0);
});

test("a narrow band drops whole parts", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  await $.session.start(START);
  await $.turn.complete(TURN as never);

  expect(await shown($, "terminal", 30)).toBe("5h ▰▰▰▱▱▱▱▱ 36% 2h30m");
  expect(await shown($, "terminal", 10)).toBe("");
});

test("the times move with the clock", async ($, on) => {
  const { clock } = world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  await $.session.start(START);
  await $.turn.complete(TURN as never);
  await clock.advance(55 * MINUTE);

  const row = await shown($, "terminal");
  expect(row).toContain("cache 5m");
  expect(row).toContain("1h35m");
});

test("a measure updates the band and is passed on unchanged", async ($, on) => {
  world(on, [NOTHING]);
  await $.session.start(START);

  const result = await $.session.measure({
    context: { tokens: 150_000, window: 200_000, percent: 75 },
    rateLimits: [{ kind: "seven_day", percentUsed: 12, resetsAt: new Date(NOW + 100 * HOUR).toISOString() }],
    changed: ["context", "rateLimits"]
  } as never);

  expect(result).toEqual({ changed: ["context", "rateLimits"] });
  expect(await shown($, "terminal")).toBe("ctx 150k 75% │ 7d ▰▱▱▱▱▱▱▱ 12% 4d4h");
});

test("a turn is passed on unchanged, and a subagent's turn is not a prompt", async ($, on) => {
  world(on, [NOTHING, usage(35.5, 80_000, 2.08)]);
  await $.session.start(START);

  const result = await $.turn.complete({ ...TURN, agentId: "a1" } as never);

  expect(result).toMatchObject({ text: "done" });
  expect(await shown($, "terminal")).toBe("");
});

test("a new session shows the limits that another session saved", async ($, on) => {
  const saved = { at: NOW, limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: RESET }] };
  world(on, [NOTHING], { limits: saved });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("5h ▰▰▰▱▱▱▱▱ 34% 2h30m");
});

test("a saved reading whose reset time has passed is not shown, and is deleted", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const { store } = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: old }] } });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("");
  expect(store.has("limits")).toBe(false);
});

test("a saved reading whose reset time is now counts as passed", async ($, on) => {
  const { store } = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: new Date(NOW).toISOString() }] } });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("");
  expect(store.has("limits")).toBe(false);
});

test("a saved reading with one limit still in its window stays, and that limit shows", async ($, on) => {
  const saved = {
    limits: [
      { kind: "five_hour", percentUsed: 34, resetsAt: new Date(NOW - MINUTE).toISOString() },
      { kind: "seven_day", percentUsed: 12, resetsAt: new Date(NOW + 100 * HOUR).toISOString() }
    ]
  };
  const { store } = world(on, [NOTHING], { limits: saved });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("7d ▰▱▱▱▱▱▱▱ 12% 4d4h");
  expect(store.get("limits")).toEqual(saved);
});

test("a saved reading of a window the mod does not know, with nothing used, stays while its reset is ahead", async ($, on) => {
  const saved = { limits: [{ kind: "one_minute", percentUsed: 0, resetsAt: RESET }] };
  const { store } = world(on, [NOTHING], { limits: saved });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("");
  expect(store.get("limits")).toEqual(saved);
});

test("a stored value that is not a reading is deleted", async ($, on) => {
  const { store } = world(on, [NOTHING], { limits: "none", other: { limits: [{ kind: "five_hour", percentUsed: 34 }] } });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("");
  expect([...store.keys()]).toEqual(["other"]);
});

test("a saved limit with no reset time is deleted", async ($, on) => {
  const { store } = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34 }] } });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("");
  expect(store.size).toBe(0);
});

test("a session with its own limits deletes a saved reading whose reset time has passed", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const { store } = world(on, [usage(34, 60_000, 1.5)], { limits: { limits: [{ kind: "seven_day", percentUsed: 80, resetsAt: old }] } });
  await $.session.start(START);

  expect(await shown($, "terminal")).toBe("5h ▰▰▰▱▱▱▱▱ 34% 2h30m │ ctx 60k 30% │ ≈ $1.50");
  expect(store.has("limits")).toBe(false);
});

test("a reading that another session saves during the start is not deleted", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const fresh = { limits: [{ kind: "five_hour", percentUsed: 50, resetsAt: RESET }] };
  const it = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: old }] } });
  it.beforeRead = (read) => void (read === 2 && it.store.set("limits", fresh));
  await $.session.start(START);

  expect(it.reads).toBe(2);
  expect(it.store.get("limits")).toEqual(fresh);
  expect(it.deletes).toBe(0);
});

test("a reading that another session deletes during the start needs no delete", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const it = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: old }] } });
  it.beforeRead = (read) => void (read === 2 && it.store.delete("limits"));
  await $.session.start(START);

  expect(it.reads).toBe(2);
  expect(it.deletes).toBe(0);
});

test("a reading with no limit left that another session saves during the start is deleted too", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const it = world(on, [NOTHING], { limits: { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: old }] } });
  it.beforeRead = (read) =>
    void (read === 2 && it.store.set("limits", { limits: [{ kind: "seven_day", percentUsed: 80, resetsAt: old }] }));
  await $.session.start(START);

  expect(it.store.has("limits")).toBe(false);
  expect(it.deletes).toBe(1);
});

test("a delete that fails leaves the band and the timer, and the start still ends", async ($, on) => {
  const old = new Date(NOW - MINUTE).toISOString();
  const it = world(on, [usage(34, 60_000, 1.5)], { limits: { limits: [{ kind: "seven_day", percentUsed: 80, resetsAt: old }] } });
  const { clock, store } = it;
  it.isReadOnly = true;
  let draws = 0;
  on("ui.invalidate", () => {
    draws += 1;
    return { value: undefined } as never;
  });

  const result = await $.session.start(START);
  expect(result).toMatchObject({ cwd: "/" });
  expect(await shown($, "terminal")).toBe("5h ▰▰▰▱▱▱▱▱ 34% 2h30m │ ctx 60k 30% │ ≈ $1.50");

  await clock.advance(MINUTE);
  expect(draws).toBeGreaterThan(0);
  expect(store.has("limits")).toBe(true);
});

test("limits that left the account leave the band and the saved reading", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5)]);
  await $.session.start(START);
  await $.session.measure({
    context: { tokens: 60_000, window: 200_000, percent: 30 },
    rateLimits: [],
    changed: ["rateLimits"]
  } as never);

  expect(await shown($, "terminal")).toBe("ctx 60k 30% │ $1.50");
});

test("a window the mod does not know draws no part", async ($, on) => {
  world(on, [NOTHING]);
  await $.session.start(START);
  await $.session.measure({
    context: { tokens: 60_000, window: 200_000, percent: 30 },
    rateLimits: [{ kind: "spend_limit", percentUsed: 140 }],
    cost: { usd: 1.5 },
    changed: ["context", "rateLimits", "cost"]
  } as never);

  expect(await shown($, "terminal")).toBe("ctx 60k 30% │ $1.50");
});

test("a survey takes the band", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5)]);
  await $.session.start(START);

  const ui = await $.ui.mount({
    ...band(120),
    props: { ...band(120).props, hasSurvey: true },
    surface: "terminal"
  } as never);
  expect(await ui.find({ type: "Text" })).toBeUndefined();
  await ui.unmount();
});

test("a compaction of the main thread shows on the cache part", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  const messages = [{ role: "user", text: "summary", toolUses: [] }];
  on("session.compact", (_, e) => (e.trigger === "auto" ? { skip: "no" } : { messages }) as never);
  await $.session.start(START);
  await $.turn.complete(TURN as never);

  const skipped = await $.session.compact({ trigger: "auto", messages } as never);
  expect(skipped).toEqual({ skip: "no" });
  await $.session.compact({ trigger: "precompute", messages } as never);
  await $.session.compact({ trigger: "manual", messages, agentId: "a1" } as never);
  expect(await shown($, "terminal")).toContain("cache 1h");

  const done = await $.session.compact({ trigger: "manual", messages } as never);
  expect(done).toMatchObject({ messages });
  expect(await shown($, "terminal")).toContain("cache compacted");
});

test("after /clear the limits stay, the conversation's figures go and the clock goes on", async ($, on) => {
  const { clock } = world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  let draws = 0;
  on("ui.invalidate", () => {
    draws += 1;
    return { value: undefined } as never;
  });
  await $.session.start(START);
  await $.turn.complete(TURN as never);

  const result = await $.session.end({ ...END, reason: "clear" } as never);
  expect(result).toMatchObject({ sessionId: "s1" });
  expect(await shown($, "terminal")).toBe("5h ▰▰▰▱▱▱▱▱ 36% 2h30m");

  await clock.advance(MINUTE);
  expect(draws).toBeGreaterThan(0);
});

test("a run with no person at the prompt starts no timer", async ($, on) => {
  const { clock } = world(on, [usage(34, 60_000, 1.5)]);
  let draws = 0;
  on("ui.invalidate", () => {
    draws += 1;
    return { value: undefined } as never;
  });
  await $.session.start({ cwd: "/", surface: null, isInteractive: false } as never);
  await clock.advance(5 * MINUTE);

  expect(draws).toBe(0);
});

test("a running turn shows the cache as warm", async ($, on) => {
  world(on, [usage(34, 60_000, 1.5), usage(35.5, 80_000, 2.08)]);
  await $.session.start(START);
  await $.turn.complete(TURN as never);

  const ui = await $.ui.mount({ ...band(120, true), surface: "terminal" } as never);
  expect((await ui.find({ type: "Text", text: /cache/ }))?.text).toBe("cache warm");
  await ui.unmount();
});

test("an answer on an account with no limits drops the limits that another session saved", async ($, on) => {
  const saved = { limits: [{ kind: "five_hour", percentUsed: 34, resetsAt: RESET }] };
  world(on, [NOTHING, { ...NOTHING, context: { tokens: 60_000, window: 200_000 }, cost: { usd: 1.5 } }], { limits: saved });
  await $.session.start(START);
  expect(await shown($, "terminal")).toBe("5h ▰▰▰▱▱▱▱▱ 34% 2h30m");

  await $.turn.complete(TURN as never);

  expect(await shown($, "terminal")).toBe("ctx 60k 30% │ cache 5m │ $1.50");
});
