# 0011. Move the `v0.1.0` tag once, to the commit that set the version

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

Version 0.1.0 was set by the merge commit of PR #4, `01038a3`. The tag `v0.1.0` was first put on the head of `main` at that time, `fd3a7c9` (PR #6), on purpose, so that the release also carried the docs and the workflow skills. The mod files are the same in both commits. The start check of `workflow-auto` wants the tag on the commit that set the version, so the first backlog run stopped before its first ticket.

## Options considered

- **Change the start check of `workflow-auto`,** as a new ticket. Claude recommended it. The owner refused it: no change to the workflow.
- **Delete the release and the tag, and publish again.** Dropped.
- **Move the tag to `01038a3`.** Chosen.

## Decision

The owner wanted the state fixed, so that the run could start, with no change to the workflow. Claude moved the tag to `01038a3` with one forced API call, after the owner gave permission for that one command. The release stayed published. This is a one-time exception to the rule "never move the tag" in "Release run" (`.claude/skills/workflow-common/REFERENCE.md`).

## Consequences

- The raw copy of the release shows both commits: `target` is `fd3a7c9`, `tag_commit` is `01038a3` ([release v0.1.0](../history/github/2026/11/release-v0.1.0.md)).
- The run table comment on PR #4 was not corrected. So the [release run entry](../history/2026/11/release-run-v0.1.0.md) names `fd3a7c9` in its copied text and `01038a3` in its top block. Both are right: the run was done on `fd3a7c9`.
- A clone that fetched the tag before the move keeps the old tag.
