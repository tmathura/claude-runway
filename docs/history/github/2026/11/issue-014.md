---
kind: "issue"
number: 14
title: "Keep a feature.json file that is inside a bug folder"
state: "open"
state_reason: null
labels: ["bug"]
author: "tmathura"
created_at: "2026-11-14T23:02:23Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/14"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Notes for the run"]
---

# Issue #14: Keep a feature.json file that is inside a bug folder

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:02:23Z, https://github.com/tmathura/claude-runway/issues/14

## Problem

Git ignores a file named `feature.json` inside a bug folder, with no message.

- `.specify/.gitignore` line 6 has the rule `feature.json` with no leading `/`. It is meant for the pointer file `.specify/feature.json`, but it matches a file with that name at any depth below `.specify/`.
- `.specify/.gitignore` is a managed Spec Kit file: its hash is in `.specify/integrations/speckit.manifest.json`, and `docs/development.md` says not to edit managed files.
- #8 moved the spec folders under `.specify/` and added `.specify/specs/.gitignore` with `!*/**/feature.json`, so a spec folder keeps such a file.
- Bug folders have no such rule: `git check-ignore -v --no-index .specify/bugs/001-x/feature.json` prints `.specify/.gitignore:6:feature.json`.

So a bug folder that holds a `feature.json` (for example a saved sample) is committed without it, and `git add` gives no warning. No bug folder has such a file today. The code review of PR #11 found this; it was left out of #8 because `main` behaved so before it.

## Expected behaviour

A `feature.json` inside a bug folder is tracked like any other file of the folder. `.specify/feature.json` stays ignored.

## Solution requirements

- Do not edit `.specify/.gitignore` or any other managed Spec Kit file.
- Use the same way as for the spec folders: a hand-written `.specify/bugs/.gitignore`.
- A `feature.json` written directly in `.specify/bugs/` stays ignored, as in `.specify/specs/`.
- Update the sentence in `docs/development.md` ("Folder names") that names `.specify/specs/.gitignore`, so that it covers both files.
- Check that `NOTICE` and the sentence about managed files in `docs/development.md` do not name the new file as a Spec Kit file.

## Acceptance criteria

- [ ] `git check-ignore -v` shows that `.specify/bugs/x/feature.json` and `.specify/bugs/x/sub/feature.json` are kept.
- [ ] `git check-ignore -v` shows that `.specify/bugs/feature.json` and `.specify/feature.json` stay ignored.
- [ ] `docs/development.md` names the new file as written by hand.
- [ ] `specify integration upgrade claude` on the same version still runs, in a temporary copy, and leaves the new file alone. The PR shows the output.
- [ ] `npm test` and `npm run build` pass.


## Notes for the run

- Order: no dependency. It changes no mod file, so it is not a release. Planning mode: Claude plan mode.
- The pattern to use is the one in `.specify/specs/.gitignore`: `!*/**/feature.json`, with a comment that says why.
