# 0007. Export in its own PR, as the last step of the workflow

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15, on Claude's advice, for `tmathura/copilot-plugin-cc` issue 162;
  taken over for this repo in ticket #24 ([issue](../history/github/2026/11/issue-024.md)).

## Context

The entry of a ticket needs facts that exist only after its merge: the merge commit, the closed
issue, the release, and the release run table. So the entry cannot be in the ticket's own PR.
`main` takes changes only through a PR, and until this ticket the rules allowed one branch and
one PR for each ticket, with the full review loops.

## Options considered

- **Write the entry in the ticket's own PR.** It would not hold the merge commit or the release
  run, and a person would write it by hand. Rejected.
- **Push the export straight to `main`**, as the nightly job in the gh2md README does
  (<https://github.com/mattduck/gh2md>). The ruleset of this repo allows no push to `main`, and
  CI would not run before the change lands. Rejected.
- **A second PR after the merge that holds only files made by the command.** Chosen.

What other projects do with a follow-up PR that a tool makes:

- release-please keeps a release PR up to date; merging it writes the changelog and the tag:
  <https://github.com/googleapis/release-please>.
- The changesets action opens a "Version Packages" PR: <https://github.com/changesets/action>.
- The all-contributors bot opens a PR to add a contributor:
  <https://allcontributors.org/docs/en/bot/usage>.
- Dependabot PRs can merge by a workflow, and GitHub says to require the status checks first:
  <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions>.
- None of these pages gives a review rule for a PR that holds only generated files. A person
  merges them, or they merge behind required checks.

## Decision

After a ticket's PR is merged and its cleanup is done, and after its release run and release if
it is a release, the workflow makes the export PR ("History export" in
`.claude/skills/workflow-common/REFERENCE.md`):

- Branch `export/<n>-history`, with the ticket's own issue number, and the commit subject
  `[#<n>] Export the history of #<n>`.
- It holds only files that `npm run history -- export` wrote. Before the merge, a second run
  with `--export-base origin/main` proves that.
- It needs no plan, no blind plan and no Codex and Copilot rounds. CI must pass, and the bot
  reviewers still review it. A bot finding on copied text is rejected by rule; a confirmed
  finding on the command or on a built page needs a hand-written change, so it gets its own
  ticket and this export PR is closed.
- The owner's answer to the merge question of the ticket also covers its export PR.
- An export PR is not exported itself. Its record is its squash commit.
- The export reads all items each time, so a ticket whose export failed, or that was merged by
  hand, is picked up by the next run.
- If the export PR cannot be made or merged, the ticket is still done. The failure is reported.

The constitution names this exception and its limits ("Development workflow", version 1.2.0).
An export PR that holds a hand-written change is not an export PR and follows the full rules.

## Consequences

- Each ticket gives two commits on `main`.
- The record is one merge behind until the export PR merges.
- Weak points from the search, kept as known limits: a PR made in GitHub Actions with the
  default token would start no CI run
  (<https://github.com/googleapis/release-please-action>); here the PR is made with the owner's
  login on the owner's system, so CI runs. An export is a reading copy only.
- Two export branches that meet are brought up to date by a merge of `main` and a new run of
  the export, because all their files come from the command.
