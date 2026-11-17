---
kind: "issue"
number: 10
title: "Do not save a limit that has no reset time"
state: "closed"
state_reason: "completed"
labels: ["bug"]
author: "tmathura"
created_at: "2026-11-14T02:04:49Z"
closed_at: "2026-11-14T09:54:34Z"
url: "https://github.com/tmathura/claude-runway/issues/10"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Plan comparison"]
---

# Issue #10: Do not save a limit that has no reset time

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T02:04:49Z, https://github.com/tmathura/claude-runway/issues/10

## Problem

The mod saves a limit that it can never show from the saved reading.

State of `main` at 8272418:

- `cleanLimits` (`plugins/runway/hooks/lib/view.ts:54`) keeps a limit that has no `resetsAt`
  (line 63 sets the reset time only when it is a string).
- `follow` (`plugins/runway/hooks/runway.ts:133`) saves the whole list of the view's limits under
  the key `limits` in `$.store` (line 138).
- `withSaved` (`plugins/runway/hooks/lib/view.ts:149`) leaves out each saved limit that has no
  reset time (line 156). So such a limit is saved, but a new session never shows it.
- Since #7, the start of a session deletes a saved reading that has no limit left in its window
  (`plugins/runway/hooks/runway.ts:46`). A reading that holds only limits with no reset time
  counts as such. So one session saves the reading after each answer, and each start of another
  session deletes it again.

Nothing wrong shows in the band. The cost is a record in storage that has no use, and one delete
at each start of another session. The code review of PR #9 found this; it was left out of #7
because #7 did not ask to change `follow`.

It is not known whether Claude Code ever reports a limit with no reset time. The type file allows
it, and the mod accepts it.

## Expected behaviour

The saved reading holds only limits that a new session can show: limits that have a reset time.
When the view's limits have none, the mod saves no reading for them.

## Solution requirements

- Do not save a limit that has no reset time.
- Do not change what the band shows in the session that has the limit: a limit with no reset time
  still shows there as it does today.
- Keep the saved reading of limits that have a reset time as it is today.
- Decide and say in the plan what happens to a reading that is already saved when the view has
  only limits with no reset time (keep it until its limits are past their reset time, or delete
  it).
- Do not add a network request, a file read or a file write.
- Update the row for the saved reading in `docs/configuration.md` if its text changes.

## Acceptance criteria

- [ ] After an answer whose limits all have no reset time, `$.store` holds no reading that
      consists of those limits.
- [ ] After an answer with one limit that has a reset time and one that has none, the saved
      reading holds only the first.
- [ ] The band of the session that has a limit with no reset time shows the same as before.
- [ ] A test covers each of the first two cases.
- [ ] The change is a patch release, with its `CHANGELOG.md` entry.


## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** the root cause (`follow` saves the view's limits as they are, and `withSaved` can never give back a limit with no reset time); the fix only in `follow` in `plugins/runway/hooks/runway.ts`, with no change to `view.ts`, so the band shows the same; hooks tests for an answer with only limits with no reset time and for a mixed answer; the row in `docs/configuration.md`; the patch release 0.1.2.
- **Where they differ:** what happens to a reading that is already saved when the view has only limits with no reset time. Codex keeps it until its limits are past their reset time. Copilot deletes it, but only when the view had a limit with a reset time before the update. Claude first planned to delete it whenever the view had any limit before the update. Codex also tests the same path through `session.measure`.
- **What Claude took:** first Copilot's rule for the delete. The plan review (2 rounds, both approve at the end) showed that this rule does not cover the start of a session, which does not go through `follow`. The plan then took Codex's rule: keep the saved reading. It is one rule for every path, and it adds no delete. From Codex also: the test through `session.measure`, and store checks in the existing tests.

Bug notes: .specify/bugs/010-skip-limit-without-reset/

***

**Comment** by `tmathura`, 2026-11-14T09:05:44Z, https://github.com/tmathura/claude-runway/issues/10#issuecomment-6874955122

workflow-auto: waits for the owner

**Where it stopped:** Step 7, code review round 2. Branch `bugfix/10-skip-limit-without-reset` (local only, not pushed), head `d1e58e5`. Worktree `.claude/worktrees/bugfix-10-skip-limit-without-reset`. No PR yet.

**Why:** in round 2, the Copilot review ended two times with no verdict ("Copilot ended its last turn without an answer"). By the workflow rule, Copilot is then not ready for the rest of the ticket, and `workflow-auto` needs both Codex and Copilot. Codex approved round 2.

**State of the work:** the fix, its tests (33 hooks tests pass), the docs, version 0.1.2 and the bug notes are committed. Round 1 is done and committed.

**Open from round 2 (`code-review`, 5 findings, not yet handled):**

1. The rule "a new session can show this limit" is in two places in two forms (`follow` in `runway.ts`, `withSaved` in `view.ts`). It suggests one shared function in `view.ts`.
2. `fix.md`: the Summary and the list "Tests Added or Updated" do not have the round 1 change (7 tests, "a reset time that is a date").
3. `test.md`: the output excerpt says 33 tests but does not list the new test.
4. `docs/configuration.md`, the row for the saved reading: "a limit with a reset time replaces it" does not fit a reset time that is not a date.
5. `plugins/runway/CHANGELOG.md`: the new bullet leaves out that the mod deletes the saved reading when the account has no limits any more.

**Decision needed:** how to go on.

- Option 1 (recommended): run `/workflow-auto 10` again. It resumes at Step 7 with a new round, and handles the 5 findings. Copilot may answer then.
- Option 2: run `/workflow-manual 10`. It can go on with Codex alone, and names Copilot as not available in the PR.

To go on: answer with a comment that starts with `decision:`, then remove the `question` label. Only the owner's comment counts.

***

**Comment** by `tmathura`, 2026-11-14T09:41:51Z, https://github.com/tmathura/claude-runway/issues/10#issuecomment-6875375204

workflow-auto: the owner said in the session to continue until the ticket is done. The `question` label is removed and the run resumes at Step 7. If the Copilot review ends with no verdict again, the run goes on with Codex and `code-review`, and the PR names Copilot as not available.
