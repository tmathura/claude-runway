# #5 Add the ticket workflow skills and the missing docs from copilot-plugin-cc

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#5](../../github/2026/11/issue-005.md), label `enhancement`
- PR: [#6](../../github/2026/11/pull-006.md), merged 2026-11-14
- Commit on `main`: `fd3a7c9a1745a70180b0b58a6e4b3ff933c40dd1`
- State: merged, not a release
- Planning notes: none in the repo
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #5 and PR #6. On the same day, facts from the session transcripts of this PC were added; each names that source.

## What changed

See `## Change` in [PR #6](../../github/2026/11/pull-006.md).

## Why

See `## Problem` and `## Change` in [PR #6](../../github/2026/11/pull-006.md).

## Options dropped

The blind plans of Codex and Copilot were not run, so there is no plan comparison. The rules for ports from an upstream repo were left out, because this repo is not a port. (Source: `## Change` in [PR #6](../../github/2026/11/pull-006.md).)

Claude first left the workflow skills out of the first version; the owner overruled that, which led to this ticket ([decision 0009](../../../decisions/0009-port-the-workflow-and-the-github-settings.md)). (Source: session transcript, 2026-11-13; added 2026-11-15.)

## What was checked

See `## Testing` in [PR #6](../../github/2026/11/pull-006.md).

## Review result

The result of the PR review is under the heading `## PR review rounds` of [PR #6](../../github/2026/11/pull-006.md): five rounds by Copilot and CodeRabbit, fifteen findings, thirteen fixed, two rejected with their reasons. The review threads are in the same file. (Source: PR #6.)

PR #6 was stacked on the branch of PR #4, so the Copilot review of the ruleset did not run on it until its base became `main`. (Source: session transcript, 2026-11-13; added 2026-11-15.)

## Left open

No skill was run end to end in this repo; the texts were adapted by reading. The 10 build tests of `spec-review-page` were skipped on the owner's system, because the shell found no Python; CI runs them. (Source: `## Testing` in [PR #6](../../github/2026/11/pull-006.md).)
