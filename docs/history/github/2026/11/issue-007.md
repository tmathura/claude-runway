---
kind: "issue"
number: 7
title: "Delete a saved limits reading when its reset time has passed"
state: "closed"
state_reason: "completed"
labels: ["bug"]
author: "tmathura"
created_at: "2026-11-14T01:08:27Z"
closed_at: "2026-11-14T02:03:02Z"
url: "https://github.com/tmathura/claude-runway/issues/7"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Plan comparison"]
---

# Issue #7: Delete a saved limits reading when its reset time has passed

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T01:08:27Z, https://github.com/tmathura/claude-runway/issues/7

## Problem

A saved limits reading whose reset time has passed can stay in the mod's storage with no end.

- At the start of a session, `withSaved` (`plugins/runway/hooks/lib/view.ts:149`) leaves out each
  saved limit whose reset time has passed. The view then has no limits.
- `follow` (`plugins/runway/hooks/runway.ts:122`) deletes the saved reading only when the view had
  limits before the update (line 128). The view had none, so nothing is deleted.
- On an account that has no usage limits, no new reading replaces the old one. The record stays
  under the key `limits` in `$.store`.

The record holds a window name, a share used and a reset time only. It is never shown, because its
reset time has passed. `docs/configuration.md` ("What the mod keeps") says that such a reading can
stay. CodeRabbit found this in the review of PR #6.

## Expected behaviour

The mod deletes a saved reading when all of its limits are past their reset time. Storage then
holds only a reading that can still be shown.

## Solution requirements

- Delete the saved reading at the start of a session when no saved limit is still in its window.
- Keep a saved reading that has one or more limits still in their window.
- Do not change what the band shows.
- Do not add a network request, a file read or a file write.
- Update the row for the saved reading in `docs/configuration.md`.

## Acceptance criteria

- [ ] A session that starts with a saved reading whose limits are all past their reset time deletes
      that reading from `$.store`.
- [ ] A session that starts with a saved reading that has a limit still in its window keeps the
      reading and shows that limit.
- [ ] A test covers each of the two cases.
- [ ] `docs/configuration.md` no longer says that a reading past its reset time can stay.
- [ ] The change is a patch release, with its `CHANGELOG.md` entry.


## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** the root cause (the start of a session filters the saved reading for
  the view, and `follow` deletes only when the view had limits); the fix in the `session.start`
  hook of `plugins/runway/hooks/runway.ts`; hooks tests that read the store; the row in
  `docs/configuration.md`; the patch release 0.1.1.
- **Where they differ:** Claude first planned a new pure function in `view.ts` that says whether a
  saved reading holds. Codex and Copilot both use `withSaved(EMPTY, saved, now).limits`, which
  gives the same answer with no new function. Copilot names the condition `saved !== undefined`.
  Codex adds tests for a reset time equal to now and for a start with nothing stored.
- **What Claude took:** the `withSaved(EMPTY, saved, now)` check with no change to `view.ts`, the
  `saved !== undefined` condition, and the two extra tests.

Bug notes: .specify/bugs/007-delete-expired-limits-reading/
