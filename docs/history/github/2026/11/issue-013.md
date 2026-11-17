---
kind: "issue"
number: 13
title: "Show the save of the limits after a turn in the architecture diagram"
state: "open"
state_reason: null
labels: ["documentation"]
author: "tmathura"
created_at: "2026-11-14T23:02:16Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/13"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Notes for the run"]
---

# Issue #13: Show the save of the limits after a turn in the architecture diagram

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:02:16Z, https://github.com/tmathura/claude-runway/issues/13

## Problem

The sequence diagram in `docs/architecture.md` ("What happens in a session") shows the save of the limits only under `session.measure`:

- Line 67, under `session.measure`: "save the limits that can be saved, or delete the saved ones when the limits left the account (configuration.md)".
- Lines 68 and 69, under `turn.complete (main thread)`: only "context, cache counts, model, time".

In the code, both hooks call `follow` (`plugins/runway/hooks/runway.ts:67` and `:78`). So the end of a turn also updates the view's limits and saves or deletes the saved reading. Most hooks tests of the saved reading use this path, for example "an answer saves its limits that have a reset time".

A reader of the diagram concludes that an answer never writes to `$.store`. The code review of PR #12 found this; it was left out of #10 because `main` had the gap before it.

## Expected behaviour

The diagram shows every step that writes the saved limits: after a measure and after the end of a turn of the main thread.

## Solution requirements

- Change only the diagram in `docs/architecture.md`, and any sentence next to it that repeats the gap.
- Do not repeat the rule for which limits are saved: `docs/configuration.md` holds it ("Each fact lives in one file", `docs/conventions.md`).
- Check the other steps of the diagram against `plugins/runway/hooks/runway.ts` while you are there, and correct only what is wrong.
- Change no code.

## Acceptance criteria

- [ ] The `turn.complete` block of the diagram shows the update of the limits and the save or delete of the saved reading.
- [ ] The diagram renders: no `;` in its text, and a Mermaid check or a preview shows no syntax error.
- [ ] The PR says which other steps of the diagram were checked against the code.


## Notes for the run

- Order: no dependency. Docs only, so it is not a release. Planning mode: Claude plan mode.
- #16 also changes this diagram later. Keep this change small, so that #16 can build on it.
