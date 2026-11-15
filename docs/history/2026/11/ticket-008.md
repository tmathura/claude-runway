# #8 Move the spec folders to .specify/specs

<!-- header: `npm run history` rewrites the lines down to the next marker -->
- Issue: [#8](../../github/2026/11/issue-008.md), label `enhancement`
- PR: [#11](../../github/2026/11/pull-011.md), merged 2026-11-14
- Commit on `main`: `9cdb4abf4804baee62617156bcbd3c28d6cc11ec`
- State: merged, not a release
- Planning notes: the `## Plan comparison` of [issue #8](../../github/2026/11/issue-008.md)
<!-- fields: `npm run history` fills a field only while it holds generated text -->
- Backfilled: 2026-11-15, from the sources that git and GitHub hold. Sources: the raw copies of issue #8 and PR #11. On the same day, facts from the session transcripts of this PC were added; each names that source.

## What changed

See `## Change` in [PR #11](../../github/2026/11/pull-011.md).

## Why

See `## Problem` and `## Change` in [PR #11](../../github/2026/11/pull-011.md).

The owner asked for a copy of issue 158 of `tmathura/copilot-plugin-cc`, which makes the same move there. (Source: session transcript, 2026-11-14; added 2026-11-15.)

## Options dropped

See `## Plan comparison` in [PR #11](../../github/2026/11/pull-011.md).

## What was checked

See `## Testing` in [PR #11](../../github/2026/11/pull-011.md).

## Review result

See `## Review rounds` in [PR #11](../../github/2026/11/pull-011.md).

## Left open

Not checked: `workflow-ticket` end to end with a real new issue; `specify integration upgrade` to a newer Spec Kit version; the wording against `tmathura/copilot-plugin-cc`. The paths inside the spec and bug folders that were already merged were not updated, because a merged folder is history (the scope change of 2026-11-14). (Source: `## Change` and `## Testing` in [PR #11](../../github/2026/11/pull-011.md).)

The ticket ran before #10, because #10 is a release and would have stopped the run. No real spec has used the new folder yet; the first one will show whether the rule to pass the folder is enough ([decision 0018](../../../decisions/0018-no-ci-check-for-a-root-specs-folder.md)). (Source: session transcript, 2026-11-15; added 2026-11-15.)
