# #1 Show what a session has left in one band above the prompt

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#1](../../github/2026/11/issue-001.md), label `enhancement`
- PR: [#4](../../github/2026/11/pull-004.md), merged 2026-11-13
- Commit on `main`: `01038a367aa1554728687df4bd5f0c857700657f`
- State: released as v0.1.0 ([release](../../github/2026/11/release-v0.1.0.md), [release run](release-run-v0.1.0.md))
- Planning notes: [`.specify/specs/001-session-runway-band/`](../../../../.specify/specs/001-session-runway-band)
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #1 and PR #4, the spec folder, the release run entry.

## What changed

See `## Change` in [PR #4](../../github/2026/11/pull-004.md).

## Why

See `## Problem` and `## Change` in [PR #4](../../github/2026/11/pull-004.md).

## Options dropped

The parts that were left out of the first version are listed in `## Change` of [PR #4](../../github/2026/11/pull-004.md). [`research.md`](../../../../.specify/specs/001-session-runway-band/research.md) §2 gives the reason for each. The PR has no plan comparison. (Sources: PR #4, the spec folder.)

## What was checked

See `## Testing` in [PR #4](../../github/2026/11/pull-004.md).

## Review result

See `## Review rounds` in [PR #4](../../github/2026/11/pull-004.md).

## Left open

Two things were not checked on their own: the state after `/clear` and after a resume, and the life of the prompt cache. One review finding was kept and is said in the README: `~N left` counts to a full window. (Source: `## Testing` and `## Review rounds` in [PR #4](../../github/2026/11/pull-004.md).)
