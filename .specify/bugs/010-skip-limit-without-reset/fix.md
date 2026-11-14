# Bug Fix: The mod saves a limit that has no reset time

- **Slug**: 010-skip-limit-without-reset
- **Fixed**: 2026-11-14
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`follow` now saves only the limits whose reset time is a date, because a new session shows no
other.
A reading that is already saved stays when the view has only limits with no reset time. The view
and the band do not change.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `plugins/runway/hooks/runway.ts` | modified | `follow`: filters the limits to save, and deletes only when the view has no limit at all |
| `plugins/runway/tests/runway.test.ts` | added tests | 7 new hooks tests, and store checks in 2 existing tests |
| `docs/configuration.md` | modified | The row for the latest limits reading |
| `docs/architecture.md` | modified | The line of the sequence diagram that says what a measure saves (review round 3) |
| `plugins/runway/CHANGELOG.md` | modified | Entry `### 0.1.2` |
| `package.json`, `package-lock.json`, `plugins/runway/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | modified | Version 0.1.2, by `npm run bump-version -- 0.1.2` |

## Diff Highlights (optional)

```ts
const lasting = limits.filter((limit) => !Number.isNaN(Date.parse(limit.resetsAt ?? "")));
if (lasting.length > 0) {
  await $.store.set(SAVED_LIMITS, { limits: lasting });
} else if (limits.length === 0 && had) {
  await $.store.delete(SAVED_LIMITS);
}
```

## Tests Added or Updated

All in `plugins/runway/tests/runway.test.ts`:

- "an answer saves its limits that have a reset time": the store holds the reading after an answer.
- "an answer whose limits have no reset time shows them and saves no reading": the band shows the
  limit, the store has no `limits` record, and no delete call is made.
- "an answer whose limit has a reset time that is not a date saves no reading": the same for a
  reset time that is a string but not a date (review round 1).
- "a measure whose limits have no reset time saves no reading": the same through `session.measure`.
- "of an answer's limits, only those with a reset time are saved": a mixed reading; the band shows
  both limits, and the store holds one.
- "an answer whose limits have no reset time keeps the reading that another session saved": the
  saved reading stays as it was, with no delete call.
- "a session that starts with limits with no reset time keeps the reading that another session
  saved": the same when the first reading of the session has no reset time.
- "limits that left the account leave the band and the saved reading" and "an answer on an account
  with no limits drops the limits that another session saved": each now also checks that the store
  has no `limits` record.

## Local Verification

- Commands run:
  - `npm run build` → no errors
  - `npm test` → 244 passed, 0 failed, 10 skipped
  - `npm run check-version` → all version files match 0.1.2
  - `claude plugin validate plugins/runway` → Validation passed
  - `claude plugin test plugins/runway` → 33 passed, 0 failed
- Manual checks: none. The band in a real session is step 3 of the release run, after the merge.

## Deviations from Assessment

- 2026-11-14, review round 1. The assessment says that `typeof limit.resetsAt === "string"` is the
  same test that `withSaved` uses. That is wrong: `withSaved` also needs
  `Date.parse(limit.resetsAt) > now`. A reset time that is a string but not a date can never be
  shown from the saved reading either. `follow` now saves a limit only when its reset time is a
  date: `!Number.isNaN(Date.parse(limit.resetsAt ?? ""))`. New hooks test: "an answer whose limit
  has a reset time that is not a date saves no reading". `follow` still saves a limit whose reset
  time has passed, as on `main`: it has no clock reading, the next answer replaces the record, and
  the start of a session deletes a record with no limit left (#7).
- 2026-11-14, review round 1. The `CHANGELOG.md` entry said "The band shows the same as before".
  That holds for the session's own limits. A new session can show a saved reading that stayed, so
  the entry and the row in `docs/configuration.md` now say that a saved reading stays.
- 2026-11-14, review round 3. The assessment does not list `docs/architecture.md`. Its sequence
  diagram said that a measure saves the limits; the line now says which limits are saved.

## Follow-ups

- None.
