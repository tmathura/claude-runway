# Bug Assessment: A saved limits reading past its reset time is never deleted

- **Slug**: 007-delete-expired-limits-reading
- **Created**: 2026-11-14
- **Source**: pasted text (GitHub issue #7 of `tmathura/claude-runway`)
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> A saved limits reading whose reset time has passed can stay in the mod's storage with no end.
>
> - At the start of a session, `withSaved` (`plugins/runway/hooks/lib/view.ts:149`) leaves out each
>   saved limit whose reset time has passed. The view then has no limits.
> - `follow` (`plugins/runway/hooks/runway.ts:122`) deletes the saved reading only when the view had
>   limits before the update (line 128). The view had none, so nothing is deleted.
> - On an account that has no usage limits, no new reading replaces the old one. The record stays
>   under the key `limits` in `$.store`.
>
> The record holds a window name, a share used and a reset time only. It is never shown, because its
> reset time has passed. `docs/configuration.md` ("What the mod keeps") says that such a reading can
> stay. CodeRabbit found this in the review of PR #6.

The issue asks for this:

- Delete the saved reading at the start of a session when no saved limit is still in its window.
- Keep a saved reading that has one or more limits still in their window.
- Do not change what the band shows.
- Do not add a network request, a file read or a file write.
- Update the row for the saved reading in `docs/configuration.md`.
- The change is a patch release, with its `CHANGELOG.md` entry.

## Symptom

A session starts with a saved reading in `$.store` (key `limits`) whose limits are all past their
reset time. The band shows no limits, which is correct, but the record stays in storage. It must be
deleted, so that storage holds only a reading that can still be shown.

## Reproduction

1. Put a reading in the store under `limits`, with one limit whose `resetsAt` is in the past.
2. Start a session on an account that reports no limits (`rateLimits: []`).
3. Read `$.store.get("limits")`. It still returns the old record. Later turns do not delete it.

The code shows this without a run: see "Root Cause Hypothesis".

## Suspected Code Paths

- `plugins/runway/hooks/runway.ts:25-29` — the `session.start` hook reads the saved reading and
  the time, and passes them to `withSaved`. It never writes to the store.
- `plugins/runway/hooks/lib/view.ts:149-159` — `withSaved` leaves out each saved limit whose reset
  time is not ahead of `now`. It is pure, so it cannot delete the record.
- `plugins/runway/hooks/runway.ts:122-131` — `follow` deletes the saved reading only when the view
  had limits before the update (`had`). A view that started with no limits never meets this.

## Root Cause Hypothesis

The start of a session filters the saved reading for the view, but no code compares the result
with what is stored. `follow` is the only place that deletes, and it deletes only on a change from
"limits" to "no limits" in the view. A view that never had limits makes no such change. So a
record with no limit left in its window stays until a new reading replaces it, and on an account
with no limits that never happens. Confidence: high.

## Proposed Remediation

**Preferred**: In the `session.start` hook of `plugins/runway/hooks/runway.ts`, as its last step
before `return next(e)`, delete the saved reading when a record is stored (`saved !== undefined`)
and `withSaved(EMPTY, saved, now).limits` is empty. This uses the saved reading and the time that the
hook has already read, and the same rule that decides what the band shows, so the two cannot
disagree. `EMPTY` is used, not the session's view, so the answer depends only on the record: a view
that already has limits makes `withSaved` return early. `view.ts` does not change.

A stored value that is not a reading (not an object, or with no usable limit) gives an empty list
too, so it is deleted. It can never be shown.

The delete is the last step, after the view, the agents count and the timer, so a delete that
fails costs the session nothing. The hook has no `try` around the call: Claude Code skips a hook
whose call on `$` fails, runs the rest of the chain and names the mod in the debug log
(`specs/001-session-runway-band/research.md`, §7). The record then stays, and the next start tries
again.

**Alternatives**:

- Send the start through `follow`. Rejected: `had` is false for a view with no limits, so the
  record would still stay, and a valid saved reading would be written back at each start.
- A new pure function in `view.ts` that says whether a saved reading holds. Rejected: it repeats
  what `withSaved(EMPTY, ...)` already gives.

**Files likely to change**:

- `plugins/runway/hooks/runway.ts`
- `plugins/runway/tests/runway.test.ts`
- `docs/configuration.md`
- `plugins/runway/CHANGELOG.md` and the version files (patch release 0.1.1)

**Tests to add or update** (hooks tests, with the mock clock and the mock store):

- A session that starts with a saved reading whose limits are all past their reset time: the band
  shows nothing, and `limits` is gone from the store.
- A session that starts with a saved reading that has one limit past its reset time and one still
  in its window: the band shows the limit in its window, and the record stays as it was.
- A reset time equal to `now` counts as passed.
- A start with nothing stored deletes nothing and does not fail.
- A stored value of the wrong form (not an object, or a limit with no reset time) is deleted, and
  the band shows nothing.
- A saved reading with a window name the mod does not know and a share of zero, whose reset time
  is ahead, stays in the store.
- A delete that fails: the session still has its band and its timer, and the event still ends.
- A session whose own first reading has limits, with a saved reading past its reset time: the
  record is deleted, and the band shows the session's own limits.

## Risks & Considerations

- The band does not change: the view is built as before, and the delete comes after it.
- The delete is one more call to `$.store` at the start, only when a record with no limit left is
  stored. It adds no network request and no file access by the mod itself.
- A session on an account with limits that starts with an old record deletes it, and its first
  answer saves a new one through `follow`. Nothing is lost: the old record could not be shown.

## Open Questions

None.

## Constitution Check

| Principle | State | Proof |
| --- | --- | --- |
| I. Watch only | met | The hook still returns `next(e)` unchanged. The change only deletes the mod's own record of numbers, times and window names. It keeps nothing new. |
| II. A missing reading never breaks the band | met | Nothing stored, or a stored value of the wrong form, does not throw: `withSaved` already handles both. Hooks tests cover a start with nothing stored. `claude plugin validate` must pass. |
| III. Small, own code, no dependencies | met | A few lines in one hook. No dependency, no new part, option or layer. |
| IV. Every surface, every system | not relevant | The band's tree and its width rule do not change. |
| V. Tested, including failure paths | met | Hooks tests for a reset time in the past, a reset time equal to now, a mixed reading, no reading, a stored value of the wrong form, an unknown window name with a share of zero, and a delete that fails. The release run follows the merge. |
| Versioning | met | Patch release 0.1.1 with its `CHANGELOG.md` entry; `npm run check-version` must pass. |
