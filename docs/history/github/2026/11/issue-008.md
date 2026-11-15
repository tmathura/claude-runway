---
kind: "issue"
number: 8
title: "Move the spec folders to .specify/specs"
state: "closed"
state_reason: "completed"
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T01:10:23Z"
updated_at: "2026-11-14T08:37:26Z"
closed_at: "2026-11-14T08:37:26Z"
url: "https://github.com/tmathura/claude-runway/issues/8"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Plan comparison"]
---

# Issue #8: Move the spec folders to .specify/specs

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T01:10:23Z, https://github.com/tmathura/claude-runway/issues/8

## Problem

The planning folders are in two places. Spec folders are in `specs/` at the repo root. Bug notes
go in `.specify/bugs/`. There is no single parent folder for both.

State of `main` at fd3a7c9:

- `specs/` holds one folder, `001-session-runway-band`, with four files and no loose files.
  `.specify/specs/` does not exist. `.specify/bugs/` does not exist yet either: no bug has notes.
- 13 tracked files outside `specs/` name the path `specs/`:

  | File | Mentions | Managed by Spec Kit |
  | --- | --- | --- |
  | `docs/development.md` | 14 | no |
  | `.claude/skills/workflow-common/REFERENCE.md` | 9 | no |
  | `.claude/skills/workflow-ticket/SKILL.md` | 9 | no |
  | `.claude/skills/spec-review-page/SKILL.md` | 5 | no |
  | `.claude/skills/speckit-specify/SKILL.md` | 5 | yes |
  | `.claude/skills/workflow-branch/SKILL.md` | 2 | no |
  | `.claude/skills/workflow-manual/SKILL.md` | 2 | no |
  | `.specify/templates/plan-template.md` | 2 | yes |
  | `.specify/templates/tasks-template.md` | 1 | yes |
  | `.claude/skills/spec-review-page/build.py` | 1 (a comment) | no |
  | `.gitattributes` | 1 | no |
  | `.specify/memory/constitution.md` | 1 | no |
  | `CLAUDE.md` | 1 | no |

- Two files inside the spec folder also name their own path (3 mentions): `plan.md` and `tasks.md`.
- No `review.html` is in the repo.
- `.specify/scripts/bash/create-new-feature.sh:279` sets `SPECS_DIR="$REPO_ROOT/specs"`. No skill
  in this repo runs that script. In Spec Kit 1.2.2, `/speckit-specify` makes the folder from its
  own text (`.claude/skills/speckit-specify/SKILL.md:84-93`), and it uses
  `SPECIFY_FEATURE_DIRECTORY` as given when the user passes it. The other scripts read
  `SPECIFY_FEATURE_DIRECTORY` or `.specify/feature.json` (`.specify/scripts/bash/common.sh:188-213`).
- This repo always passes the folder (`docs/development.md`, "Using it" and "Folder names"). So the
  move needs no edit to a managed file.
- `specify integration upgrade` refuses to run when a managed file was changed by hand
  (`docs/development.md`, "Upgrading" and "Line endings"). The repo has no place that records such
  edits.
- No relative link in the spec leaves its folder. The three links point to `spec.md` and
  `research.md` in the same folder.
- No open pull request, local branch or worktree touches `specs/`.
- No CI workflow names `specs/`. `tests/spec-review-page.test.mjs` uses `specs` only as the name of
  a folder that the test makes.

The same change is planned for `tmathura/copilot-plugin-cc` (its issue 158). The two repos share
the workflow skills, so they must agree on the place of a spec.

## Expected behaviour

All planning folders have one parent: specs in `.specify/specs/NNN-<name>/`, bug notes in
`.specify/bugs/NNN-<slug>/`. The way a spec is written and used stays the same. Only its place
changes.

## Solution requirements

- Move the spec folder with `git mv`, so that the history follows the files.
- Change paths only. Change no decision text in a spec and no rule in the constitution. For the one
  path in the constitution, follow its own amendment rule.
- Do not edit a managed Spec Kit file: the `speckit-*` skills, `.specify/scripts/` and
  `.specify/templates/`. The new place comes from the folder that the workflow passes
  (`SPECIFY_FEATURE_DIRECTORY=.specify/specs/NNN-<name>`) and from `.specify/feature.json`.
- Update each file in the table that is not managed: docs, the workflow skills, the
  `spec-review-page` skill, `CLAUDE.md`, and the pattern in `.gitattributes`. In `workflow-ticket`,
  also update the rename step and its `grep` patterns.
- Update the paths that the moved spec gives for itself.
- Check that `spec-review-page` (`build.py`) accepts a folder under `.specify/specs/`, and add a
  test for it if none covers it.
- In `docs/development.md`, say that without a passed folder `/speckit-specify` still writes to
  `specs/`, because its text is managed.
- Check that `specify integration upgrade claude` on the same version still runs with
  `.specify/specs/` present and leaves it alone.
- Keep the wording of the changed workflow skills the same as in `tmathura/copilot-plugin-cc`
  where that repo has made this change already.

## Acceptance criteria

- [ ] `specs/` at the repo root is gone, and the folder is in `.specify/specs/`.
- [ ] `git log --follow` on one moved file shows commits from before the move.
- [ ] A search of the tracked files for the old path finds it only in the managed Spec Kit files.
      The PR lists those mentions with the reason for each.
- [ ] No managed Spec Kit file changed: `git diff main --stat` shows none of them.
- [ ] A script checks every relative link in the moved spec, and none is broken.
- [ ] `/speckit-specify SPECIFY_FEATURE_DIRECTORY=.specify/specs/<name>`, run in a temporary copy,
      writes `spec.md` there and writes that path to `.specify/feature.json`. `setup-plan.sh --json`
      then gives the same folder. The PR shows the output.
- [ ] `workflow-ticket` adds the issue number to a folder in `.specify/specs/` and writes the line
      `Spec: .specify/specs/NNN-<name>/`.
- [ ] `git check-attr` shows `linguist-generated` for a `review.html` under `.specify/specs/`.
- [ ] `npm test` and `npm run build` pass.
- [ ] The PR says what was not checked, and what breaks for a branch that still has files in
      `specs/`.


## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** `git mv` of the folder; path-only edits in the files that are not managed; the PATCH version of the constitution (1.1.1); the `.gitattributes` pattern; the escaped `grep` pattern in `workflow-ticket`; a new build test for a folder under `.specify/specs/`; no edit to a managed Spec Kit file; no link or wrapper at the old place.
- **Where they differ:** Copilot removes `specs/` from the release file list in `REFERENCE.md`, because `.specify/` covers it. Codex adds the bug folder `.specify/bugs/007-delete-expired-limits-reading/` (newer than this issue), the sentence in `docs/development.md` about which files under `.specify/` are managed, and the one exception to the search criterion (the sentence about the default place of `/speckit-specify`). Codex would rebuild the review page of bug folder 007; Claude changes its one line by hand, because the folder is history and a rebuild would reset its "What moved" section. Codex found that the local checkout of `copilot-plugin-cc` still uses the old place, so there is no wording there to match yet.
- **What Claude took:** every point above except the rebuild of the 007 page.
- **From the plan review (2 rounds, both approve):** `NOTICE` must name `.specify/specs/` as not from Spec Kit; the linked-parent tests make `.specify` before the link, so they cannot skip in silence; one more test for a linked `.specify`.

2026-11-14: scope change. The text of the moved spec folder 001 and of bug folder 007 is not changed, so both keep the old path `specs/` in their text. The constitution says that the folder of a merged feature is history and that later work does not update it, and it comes before the issue. `docs/development.md` ("Folder names") says how to read the old path.
