---
description: "Tasks for #1: Show what a session has left in one band above the prompt"
---

# Tasks: Show what a session has left in one band above the prompt

**Input**: Design documents from `specs/001-session-runway-band/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: required by the constitution (Principle V).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Add `typescript` and `@types/node`, `tsconfig.json`, the `build` script and the CI build step; make `npm test` run `tests/*.test.ts` too
- [x] T001b Add `tests/resolve-ts.mjs` and `tests/claude-code.d.ts`, so that Node and `tsc` read the mod's files (research §5, added 2026-11-13)
- [x] T002 Add `plugins/runway/hooks/hooks.json`, `types/index.d.ts` with the view types, and the `types` field in `plugin.json`
- [x] T003 [P] Write `plugins/runway/hooks/lib/format.ts` (time spans, token counts, money) with `tests/format.test.ts`
- [x] T004 Write `plugins/runway/hooks/lib/view.ts` (the updates of the view after a measure, a turn, a compaction and an agents reading) with `tests/view.test.ts`

## Phase 2: User Story 1 - See the usage limits against the clock (Priority: P1)

**Goal**: the 5h and 7d parts, with bar, time left and forecast.
**Independent Test**: `npm test` (`tests/limits.test.ts`).

- [x] T005 [US1] Write `tests/limits.test.ts`: calm, over pace, reached, no reset time, reset in the past, unknown window, bad figures
- [x] T006 [US1] Write `plugins/runway/hooks/lib/limits.ts`

## Phase 3: User Stories 2 and 3 - Context and cache (Priority: P2)

**Goal**: the context part and the cache part.
**Independent Test**: `npm test` (`tests/context.test.ts`, `tests/cache.test.ts`).

- [x] T007 [P] [US2] Write `tests/context.test.ts` and `plugins/runway/hooks/lib/context.ts`
- [x] T008 [P] [US3] Write `tests/cache.test.ts` and `plugins/runway/hooks/lib/cache.ts`

## Phase 4: User Stories 4 and 5 - Cost, agents and the row (Priority: P3, P2)

**Goal**: the cost and agents parts, the order by urgency and the fit to the width.
**Independent Test**: `npm test` (`tests/meters.test.ts`, `tests/layout.test.ts`).

- [x] T009 [P] [US4] Write `tests/meters.test.ts` and `plugins/runway/hooks/lib/meters.ts`
- [x] T010 [US5] Write `tests/layout.test.ts` and `plugins/runway/hooks/lib/layout.ts`

## Phase 5: The hooks

- [x] T011 Write `plugins/runway/hooks/runway.ts`: `session.start`, `session.end`, `session.measure`, `turn.complete`, `session.compact`, `ui.render`
- [x] T012 Write `plugins/runway/tests/runway.test.ts`: the band on terminal, desktop and vscode; nothing drawn with no reading; every event passed on unchanged
- [x] T013 Load the mod in a real session and read the band against `/usage`, `/context` and `/cost`. The owner read the band in a real session on 2026-11-13 and found it right. The copy was from before PR review rounds 3 and 4. It is the release run of the constitution, Principle V.

## Phase 6: Polish

- [x] T014 [P] Write `plugins/runway/README.md` and `plugins/runway/CHANGELOG.md`; rewrite the root `README.md` with the install steps
- [x] T015 Raise the version to 0.1.0 with `npm run bump-version -- 0.1.0`
- [x] T016 Update `CLAUDE.md` (commands, layout) and `docs/conventions.md` where the work changed them
- [x] T017 Run every command in `CLAUDE.md`
- [x] T018 Code review round 1: fix the findings in research §8, with their tests in `tests/view.test.ts`, `tests/layout.test.ts`, `tests/limits.test.ts` and `plugins/runway/tests/runway.test.ts` (added 2026-11-13)
- [x] T019 Add `plugins/runway/LICENSE` and `plugins/runway/NOTICE`, and the section "Runway mod" in `plugins/runway/CHANGELOG.md`, so that an installed copy carries its license and credits, as the owner's other plugin repo does (added 2026-11-13, at the owner's request)
- [x] T020 PR review round 1 (Copilot): fix the findings in research §10, with their tests in `tests/view.test.ts` and `tests/context.test.ts` (added 2026-11-13)
- [x] T021 PR review round 2 (Copilot): no forecast for a count below the last turn's, and no negative percentage, with their tests (added 2026-11-13)
- [x] T022 PR review round 3 (Copilot): no cache reading from a turn with counts of zero, limits cleared by an answer with none, and the `pace` list for the forecast, with their tests (added 2026-11-13)
- [x] T023 PR review round 4 (Copilot): a point for `pace` only from an answer with its own count, and limits cleared only by an empty list, with their tests (added 2026-11-13)
- [x] T024 PR review round 5 (CodeRabbit): the 5-hour mark from the turn's own reading and kept over `/clear`, with their tests, and the wording of the READMEs and the spec (added 2026-11-13)

## Dependencies

- T003 and T004 come before every part (T006 to T010).
- T010 needs the `Part` type from T004.
- T011 needs T004 to T010. T012 and T013 need T011.
