# 0006. Write the history of a ticket once, in the PR body

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15, on Claude's advice, for `tmathura/copilot-plugin-cc` issue 162;
  taken over for this repo in ticket #24 ([issue](../history/github/2026/11/issue-024.md)).

## Context

Each ticket already writes a PR body with the problem, the change, the testing, the plan
comparison and the review rounds. Until this ticket, the squash commit did not keep that text:
the repo setting was `squash_merge_commit_message=COMMIT_MESSAGES`, so the commit held the
messages of the branch commits.

## Options considered

- **A history file written by hand for each ticket.** A second copy of the PR text, and a step
  that can be forgotten. Rejected.
- **The PR body as the squash commit message**, and an entry file made by a command after the
  merge. One text, written once. Chosen.
- **The PR title only as the message.** Some projects do this. The commit then gives no reason.
  Rejected.

What other projects do:

- GitHub offers "Pull request title and description" as a default squash message:
  <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests>.
  The REST values are `squash_merge_commit_title` (`PR_TITLE` or `COMMIT_OR_PR_TITLE`) and
  `squash_merge_commit_message` (`PR_BODY`, `COMMIT_MESSAGES` or `BLANK`):
  <https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28>.
- Mergify advises the PR title and description as the message:
  <https://articles.mergify.com/how-to-change-the-default-commit-message-on-github>.
- An Apache TVM guideline asks for the PR body in the squash message:
  <https://discuss.tvm.apache.org/t/rfc-v2-commit-message-guideline/13249/3>.
- SSW advises the squash merge with a clean message for open-source projects:
  <https://www.ssw.com.au/rules/use-squash-and-merge-for-open-source-projects>.

## Decision

A ticket's history is written once, in its PR body. Nobody writes a history file by hand. The
repo setting is `squash_merge_commit_title=PR_TITLE` and
`squash_merge_commit_message=PR_BODY` (before: `COMMIT_OR_PR_TITLE` and `COMMIT_MESSAGES`), so
the squash commit on `main` holds the PR body.

The PR body therefore holds each rejected finding of both review loops with its reason, says
in `## Testing` what was checked, how and by whom, and has a `## State` section for what is
left open ("PR body" in `.claude/skills/workflow-common/REFERENCE.md`). It is checked for
sensitive text before each create or edit, because it becomes a commit that cannot be removed.

## Consequences

- The record of a new ticket is in three places that a command makes from the one text: the
  squash commit, the raw copy of the PR, and the entry that points to it.
- Known limits, from the search:
  - The setting is only a default. It applies when the merge sends no message, which is how
    `gh pr merge --squash` is used here. A person who merges in the browser can edit the text.
    <https://github.blog/changelog/2022-08-23-new-options-for-controlling-the-default-commit-message-when-merging-a-pull-request/>
  - The commit holds the body as it is at the merge. Later edits of the PR, and its comments
    and review threads, are only in the raw copy.
  - A PR body can be long, so the commit message is long.
    <https://github.com/orgs/community/discussions/5955>
  - No source says how GitHub treats a body line that starts with `#`, or a length limit. The
    merge of this ticket's own PR is the test: its squash commit must hold the body.
- `collect-rejected.mjs` still reads the round commits of the branch before the merge. The
  squash commit no longer holds those commit messages, so the PR body must hold each rejected
  finding.
