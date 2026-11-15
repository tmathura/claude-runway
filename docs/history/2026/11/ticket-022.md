# #22 Add an --ask-band option to workflow-auto, and open the test session for the owner

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#22](../../github/2026/11/issue-022.md), label `enhancement`
- PR: [#23](../../github/2026/11/pull-023.md), merged 2026-11-15
- Commit on `main`: `d0afdda789d4a45c2601211cd19a55d6d231a5e4`
- State: merged, not a release
- Planning notes: the `## Plan comparison` of [issue #22](../../github/2026/11/issue-022.md)
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #22 and PR #23. On the same day, facts from the session transcripts of this PC were added; each names that source.

## What changed

See `## Change` in [PR #23](../../github/2026/11/pull-023.md).

## Why

See `## Problem` and `## Change` in [PR #23](../../github/2026/11/pull-023.md).

## Options dropped

See `## Plan comparison` in [PR #23](../../github/2026/11/pull-023.md).

## What was checked

See `## Testing` in [PR #23](../../github/2026/11/pull-023.md).

In one test session the fixed first prompt got an answer, about 4 seconds after the start. So that part was seen once. Whether the window was visible and whether the band was drawn was not seen. (Source: session transcript, 2026-11-15; added 2026-11-15.)

## Review result

See `## Review rounds` in [PR #23](../../github/2026/11/pull-023.md).

## Left open

Not checked: that the test window is visible and takes keyboard input (only its process was seen); `--ask-band` in a real `workflow-auto` run; and a test session leaves `plugins/runway/tsconfig.json` in the folder it loads the mod from. (Source: `## Testing` in [PR #23](../../github/2026/11/pull-023.md).)

During the work a command that waited for the window hung and was stopped, and the run stopped once on the usage limit in the PR review and was started again. Two other ways to make the band reading cheaper were dropped: [decision 0013](../../../decisions/0013-claude-does-not-read-the-band-from-screenshots.md) and [decision 0014](../../../decisions/0014-no-release-without-its-own-band-reading.md). (Source: session transcript, 2026-11-14; added 2026-11-15.)
