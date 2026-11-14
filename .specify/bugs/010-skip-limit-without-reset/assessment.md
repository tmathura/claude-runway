# Bug Assessment: The mod saves a limit that has no reset time

- **Slug**: 010-skip-limit-without-reset
- **Created**: 2026-11-14
- **Source**: pasted text (GitHub issue #10, "Do not save a limit that has no reset time")
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

The mod saves a limit that it can never show from the saved reading.

- `cleanLimits` (`plugins/runway/hooks/lib/view.ts:54`) keeps a limit that has no `resetsAt`.
- `follow` (`plugins/runway/hooks/runway.ts:133`) saves the whole list of the view's limits under
  the key `limits` in `$.store`.
- `withSaved` (`plugins/runway/hooks/lib/view.ts:149`) leaves out each saved limit that has no
  reset time. So such a limit is saved, but a new session never shows it.
- Since #7, the start of a session deletes a saved reading that has no limit left in its window.
  A reading that holds only limits with no reset time counts as such. So one session saves the
  reading after each answer, and each start of another session deletes it again.

Expected: the saved reading holds only limits that have a reset time. When the view's limits have
none, the mod saves no reading for them. The band of the session that has the limit shows the same
as before. No network request, file read or file write.

The issue also asks the plan to decide what happens to a reading that is already saved when the
view has only limits with no reset time.

## Symptom

After an answer that brings a limit with no reset time, `$.store` holds that limit under the key
`limits`. No session can show it from there, and the next start of another session deletes the
record. Expected: such a limit is never saved.

Nothing wrong shows in the band. The cost is a record with no use, and one delete at each start of
another session.

## Reproduction

1. Start a session. Claude Code answers `$.session.usage()` with
   `rateLimits: [{ kind: "five_hour", percentUsed: 34 }]` (no `resetsAt`).
2. End a turn of the main thread (`turn.complete`), or send a `session.measure` with that list.
3. Read `$.store` at the key `limits`: it holds `{ limits: [{ kind: "five_hour", percentUsed: 34 }] }`.
4. Start a second session: its band shows no `5h` part from the saved reading, and its start
   deletes the record.

It is not known whether Claude Code ever reports a limit with no reset time. The type file allows
it, and the mod accepts it. The hooks tests can give such a reading, so the steps above run there.

## Suspected Code Paths

- `plugins/runway/hooks/runway.ts:133` `follow()`: line 138 saves `{ limits }` with every limit of
  the view, also those with no `resetsAt`.
- `plugins/runway/hooks/lib/view.ts:54` `cleanLimits()`: keeps a limit with no `resetsAt` (line 63
  sets the reset time only when it is a string). This is correct for the view: the band of the
  session that has the limit shows it.
- `plugins/runway/hooks/lib/view.ts:149` `withSaved()`: line 156 takes only saved limits with a
  reset time that is ahead. This is correct: a saved reading with no reset time has no end.
- `plugins/runway/hooks/runway.ts:46` and `isSpent()` (line 118): the start deletes a saved reading
  from which `withSaved` takes no limit. Correct since #7.

## Root Cause Hypothesis

`follow` saves the view's limits as they are. The view may hold a limit with no reset time, but
the saved reading may not: `withSaved` can never give it back. The save has no filter for this.
Confidence: high. The three functions are short, and the hooks tests of #7 already show that a
saved limit with no reset time is deleted at the start.

## Proposed Remediation

**Preferred**: change only `follow` in `plugins/runway/hooks/runway.ts`. A limit "can be saved"
when `typeof limit.resetsAt === "string"`, the same test that `withSaved` uses.

- After the update, take the limits of the view that can be saved. If there is at least one, save
  `{ limits: <those> }`. The view itself is not changed, so the band shows the same.
- If there is none, and the view still has limits (all with no reset time): make no store call.
- If the view has no limit at all: delete the saved reading when the view had limits before the
  update. This is today's rule, unchanged ("deleted only when this update took the limits away").

**Decision the issue asks for: a reading that is already saved, when the view now has only limits
with no reset time.** It is kept. It stays until a reading with a reset time replaces it, until
the limits leave the account, or until its own limits are past their reset time: then no session
shows it (`withSaved`), and the next start of a session deletes it (#7). Reasons:

- It is one rule for every path. The start of a session does not go through `follow`, so a rule
  that deletes in `follow` would leave the same reading in place when the first reading of a
  session already has only limits with no reset time (plan review, round 1).
- The saved reading is the last reading that a new session can show, and its own reset time says
  how long it holds. That is the rule the mod has for every saved reading.
- No new delete, so no new failure path.

**Alternatives**:

- Delete the saved reading when the update took the last limit with a reset time out of the view
  (the first plan). Rejected in plan review round 1: it does not cover the start of a session, and
  it adds a delete whose failure needs its own tests.
- Delete whenever the view had any limit before the update. A session with only limits with no
  reset time would call `$.store.delete` after each answer.
- Filter in `cleanLimits`. Rejected: the band of the session that has the limit must show it.

**Files likely to change**:

- `plugins/runway/hooks/runway.ts` (`follow` and its comment)
- `plugins/runway/tests/runway.test.ts`
- `docs/configuration.md` (the row for the latest limits reading)
- `plugins/runway/CHANGELOG.md`, and the version files through `npm run bump-version -- 0.1.2`

**Tests to add or update** (hooks tests, with the test's own store):

- An answer whose limits all have no reset time: the band shows the limit, and the store holds no
  `limits` record. No delete call is made.
- An answer with one limit with a reset time and one with none: the band shows both, and the saved
  reading holds only the first.
- A saved reading that the session showed, then an answer with only a limit with no reset time:
  the saved reading stays as it was, and no delete call is made.
- A saved reading still in its window, and a session whose first reading (at the start) has only a
  limit with no reset time: the band shows the session's limit, and the saved reading stays.
- The first case again through `session.measure`, which also goes through `follow`.
- Store checks in the existing tests, which today read only the band: an answer with a limit with
  a reset time saves it; limits that leave the account delete the saved reading, through
  `session.measure` and through an answer.

## Risks & Considerations

- Release: patch, 0.1.2. Users see no change in the band.
- The delete in `follow` does not change. A delete there that fails throws from the hook, as on
  `main` today (no `try` around a call on `$`, `research.md` §7 of the first spec).
- A new session can show a saved reading that is older than the account's newest reading, while
  the newest one has only limits with no reset time. It is bounded by the saved limits' own reset
  times.
- No contract, option or state shape changes. `view.ts` does not change.

## Open Questions

- None.

## Constitution Check

| Principle | State | Proof |
| --- | --- | --- |
| I. Watch only | met | The change is inside `follow`. Every hook still returns `next(e)` unchanged; the hooks tests "is passed on unchanged" stay green. The mod keeps less than before, and nothing new. |
| II. A missing reading never breaks the band | met | A limit with no reset time still shows in the band of its session (a new hooks test). A reading with no limits is handled as today. `claude plugin validate` must pass. |
| III. Small, own code, no dependencies | met | One filter and one changed condition in `follow`. No dependency, no new part, option or layer, no new function in `view.ts`. |
| IV. Every surface, every system | not relevant | The band's tree and its width rule do not change. |
| V. Tested, including failure paths | met | Hooks tests for each case under "Tests to add or update". The existing test of a delete that fails stays. The release run follows the merge. |
| Versioning | met | Patch release 0.1.2 with its `CHANGELOG.md` entry; `npm run check-version` must pass. |
