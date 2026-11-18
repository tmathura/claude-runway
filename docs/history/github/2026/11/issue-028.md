---
kind: "issue"
number: 28
title: "Say in CLAUDE.md how to tell that current-state.md is behind main"
state: "closed"
state_reason: "completed"
labels: ["documentation"]
author: "tmathura"
created_at: "2026-11-17T22:17:30Z"
closed_at: "2026-11-17T23:11:33Z"
url: "https://github.com/tmathura/claude-runway/issues/28"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Plan comparison"]
---

# Issue #28: Say in CLAUDE.md how to tell that current-state.md is behind main

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-17T22:17:30Z, https://github.com/tmathura/claude-runway/issues/28

## Problem

`docs/history/current-state.md` is built at each history export. Between the merge of a ticket and the merge of its export PR, or after an export that failed or was skipped, the page is older than `main`: it misses the last merged change, and its lists of open issues and of the last release can be wrong.

`CLAUDE.md` ("Read first") tells a new session to read this page first. It says "check the files it links to before you act on it", but it gives no step that shows whether the page is older than `main`. The page itself gives only the line "Newest event in the raw copies". So a session can answer a question such as "what is still open?" from an old page and not know it.

## Expected behaviour

A session that reads `docs/history/current-state.md` can tell in one step whether the page is behind `main`. When it is behind, the session takes the current facts from git and GitHub, not from the page.

## Solution requirements

- Add one short step to `CLAUDE.md` ("Read first") and to "History" in `docs/development.md`: how to compare the page with `main`, and what to do when they differ (read `git log`, and ask GitHub for the open issues and the last release).
- The comparison must not report a difference only because of the export commit. An export commit `[#n] Export the history of #n` is always newer than the newest event on the page it builds. For example, compare the newest commit on `main` that is not an export commit with the list "Last merged changes" on the page.
- The step must work with only a clone for the comparison itself. Only the follow-up (asking GitHub) may need the network.
- Do not change `scripts/history.mjs`, the built pages, or any file under `plugins/runway/`. This is not a release.
- Do not add a hook, a script or a CI check. The step is a line of instruction.

## Acceptance criteria

- [ ] `CLAUDE.md` "Read first" gives the step to compare `docs/history/current-state.md` with `main`, and says what to do when the page is behind.
- [ ] "History" in `docs/development.md` gives the same rule once, and `CLAUDE.md` points to it or agrees with it.
- [ ] On a `main` whose newest commit is an export commit, the step says the page is current.
- [ ] On a `main` with a merged ticket that has no export yet, the step says the page is behind.
- [ ] `npm test` passes, with `npm run history -- check` in it.


## Plan comparison

Three plans were written from the issue text: Claude's, and blind plans from Codex and Copilot.

- **Where they agree:** change only `CLAUDE.md` ("Read first") and "History" in `docs/development.md`. Keep the rule once in `docs/development.md`; `CLAUDE.md` gives the step in words and points to it. Find the newest commit on `main` that is not an export commit. No script, hook, CI check, built page or mod file changes. Prove it by hand on two states of `main` (it ends with an export commit; a ticket merged with no export yet), then run `npm test`.
- **Where they differ:** Codex and Copilot compare that commit's subject with the first line of "Last merged changes" on the page. Claude looks for the commit hash in the entries under `docs/history/YYYY/MM/`. Reason: the page shows the issue title, not the commit subject, so only the number can be compared, and a second merged PR of the same ticket is shown as `PR #p`, so the number comparison can say "current" when the page is behind. Each entry holds its commit on `main`, so the hash gives an exact answer. Codex's plan named the hashes in the entries as the fallback when the comparison is unclear.
- **What Claude took:** from Codex, the hash in the entry as the thing to compare (made the main check), and the note that the comparison is against the local copy of `main`. From both, the place of the rule and the two proof cases.
- **Plan review (Codex and Copilot, 5 rounds; both approve):** confirmed and applied: list the commit subjects and skip export commits by eye, because `git log --grep` also matches lines of the commit body (the squash commit holds the PR body); search only the entries, with the whole header line ``Commit on `main`: `<sha>` ``; run from the root of the checkout; say what to do when all five listed commits are export commits; say that the check is for a checkout with no uncommitted change under `docs/history/`; give the GitHub commands with `--limit 1000`, and take the last release by publish date. Rejected, each with its reason, are listed in the PR body under "Review rounds".
