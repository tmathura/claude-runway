# Research: Show what a session has left in one band above the prompt

Decisions for #1. The owner gave these decisions to the agent on 2026-11-13.

## §1 Name and flavour (2026-11-13)

**Decision**: the repo is `claude-runway`, the mod is `runway`, the marketplace is `tmathura-runway`.
The flavour is "when does it run out?": every part of the band that can run out gives a forecast, the
most urgent part comes first, and a narrow band drops the least urgent parts.

**Rejected**: a weather picture for the context, as the reference mod has. It is that mod's own
mark, and a forecast in plain words says more in less room.

## §2 Scope against the reference mod (2026-11-13)

The reference is `token-weather-usage` in `augiefra/claude-mods` (Apache-2.0). It was read for its
functions only. No code is copied (constitution, Principle III).

| Function of the reference | In this version | Reason |
| --- | --- | --- |
| Context tokens, chart of recent prompts, last change | Yes | |
| 5-hour and 7-day limits against the time passed | Yes | |
| Forecast of when the weekly limit ends | Yes, for both windows | Our flavour |
| Prompt cache countdown, cold, model changed, compacted | Yes | |
| Session cost and the last prompt's share | Yes | |
| Agents that run | Yes, the count | |
| Prompts left before the context is full | Yes, new | Our flavour |
| Most urgent part first, drop parts on a narrow row | Yes, new | Our flavour |
| Dollar figures for a cold cache, from a price table | No | The table goes stale with each price change. The tokens to write again are shown. |
| The one-click approval pill | No | It reads the answer's text and sends a message. Principle I forbids both. |
| French and Russian labels | No | No reader for them yet. |
| Hover cards in the desktop app | No | They need elements that only one surface has (Principle IV). |
| Saved 7-day history, day pill for weekly-only plans | No | The forecast needs only the present reading. |
| Each agent's latest tool | No | The count answers "is something running?". |

## §3 Where each reading comes from (2026-11-13)

| Reading | Source | When |
| --- | --- | --- |
| Limits, context, cost | `session.measure` input; `$.session.usage()` | When a figure moves; at session start and at each main turn's end |
| Cache tokens of the last turn | `turn.complete` input `usage` | Each main turn's end |
| Model | `$.session.model()` | Each main turn's end, and each draw |
| Compaction | `session.compact` with no `agentId` | When it happens |
| Agents | `$.agent.list()` | The session's start, each turn's end, each 30-second tick |
| Time | `$.clock.now()` | Each draw |

**Decision**: the cache reading comes from `turn.complete`, not from `turn.step`.

**Rejected**: a `turn.step` hook, as the reference uses. It gives each request's own counts, but it
is a stream hook that stands in the path of every model request. A hook at the end of the turn is
enough for a countdown, and it cannot slow a request.

**Decision**: the model at the end of the turn and the model at each draw both come from
`$.session.model()`. The id in the turn's usage is the API's own name for the model and can differ
from the session's name, which would show "model changed" when nothing changed.

## §4 States (2026-11-13)

| Part | Warning | Alert |
| --- | --- | --- |
| 5h | The pace reaches 100% before the reset, or 90% is used | 100% is used, or the limit ends in 30 minutes or less |
| 7d | The same | 100% is used, or the limit ends in 24 hours or less |
| Context | 75% of the window, or 10 prompts left or less | 90% of the window, or 3 prompts left or less |
| Cache | One sixth of its life is left (10 minutes of 60), or the model changed | Cold |
| Cost, agents | Never | Never |

## §5 Files and tests (2026-11-13)

**Decision**: TypeScript files that Claude Code and Node both load as they are, with no build
output. The pure logic is in `plugins/runway/hooks/lib/`, with no import from `claude-code`, so that
`node --test` and `tsc` run on it in CI. `plugins/runway/hooks/runway.ts` is the only file that
calls `$`. `claude plugin validate` type-checks it, because the `claude-code` type file is written
by Claude Code on the machine and is not in the repo.

**Rejected**: one `.mjs` file, as the reference has. It cannot be tested without Claude Code.

**Rejected**: a copy of the `claude-code` type file in the repo. It is 17,000 lines that belong to
one build of Claude Code.

**Decision**: two devDependencies, `typescript` and `@types/node`, for the type check only.

**Changed 2026-11-13, while building.** `claude plugin validate` showed three things that the first
plan had wrong:

- The state contract (`plugins/runway/types/index.d.ts`) must be one file with no import. So the
  view types are written there, and `lib/view.ts` imports them. **Rejected**: the types in
  `lib/view.ts`, imported by the contract, as first planned.
- Claude Code reads a local import without a suffix (`./lib/view`), and its type check refuses a
  `.ts` suffix. Node needs the suffix. So the mod's files use no suffix, and
  `tests/resolve-ts.mjs` adds it for Node (10 lines, `registerHooks` from `node:module`).
  **Rejected**: the `.ts` suffix in the mod's files, as first planned; it fills the validation with
  warnings that hide real ones.
- `tsc` reads the contract, which adds to the module `claude-code`. `tests/claude-code.d.ts` is a
  stand-in of two lines for that module, so that the type check runs where Claude Code is not
  installed.

## §6 Storage (2026-11-13)

**Decision**: the view of a session is one value in `$.state`, with a shape tag, so that a reload
keeps it and a later version can decline it. The latest limits reading is also in `$.store` under
the key `limits`, so that a new session shows it at once.

**Changed 2026-11-13 (code review round 1).** The saved reading does not hold the time it was read.
A saved limit is shown only while its own reset time is ahead, and one with no reset time is not
shown. **Rejected**: the saved time, as first planned; nothing read it.

**Rejected**: one `$.state` value per part. One writer and one reader do not need it.

## §7 A hook that fails (2026-11-13, while building)

**Decision**: a hook has no `try` around its body. The pure functions return "no reading" on a bad
figure, so a bad reading cannot make a hook throw. If a call on `$` fails, Claude Code skips that
hook, runs the rest of the chain and names the mod in the debug log.

**Rejected**: one `try` around each hook body, as first planned. It would hide a real fault in the
mod from the debug log, and it protects nothing that Claude Code does not protect already.

## §8 Code review round 1 (2026-11-13)

A reviewer that had not seen the plan read the code against the type file of Claude Code. Each
finding was checked against that file and fixed, with tests.

| Finding | Decision |
| --- | --- |
| After `/clear` or a resume, `session.end` stopped the timer, and no `session.start` comes to start it again | `session.end` with the reason `clear` or `resume` keeps the timer. It resets the view and keeps the limits and the agents, because the conversation is new. Any other reason stops the timer. |
| "cache compacted" was set before the compaction, also for one made ahead of time (`precompute`) and for one that was skipped | The hook reads the result of `next(e)` first. It marks the view only for the main thread, a trigger that is not `precompute`, and a result with messages. |
| Limits were never cleared, so an account with no limits kept the old parts, and any limit counted as a subscription | A measure whose `changed` names `rateLimits` and whose list is empty clears the limits and the saved reading. Only a `five_hour` or `seven_day` window marks a subscription. |
| The first prompt's share of the 5-hour limit was measured from the saved reading of another session | The mark at the start comes from the session's own reading only. |
| The tick's promise had no catch, the redraw waited for the agents list, and an idle session wrote its state every 30 seconds | The tick asks for the redraw first. The agents are written only when the count changed. A failure of the list is ignored. |
| A negative share drew `0%` | A negative share is no reading. |
| A run with no person at the prompt started the timer | The timer starts only when `isInteractive` is true. |
| `~N left` counts to a full window, but Claude Code compacts before that | Kept, and said in the README. Claude Code does not report the point where it compacts. |
