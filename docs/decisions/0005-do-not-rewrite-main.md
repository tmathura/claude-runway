# 0005. Do not rewrite `main`

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15, on Claude's advice, for `tmathura/copilot-plugin-cc` issue 162;
  taken over for this repo in ticket #24 ([issue](../history/github/2026/11/issue-024.md)).

## Context

The squash commits on `main` from before this ticket hold the messages of the branch commits,
not the PR text. One way to put the PR text into them is to edit the old commit messages.

## Options considered

- **Edit the old commit messages once.** Each commit on `main` then gets a new ID. That breaks
  the clones of users who installed the mod, the 3 release tags, the link from each commit to
  its PR (the start check of `workflow-auto` uses it), and each place that names a commit ID.
  Rejected.
- **git notes on the old commits.** No commit changes. But notes are not pushed or fetched by
  default, and GitHub does not show them (sources in
  [0002](0002-the-form-of-the-history-record.md)). Rejected.
- **Leave the commits as they are, and add files.** Chosen.

What other projects do:

- Pro Git: "Do not rebase commits that exist outside your repository and that people may have
  based work on." <https://git-scm.com/book/en/v2/Git-Branching-Rebasing>
- GitHub: "it's considered bad practice to rebase commits when you've already pushed to a
  repository." <https://docs.github.com/en/get-started/using-git/about-git-rebase>

## Decision

`main` is never rewritten, also not once for this ticket: no force-push, no changed commit. An
old ticket gets one backfilled entry file, and the raw copy of its PR holds the PR text.

## Consequences

- The old squash commits keep their long bodies of round commits. The entry and the raw copy
  give the readable record.
- A commit message cannot be corrected later. A file can, so the file is the copy that is
  fixed when a fact was wrong.
- The search found one point for the other side: Pro Git allows a rewrite when nobody has based
  work on the commits. Users install this mod from `main`, so that case does not apply here.
