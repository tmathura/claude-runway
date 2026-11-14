import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import { SEPARATOR, arrange, describe } from "./lib/layout";
import { EMPTY, withAgents, withClear, withCompact, withMeasure, withSaved, withStart, withTurn } from "./lib/view";
import type { Style, View } from "./lib/view";

// Change the tag when the view's fields change: it declines what an earlier version stored.
const view = atom({ plugin: "runway", key: "view" } as const, EMPTY, { shape: "view-2" });

const SAVED_LIMITS = "limits";
const TICK_MS = 30_000;

const LOOKS: Record<Style, { color?: string; dimColor?: boolean }> = {
  plain: {},
  dim: { dimColor: true },
  good: { color: "success" },
  warn: { color: "warning" },
  alert: { color: "error" }
};

export const register: Register = (on) => {
  let timer: { cancel: () => void } | null = null;

  on("session.start", async ($, e, next) => {
    const usage = await $.session.usage();
    const saved = await $.store.get(SAVED_LIMITS);
    const now = await $.clock.now();
    await update($, view, (before) => withStart(withSaved(before, saved, now), usage));
    await countAgents($);

    timer?.cancel();
    timer = null;
    // A run with no person at the prompt draws no band, and a timer could keep it from ending.
    if (e.isInteractive) {
      // The times in the band go on while nothing else changes, so the clock draws it again.
      timer = $.clock.every(TICK_MS, () => {
        $.ui.invalidate("ui.render");
        void countAgents($).catch(() => {});
      });
    }

    // A saved reading with no limit left in its window can never be shown again. The store is read
    // again first, because another session can have saved a new reading since. The delete comes
    // last: if it fails, the view and the timer already stand.
    if (isSpent(saved, now) && isSpent(await $.store.get(SAVED_LIMITS), now)) {
      await $.store.delete(SAVED_LIMITS);
    }

    return next(e);
  });

  on("session.end", async ($, e, next) => {
    // After /clear or a resume the process goes on with a new conversation, and no session.start
    // comes for it: the timer must go on, and the old conversation's figures must go.
    if (e.reason === "clear" || e.reason === "resume") {
      await update($, view, withClear);
    } else {
      timer?.cancel();
      timer = null;
    }

    return next(e);
  });

  on("session.measure", async ($, e, next) => {
    await follow($, (before) => withMeasure(before, e));

    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    // A subagent's turn is not a prompt of the main thread: it changes the agents count only.
    if (e.agentId === undefined) {
      const usage = await $.session.usage();
      const model = await $.session.model();
      const now = await $.clock.now();
      await follow($, (before) => withTurn(before, { reading: usage, tokens: e.usage ?? null, now, model }));
    }
    await countAgents($);

    return next(e);
  });

  on("session.compact", async ($, e, next) => {
    const result = await next(e);
    // A compaction made ahead of time changes nothing yet, and one that was skipped never does.
    if (e.agentId === undefined && e.trigger !== "precompute" && result.messages) {
      await update($, view, withCompact);
    }

    return result;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e);
    }

    const now = await $.clock.now();
    const model = await $.session.model().catch(() => null);
    const facts = { now, model, isWorking: e.props.isWorking };
    const parts = arrange(describe(await read($, view), facts), e.props.bodyColumns);
    if (parts.length === 0) {
      return next(e);
    }

    const { Box, Text } = $.ui.resolve(e);
    const row = parts.flatMap((part, index) => [
      ...(index > 0 ? [Text({ dimColor: true, children: SEPARATOR })] : []),
      ...part.runs.map((run) => Text({ ...LOOKS[run.style], children: run.text }))
    ]);

    return Box({ children: row });
  });
};

function isSpent(saved: unknown, now: number) {
  return saved !== undefined && withSaved(EMPTY, saved, now).limits.length === 0;
}

async function countAgents($: EngineInterface) {
  const list = await $.agent.list();
  const before = await read($, view);
  // An idle session has the same agents at every tick: nothing is written for it.
  if (withAgents(before, list) !== before) {
    await update($, view, (now) => withAgents(now, list));
  }
}

// Updates the view, and keeps the saved limits in step: a new session reads them before its own
// first answer brings a reading. They are deleted only when this update took the limits away.
async function follow($: EngineInterface, change: (before: View) => View) {
  const had = (await read($, view)).limits.length > 0;
  await update($, view, change);
  const { limits } = await read($, view);
  if (limits.length > 0) {
    await $.store.set(SAVED_LIMITS, { limits });
  } else if (had) {
    await $.store.delete(SAVED_LIMITS);
  }
}
