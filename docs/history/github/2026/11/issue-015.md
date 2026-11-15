---
kind: "issue"
number: 15
title: "Save a limits reading only when the event brought a new one"
state: "closed"
state_reason: "not_planned"
labels: ["bug","duplicate"]
author: "tmathura"
created_at: "2026-11-14T23:13:22Z"
updated_at: "2026-11-14T23:39:55Z"
closed_at: "2026-11-14T23:39:55Z"
url: "https://github.com/tmathura/claude-runway/issues/15"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria"]
---

# Issue #15: Save a limits reading only when the event brought a new one

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:13:22Z, https://github.com/tmathura/claude-runway/issues/15

## Problem

A session can replace a newer saved limits reading with its own older one.

State of `main` at bec4a35:

- `follow` (`plugins/runway/hooks/runway.ts:134`) runs after each `session.measure` and after each `turn.complete` of the main thread. It saves the view's limits whenever the view has a limit that can be saved (line 140). It does not check whether this event brought a new reading of the limits.
- The limits that Claude Code gives are "the rate-limit windows the last API response reported" (the type file, `SessionUsage.rateLimits` and `SessionMeasureInput.rateLimits`). They are the last response of this session's own process, so in a session that made no request for some time they are old.
- `withMeasure` (`plugins/runway/hooks/lib/view.ts:129`) puts those limits in the view whenever the list is not empty. `withTurn` calls it for every turn, also for a turn that sent nothing to the model.
- The project already knows that such a turn exists: `.specify/specs/001-session-runway-band/research.md` (round 3) says "A turn whose token counts are all zero ... sent nothing to the model", and `cleanCache` in `view.ts` handles it.

So this can happen:

1. Session A gets an answer at 10:00. Its limits say `five_hour` 34%.
2. Session B works until 11:00 and saves `five_hour` 80%.
3. In session A, a turn ends that sent nothing to the model, or a measure comes with no new response. Claude Code gives A's limits from 10:00. `follow` saves 34% over 80%.
4. A new session C shows `5h 34%` until its own first answer.

The effect is only on the band of a new session before its first answer, and the next real answer of any session corrects it. It is not known how often Claude Code ends a turn or raises a measure with no new response. The code review of PR #12 found the write; it was left out of #10 because `main` behaved so before it.

## Expected behaviour

The mod saves a limits reading only when the event brought a reading of the limits from a new response. A session that made no request does not change the saved reading.

## Solution requirements

- Find a test that says "this event brought a new reading of the limits", from what the mod already gets. Candidates: `e.changed` includes `rateLimits` for a measure; the turn's own token counts are not all zero for a turn (as `cleanCache` tests).
- Say in the plan what happens after a measure whose `changed` has no `rateLimits`: the limits did not move a whole point, so the saved reading is still right to within one point.
- Keep the delete of the saved reading when the limits left the account, and the rule of #10 for which limits are saved.
- Do not change what the band of the session shows.
- Do not add a network request, a file read or a file write, and do not save a time or anything new.
- Update the row for the saved reading in `docs/configuration.md` if its text changes.

## Acceptance criteria

- [ ] After a turn with token counts that are all zero, the saved reading of another session is as it was.
- [ ] After a measure that does not name `rateLimits` in `changed`, the saved reading of another session is as it was.
- [ ] After a turn with a real answer, and after a measure that names `rateLimits`, the reading is saved as today.
- [ ] The band of the session shows the same as before in each of these cases.
- [ ] A hooks test covers each of the first three cases.
- [ ] The change is a patch release, with its `CHANGELOG.md` entry.

***

**Comment** by `tmathura`, 2026-11-14T23:39:52Z, https://github.com/tmathura/claude-runway/issues/15#issuecomment-6886024858

Duplicate of #16. #16 saves the time of the answer with the limits reading, and a session then saves only when its own reading is newer. That gives the guarantee this ticket asks for, and #16 now lists the cases of this ticket in its "Decisions" section.
