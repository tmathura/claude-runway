# #7 Delete a saved limits reading when its reset time has passed

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#7](../../github/2026/11/issue-007.md), label `bug`
- PR: [#9](../../github/2026/11/pull-009.md), merged 2026-11-14
- Commit on `main`: `8272418466828d9fc65c75aadcc201dc72b14076`
- State: released as v0.1.1 ([release](../../github/2026/11/release-v0.1.1.md), [release run](release-run-v0.1.1.md))
- Planning notes: [`.specify/bugs/007-delete-expired-limits-reading/`](../../../../.specify/bugs/007-delete-expired-limits-reading)
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #7, PR #9 and issue #10, the bug folder, the release run entry.

## What changed

See `## Change` in [PR #9](../../github/2026/11/pull-009.md).

## Why

See `## Problem` and `## Change` in [PR #9](../../github/2026/11/pull-009.md).

## Options dropped

See `## Plan comparison` in [PR #9](../../github/2026/11/pull-009.md).

## What was checked

See `## Testing` in [PR #9](../../github/2026/11/pull-009.md).

## Review result

See `## Review rounds` in [PR #9](../../github/2026/11/pull-009.md).

## Left open

The PR did not check the band in a real session; the release run did that after the merge ([release run v0.1.1](release-run-v0.1.1.md)). One rejected finding was left for its own ticket: `follow` saves a limit with no reset time. [issue #10](../../github/2026/11/issue-010.md) asks for that change. (Sources: `## Testing` and `## Review rounds` in [PR #9](../../github/2026/11/pull-009.md); issue #10.)
