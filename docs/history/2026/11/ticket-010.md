# #10 Do not save a limit that has no reset time

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#10](../../github/2026/11/issue-010.md), label `bug`
- PR: [#12](../../github/2026/11/pull-012.md), merged 2026-11-14
- Commit on `main`: `bec4a35db62253dd2962d0ecdb61823d0ac1907e`
- State: released as v0.1.2 ([release](../../github/2026/11/release-v0.1.2.md), [release run](release-run-v0.1.2.md))
- Planning notes: [`.specify/bugs/010-skip-limit-without-reset/`](../../../../.specify/bugs/010-skip-limit-without-reset)
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #10, PR #12, issue #15 and issue #16, the bug folder, the release run entry. On the same day, facts from the session transcripts of this PC were added; each names that source.

## What changed

See `## Change` in [PR #12](../../github/2026/11/pull-012.md).

## Why

See `## Problem` and `## Change` in [PR #12](../../github/2026/11/pull-012.md).

## Options dropped

See `## Plan comparison` in [PR #12](../../github/2026/11/pull-012.md).

## What was checked

See `## Testing` in [PR #12](../../github/2026/11/pull-012.md).

The session transcript differs from the PR on one point. The PR says that the new tests were not run against the code before the fix. After the merge, on 2026-11-14, Claude ran them against the old code: 6 of the 7 new tests fail there; the seventh only checks a normal save. Both are kept. (Source: session transcript, 2026-11-14; added 2026-11-15.)

## Review result

See `## Review rounds` in [PR #12](../../github/2026/11/pull-012.md).

## Left open

Not checked: the new tests against the code before the fix; whether Claude Code ever reports a limit with no reset time; the band in a real session, which the release run did after the merge ([release run v0.1.2](release-run-v0.1.2.md)). One rejected finding was left for its own ticket: an old session can replace a newer saved reading with its own. [issue #15](../../github/2026/11/issue-015.md) asks for that change; it was closed as a duplicate of [issue #16](../../github/2026/11/issue-016.md), which is open. (Sources: `## Testing` and `## Review rounds` in [PR #12](../../github/2026/11/pull-012.md); issues #15 and #16.)

The ticket was held once with the `question` label. The owner said in chat to go on, and Claude removed the label itself, with no `decision:` comment. Two things found after the merge became issues #13 and #14. (Source: session transcript, 2026-11-14; added 2026-11-15.)
