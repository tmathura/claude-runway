# Implementation Plan: Show what a session has left in one band above the prompt

**Branch**: `feature/1-session-runway-band` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-session-runway-band/spec.md`

## Summary

A Claude Code mod, `runway`, that draws one row above the prompt. Hooks that only watch keep one view
of the session in `$.state` (research §3, §6). Pure functions turn the view and the time into parts,
order them by urgency and fit them to the width (research §4, §5). The render hook draws the parts
with `Box` and `Text`.

## Technical Context

**Language/Version**: TypeScript, loaded as it is by Claude Code and by Node 22.18 or later
**Primary Dependencies**: none at run time; `typescript` and `@types/node` for the type check
**Storage**: `$.state` for the session's view; `$.store` for the latest limits reading
**Testing**: `node --test` for the pure files; `claude plugin test` for the hooks
**Target Platform**: Claude Code 2.1.323 or later: terminal, desktop app, VS Code; Windows, macOS, Linux
**Project Type**: a Claude Code plugin with one hooks module
**Performance Goals**: a draw makes four calls on `$` (the time, the model, the view, the elements) and no loop over history longer than 8
**Constraints**: watch only; one row; no element outside `Box` and `Text`
**Scale/Scope**: about 500 lines of code and as many of tests

## Constitution Check

| Principle | Status | Proof |
| --- | --- | --- |
| I. Watch only | Met | Every hook ends with `return next(e)`. `claude plugin validate` lists the calls on `$`: clock, session, agent, state, store, ui. A hooks test checks that each event's result is the engine's. |
| II. A missing reading never breaks the band | Met | Each part function returns `null` on a bad reading, with a test for each case. A hook has no `try`: Claude Code skips a hook that fails and runs the rest (research §7). |
| III. Small, own code, no dependencies | Met | No runtime dependency. Two devDependencies, named in the PR. `NOTICE` credits the reference mod for the idea. |
| IV. Every surface, every system | Met | The tree uses `Box` and `Text` only. The hooks test mounts the band on terminal, desktop and vscode. CI runs on three systems. |
| V. Tested, including failure paths | Met | `tests/*.test.ts` and `plugins/runway/tests/runway.test.ts` cover the cases in the spec's Edge Cases, with those added in code review round 1 (research §8). The owner did the release run in a real session (tasks T013). |

No principle is "not met". Re-check after Phase 1: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-session-runway-band/
├── spec.md       # what the band shows
├── research.md   # the decisions and the rejected alternatives
├── plan.md       # this file
└── tasks.md      # the task list
```

### Source Code (repository root)

```text
plugins/runway/
├── .claude-plugin/plugin.json   # manifest; names the state contract
├── CHANGELOG.md                 # one entry per release
├── LICENSE  NOTICE              # an installed copy carries its license and credits
├── README.md                    # what each part of the band means
├── types/index.d.ts             # the $.state contract and the one place the view types are written
├── hooks/
│   ├── hooks.json               # names runway.ts
│   ├── runway.ts                # the hooks: the only file that calls $
│   └── lib/
│       ├── format.ts            # spans of time, token counts, money
│       ├── view.ts              # the view and the functions that update it
│       ├── limits.ts            # the 5h and 7d parts: bar, time left, forecast
│       ├── context.ts           # the context part: chart, change, prompts left
│       ├── cache.ts             # the cache part and its states
│       ├── meters.ts            # the cost part and the agents part
│       └── layout.ts            # order by urgency, fit to the width
└── tests/runway.test.ts         # hooks tests, run by claude plugin test

tests/
├── format.test.ts  limits.test.ts  context.test.ts  cache.test.ts
├── meters.test.ts  layout.test.ts  view.test.ts
├── bump-version.test.mjs        # already there
├── resolve-ts.mjs               # lets Node load the mod's imports, which have no suffix (research §5)
└── claude-code.d.ts             # stand-in for the claude-code module, for tsc (research §5)

tsconfig.json                    # type-checks hooks/lib and tests
```

**Structure Decision**: the marketplace file is at the root and the mod is in `plugins/runway/`, as
the constitution says. The pure files are apart from the hooks file so that Node can test them
without Claude Code (research §5).

## Complexity Tracking

None.
