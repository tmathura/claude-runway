---
description: "Tasks for #1: Show what a session has left in one band above the prompt"
---

# Tasks: Show what a session has left in one band above the prompt

**Input**: Design documents from `specs/001-session-runway-band/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: required by the constitution (Principle V).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Add `typescript` and `@types/node`, `tsconfig.json`, the `build` script and the CI build step; make `npm test` run `tests/*.test.ts` too
- [ ] T002 Add `plugins/runway/hooks/hooks.json`, `types/index.d.ts` and the `types` field in `plugin.json`
- [ ] T003 [P] Write `plugins/runway/hooks/lib/format.ts` (time spans, token counts, money) with `tests/format.test.ts`
- [ ] T004 Write `plugins/runway/hooks/lib/view.ts` (the view, and its updates after a measure, a turn, a compaction and an agents reading) with `tests/view.test.ts`

## Phase 2: User Story 1 - See the usage limits against the clock (Priority: P1)

**Goal**: the 5h and 7d parts, with bar, time left and forecast.
**Independent Test**: `node --test tests/limits.test.ts`.

- [ ] T005 [US1] Write `tests/limits.test.ts`: calm, over pace, reached, no reset time, reset in the past, unknown window, bad figures
- [ ] T006 [US1] Write `plugins/runway/hooks/lib/limits.ts`

## Phase 3: User Stories 2 and 3 - Context and cache (Priority: P2)

**Goal**: the context part and the cache part.
**Independent Test**: `node --test tests/context.test.ts tests/cache.test.ts`.

- [ ] T007 [P] [US2] Write `tests/context.test.ts` and `plugins/runway/hooks/lib/context.ts`
- [ ] T008 [P] [US3] Write `tests/cache.test.ts` and `plugins/runway/hooks/lib/cache.ts`

## Phase 4: User Stories 4 and 5 - Cost, agents and the row (Priority: P3, P2)

**Goal**: the cost and agents parts, the order by urgency and the fit to the width.
**Independent Test**: `node --test tests/meters.test.ts tests/layout.test.ts`.

- [ ] T009 [P] [US4] Write `tests/meters.test.ts` and `plugins/runway/hooks/lib/meters.ts`
- [ ] T010 [US5] Write `tests/layout.test.ts` and `plugins/runway/hooks/lib/layout.ts`

## Phase 5: The hooks

- [ ] T011 Write `plugins/runway/hooks/runway.ts`: `session.start`, `session.end`, `session.measure`, `turn.complete`, `session.compact`, `ui.render`
- [ ] T012 Write `plugins/runway/tests/runway.test.ts`: the band on terminal, desktop and vscode; nothing drawn with no reading; every event passed on unchanged
- [ ] T013 Load the mod in a real session and read the band

## Phase 6: Polish

- [ ] T014 [P] Write `plugins/runway/README.md` and `plugins/runway/CHANGELOG.md`; rewrite the root `README.md` with the install steps
- [ ] T015 Raise the version to 0.1.0 with `npm run bump-version -- 0.1.0`
- [ ] T016 Update `CLAUDE.md` (commands, layout) and `docs/conventions.md` where the work changed them
- [ ] T017 Run every command in `CLAUDE.md`

## Dependencies

- T003 and T004 come before every part (T006 to T010).
- T010 needs the `Part` type from T004.
- T011 needs T004 to T010. T012 and T013 need T011.
