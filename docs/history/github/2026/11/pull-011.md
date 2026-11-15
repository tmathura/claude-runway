---
kind: "pull"
number: 11
title: "[#8] Move the spec folders to .specify/specs"
state: "merged"
draft: false
labels: []
author: "tmathura"
created_at: "2026-11-14T08:32:31Z"
updated_at: "2026-11-14T08:37:27Z"
closed_at: "2026-11-14T08:37:24Z"
merged_at: "2026-11-14T08:37:24Z"
merge_commit: "9cdb4abf4804baee62617156bcbd3c28d6cc11ec"
head: "feature/8-move-spec-folders"
base: "main"
url: "https://github.com/tmathura/claude-runway/pull/11"
headings: ["Problem","Change","Testing","Plan comparison","Review rounds"]
version_set: null
release_runs: []
---

# PR #11: [#8] Move the spec folders to .specify/specs

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T08:32:31Z, https://github.com/tmathura/claude-runway/pull/11

## Problem

The planning folders were in two places (#8). Spec folders were in `specs/` at the repo root, and bug notes go in `.specify/bugs/`. There was no single parent folder for both.

## Change

- `specs/001-session-runway-band/` moved to `.specify/specs/001-session-runway-band/` with `git mv`. It is a pure rename: no text in the four files changed.
- Paths only, in the files that are not managed by Spec Kit: `docs/development.md`, `CLAUDE.md`, `NOTICE`, `.gitattributes`, the workflow skills (`workflow-common/REFERENCE.md`, `workflow-ticket`, `workflow-branch`, `workflow-manual`) and the `spec-review-page` skill (its text, and one comment in `build.py`).
  - `workflow-ticket`: the rename step, the `feature.json` value, the expected `Spec:` line and the `grep` pattern (`'\.specify/specs/<name>([^A-Za-z0-9-]|$)'`) use the new place.
  - `spec-review-page`: the link check for a spec folder is now `find .specify .specify/specs "<spec dir>" -maxdepth 0 -type l`.
  - `REFERENCE.md`, "Is this ticket a release?": `specs/` is gone from the list, because `.specify/` covers it.
- Constitution 1.1.1 (PATCH, wording): the one path in "Implementation-to-Spec Consistency". No rule changed. "Last Amended" is 2026-11-14.
- New file `.specify/specs/.gitignore`, written by hand. The managed `.specify/.gitignore` ignores every `feature.json` below `.specify/`. After the move, that rule also reached into spec folders. The new file keeps a `feature.json` that is inside a spec folder. `.specify/feature.json` stays ignored.
- `docs/development.md` also says:
  - without a passed folder, `/speckit-specify` still writes to `specs/` at the repo root, because its text is a managed file;
  - records from before #8 keep the old path in their text, and how to read it;
  - `.specify/specs/.gitignore` is written by hand.
- No managed Spec Kit file changed: `git diff origin/main --stat` for the `speckit-*` skills, `.specify/scripts`, `.specify/templates`, `.specify/integrations` and `.specify/extensions` prints nothing.
- Not a release: no file under `plugins/runway/` changed.

**Scope change (2026-11-14, also in the issue).** The issue asks to update the paths that the moved spec gives for itself. This PR does not do that. The constitution says that the spec folder of a merged feature is history and that later work does not update it, and the constitution comes before the issue. The same holds for bug folder 007.

**Mentions of the old path that stay, with the reason for each:**

| File | Why |
| --- | --- |
| `.claude/skills/speckit-specify/SKILL.md` (5), `.specify/templates/plan-template.md` (2), `.specify/templates/tasks-template.md` (1), `.specify/scripts/bash/create-new-feature.sh` (3) | Managed Spec Kit files. The new place comes from the folder that the workflow passes. |
| `.specify/specs/001-session-runway-band/plan.md` (2) and `tasks.md` (1) | The folder of a merged feature is history. |
| `.specify/bugs/007-delete-expired-limits-reading/assessment.md` (1) and `review.html` (1) | The folder of a merged ticket is history. |
| `docs/development.md` (2) | The two sentences that explain the default place of `/speckit-specify` and the old path in records from before #8. |

**What breaks for a branch that still has files in `specs/`:** a merge of `main` keeps its new folder at `specs/`, because git only moves the files it knows. Move that folder to `.specify/specs/` by hand, write the new path to `.specify/feature.json`, and change the `Spec:` line of its issue. `workflow-ticket` does not see a `Spec: specs/...` line as a folder line any more. No open issue, branch or PR is in this state today.

## Testing

Ran locally on Windows, after the last change:

- `npm ci --include=dev`: ok
- `npm run build`: no errors
- `npm test`: 244 passed, 0 failed, 10 skipped (2 new tests)
- `npm run check-version`: all version files match 0.1.1
- `claude plugin validate plugins/runway`: Validation passed
- `claude plugin test plugins/runway`: 26 passed, 0 failed

Tests in `tests/spec-review-page.test.mjs`: a page builds for `.specify/specs/105-x` from a relative path; a linked `.specify` is refused and no page is written outside the repo; the three linked-parent tests now link `.specify/specs` and make `.specify` before the link, so a missing parent fails the test and cannot skip it.

Acceptance checks:

- `git ls-files specs` prints nothing.
- `git log --follow --oneline -- .specify/specs/001-session-runway-band/spec.md` shows `01038a3 [#1] Add the runway band above the prompt (#4)` below this branch's commit.
- A script checked every relative link in the moved spec: 3 links, 0 broken.
- `git check-attr linguist-generated diff -- .specify/specs/001-session-runway-band/review.html`: `linguist-generated: true`, `diff: unset`.
- `git check-ignore -v`: `.specify/specs/x/contracts/feature.json` and `.specify/specs/x/feature.json` are kept (`!*/**/feature.json`); `.specify/specs/feature.json` and `.specify/feature.json` stay ignored.
- In a temporary clone of the branch:
  - `claude -p "/speckit-specify SPECIFY_FEATURE_DIRECTORY=.specify/specs/tmp-specify ..."` wrote `.specify/specs/tmp-specify/spec.md` and `checklists/`, and wrote `{"feature_directory": ".specify/specs/tmp-specify"}` to `.specify/feature.json`. No `specs/` folder appeared at the root.
  - `.specify/scripts/bash/setup-plan.sh --json` then gave `"FEATURE_DIR":".../.specify/specs/tmp-specify"`.
  - `specify integration upgrade claude` (Spec Kit 1.2.2) ended with "Integration 'Claude Code' upgraded successfully". A hash of every file under `.specify/specs/` was the same before and after.
  - The rename step of `workflow-ticket`, by hand: `mv` to `008-tmp-specify`, then its `grep` for the old name printed nothing.

Not checked:

- `workflow-ticket` end to end with a real new issue. Its step is text for a model, with no script; only the `mv` and `grep` were run.
- `specify integration upgrade` to a newer Spec Kit version.
- The wording against `tmathura/copilot-plugin-cc`: its local checkout still uses the old place, so there is nothing to match yet.

CI runs the automated tests on Windows, macOS and Linux.

## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** `git mv` of the folder; path-only edits in the files that are not managed; the PATCH version of the constitution (1.1.1); the `.gitattributes` pattern; the escaped `grep` pattern in `workflow-ticket`; a new build test for a folder under `.specify/specs/`; no edit to a managed Spec Kit file; no link or wrapper at the old place.
- **Where they differ:** Copilot removes `specs/` from the release file list in `REFERENCE.md`, because `.specify/` covers it. Codex adds the bug folder `.specify/bugs/007-delete-expired-limits-reading/` (newer than this issue), the sentence in `docs/development.md` about which files under `.specify/` are managed, and the one exception to the search criterion (the sentence about the default place of `/speckit-specify`). Codex would rebuild the review page of bug folder 007; Claude changes its one line by hand, because the folder is history and a rebuild would reset its "What moved" section. Codex found that the local checkout of `copilot-plugin-cc` still uses the old place, so there is no wording there to match yet.
- **What Claude took:** every point above except the rebuild of the 007 page.
- **From the plan review (2 rounds, both approve):** `NOTICE` must name `.specify/specs/` as not from Spec Kit; the linked-parent tests make `.specify` before the link, so they cannot skip in silence; one more test for a linked `.specify`.

The code review later took back the edits in folders 001 and 007 (see "Scope change").

## Review rounds

Review round (`code-review`, Codex, Copilot): 6 rounds, last result `code-review` approve, Codex approve, Copilot approve. In rounds 2 and 3 the first Copilot call ended with no verdict; the second call approved.

Rejected findings:

- code-review: `workflow-ticket` no longer sees a `Spec: specs/...` line of an existing issue as a folder line: no open issue, branch or PR has such a line (issue #1 is closed), and the step runs only for a new issue.
- code-review: the `workflow-ticket` grep misses a bare `specs/<name>` that the managed templates can produce: the check proves the rename of the folder that was passed; `setup-plan.sh` gives that folder to `/speckit-plan`, and a path in the old place is a planning mistake that the plan review finds, not a rename leftover.
- code-review: the managed Spec Kit files still default to `specs/` and no check fails when a root `specs/` folder appears: the issue says not to edit a managed file, and `docs/development.md` now says so and says to always pass the folder.
- code-review: the test for a build under `.specify/specs` covers no new code path: the issue asks for a test that `build.py` accepts a folder under `.specify/specs/`, and no other test builds below a dot folder.
- code-review: merged spec folder 001 has three changed path lines while bug folder 007 was restored: rejected in round 2 because the issue asks for it. Round 4 raised it again with the constitution as new evidence, and the lines were then restored.
- code-review: a `feature.json` inside a bug folder is still ignored: `main` behaves so today (`.specify/.gitignore`), and the issue is about the spec folders only.
- code-review: change `.specify/.gitignore` to `/feature.json` and drop `.specify/specs/.gitignore`: the file is in the Spec Kit manifest with its hash, `docs/development.md` lists it as a managed file, and the issue says to edit no managed file.
- code-review: `NOTICE` and `docs/development.md` name only "the notes" under `.specify/bugs/` as not from Spec Kit: `main` has this text today, the issue does not ask to change it, and it is wording only.

PR review: 1 round, ended. Copilot: no findings. CodeRabbit: no findings.

Closes #8

***

**Comment** by `coderabbitai[bot]`, 2026-11-14T08:32:53Z, https://github.com/tmathura/claude-runway/pull/11#issuecomment-6874590653

<!-- coderabbit-ai-generated:v1 -->

<!-- This is an auto-generated comment: summarize by coderabbit.ai -->
<!-- recent_review_status_start -->

No actionable comments were generated in the recent review.

<!-- recent_review_status_end -->
<!-- walkthrough_start -->

<details>
<summary><strong>Walkthrough</strong></summary>
<dl>
<dd>
<br>

Workflow instructions and repository documentation now place feature specifications under `.specify/specs/`. Ignore and generated-file rules, plus review-page tests, are updated for that location. Bug-folder paths remain under `.specify/bugs/`.

**Changes: Spec folder path migration**

|Layer / File(s)|Summary|
|:---|:---|
|**Update specification path guidance** <br> `.claude/skills/{spec-review-page,workflow-branch,workflow-common,workflow-manual,workflow-ticket}/*`, `CLAUDE.md`, `.specify/memory/constitution.md`, `NOTICE`, `docs/development.md`|Workflow instructions and repository documentation use `.specify/specs/` for feature specifications. The documentation also describes the root-level path used when `/speckit-specify` receives no explicit folder.|
|**Update repository handling and review-page tests** <br> `.specify/specs/.gitignore`, `.gitattributes`, `tests/spec-review-page.test.mjs`|The ignore exception and generated-file pattern cover `.specify/specs/`. Tests cover building from that location and refusing linked `.specify` or `.specify/specs` parents.|

<!-- change_assessment_start -->


**Estimated code review effort:** 2 (Simple) | ~10 minutes

<!-- change_assessment_commit:"ff000c1e28eb26361c07c402a5b00b69bc069665" -->
<!-- change_assessment_priority:{"version":1,"urgency":"p2","manual":false} -->
**Change:** Other
<!-- change_assessment_end -->

</dd>
</dl>
</details>

<!-- walkthrough_end -->
<details>
<summary><strong>Merge Risk:</strong> <strong><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/risk-unassessed-16.svg" width="16" height="16" align="absmiddle" alt=""></picture> Minimal</strong> · up to <code>ff000</code></summary>
<dl>
<dd>
<br>

<!-- final_review_risk_start -->
<!-- final_review_risk_label
**Merge Risk:** **⚪ Minimal** · up to `ff000`
-->
<!-- final_review_risk_coverage:{"sourceCommitId":"ff000c1e28eb26361c07c402a5b00b69bc069665","coveredCommitId":"ff000c1e28eb26361c07c402a5b00b69bc069665","kind":"reviewed"} -->

This change moves feature spec folders to `.specify/specs/` and updates the documentation, workflow instructions, ignore and attribute rules, and tests to match. No concrete defects were found. Branches that still have files in the old root `specs/` folder need a manual move, which the PR already documents.
<!-- final_review_risk_end -->

</dd>
</dl>
</details>
<!-- pre_merge_checks_walkthrough_start -->

<details>
<summary><strong>Pre-merge checks: <sup><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-counter-passed-14-v2.svg" width="14" height="14" align="middle" alt="Passed" title="Passed"></picture></sup> 4</strong></summary>
<dl>
<dd>
<br>

|         Check name         |                                             Status                                             | Explanation                                                                                                                                                                                                  |
| :------------------------ | :--------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|         Title check        | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | The title "[`#8`] Move the spec folders to .specify/specs" matches the main change in the changeset. The PR moves the existing spec folder from root-level specs/ to .specify/specs/ and updates path refe…    |
|     Linked Issues check    | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | Issue `#8` is the only direct linked issue and it is open. Its coding requirements are covered at head ff000c1:<br>- Move with history: `.specify/specs/001-session-runway-band/` holds the four files, and `… |
| Out of Scope Changes check | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | Every changed file maps to an issue `#8` objective or to a supporting need:<br>- Path renames in docs, CLAUDE.md, NOTICE, .gitattributes, workflow skills, spec-review-page and the constitution version bump… |
|      Description Check     | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | Check skipped - CodeRabbit’s high-level summary is enabled.                                                                                                                                                  |

<details>
<summary><strong>Full details: Title check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

The title "[`#8`] Move the spec folders to .specify/specs" matches the main change in the changeset. The PR moves the existing spec folder from root-level specs/ to .specify/specs/ and updates path references across the workflow skills, docs, CLAUDE.md, NOTICE, .gitattributes, and the constitution. It also adds a .specify/specs/.gitignore and tests for the new location. The title names the primary change and the linked issue number.

</dd>
</dl>
</details>

<details>
<summary><strong>Full details: Linked Issues check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

Issue `#8` is the only direct linked issue and it is open. Its coding requirements are covered at head ff000c1:
- Move with history: `.specify/specs/001-session-runway-band/` holds the four files, and `specs/` is no longer tracked. The PR reports `git log --follow` output; this was not re-run here.
- Path-only changes in non-managed files: `docs/development.md`, `CLAUDE.md`, `NOTICE`, `.gitattributes`, the workflow skills (`workflow-common/REFERENCE.md`, `workflow-ticket`, `workflow-branch`, `workflow-manual`) and `spec-review-page` (SKILL.md and a `build.py` comment). Per the PR, `workflow-ticket` uses the new rename step, `feature.json` value, `Spec:` line and escaped `grep` pattern.
- Constitution: the one path in 'Implementation-to-Spec Consistency' is changed. Version is 1.1.1 (PATCH), and Last Amended is 2026-11-14. No rule text changed, which matches the amendment rule for wording changes.
- Managed files: the PR states that no `speckit-*`, `.specify/scripts`, `.specify/templates`, `.specify/integrations` or `.specify/extensions` file changed. Not re-verified here.
- Tests: the PR adds spec-review-page tests for a build under `.specify/specs/` and for refused linked `.specify`/`.specify/specs` parents. It also reports `npm test` and `npm run build` results.
- Documentation: `docs/development.md` states that `/speckit-specify` without a passed folder still writes to root `specs/`, as `#8` requires.

Requirement 'Update the paths that the moved spec gives for itself' is not met. The PR does not change them. This requirement is superseded: the issue carries a dated scope change (2026-11-14) that keeps those references, and the constitution states that a merged feature's spec folder is history. The current constitution text confirms this. Per the task rules, this is not a failing requirement.

Not verifiable from this review, and disclosed by the PR: a real `workflow-ticket` run, a newer Spec Kit version, and wording parity with `tmathura/copilot-plugin-cc`. The local checkout of that repo has no matching change, so the parity requirement has no target yet.

</dd>
</dl>
</details>

<details>
<summary><strong>Full details: Out of Scope Changes check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

Every changed file maps to an issue `#8` objective or to a supporting need:
- Path renames in docs, CLAUDE.md, NOTICE, .gitattributes, workflow skills, spec-review-page and the constitution version bump: direct objectives of `#8`.
- `.specify/specs/.gitignore` (new, hand-written): needed so that `feature.json` files inside the moved spec folders are not ignored by the managed `.specify/.gitignore`. It supports the spec move and the `.specify/feature.json` workflow in `#8`.
- `tests/spec-review-page.test.mjs`: tests for the new location and linked-parent handling, which `#8` requires.
- Historical paths kept in the moved spec, bug folder 007, and the managed Spec Kit files: these are intentional exclusions under the issue's scope change, and the PR lists each with a reason.
- No changes under `plugins/runway/` and no edits to managed Spec Kit files were reported; no unrelated functional change is visible in the described diff.

No change was found that lacks a connection to `#8`.

</dd>
</dl>
</details>

</dd>
</dl>
</details>

<!-- pre_merge_checks_walkthrough_end -->
<!-- tips_start -->



Thanks for using [CodeRabbit](https://coderabbit.ai?utm_source=oss&utm_medium=github&utm_campaign=tmathura/claude-runway&utm_content=11)! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

<details>
<summary><strong>Share</strong></summary>
<dl>
<dd>
<br>

- [X](https://twitter.com/intent/tweet?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A&url=https%3A//coderabbit.ai)
- [Mastodon](https://mastodon.social/share?text=I%20just%20used%20%40coderabbitai%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20the%20proprietary%20code.%20Check%20it%20out%3A%20https%3A%2F%2Fcoderabbit.ai)
- [Reddit](https://www.reddit.com/submit?title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&text=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code.%20Check%20it%20out%3A%20https%3A//coderabbit.ai)
- [LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcoderabbit.ai&mini=true&title=Great%20tool%20for%20code%20review%20-%20CodeRabbit&summary=I%20just%20used%20CodeRabbit%20for%20my%20code%20review%2C%20and%20it%27s%20fantastic%21%20It%27s%20free%20for%20OSS%20and%20offers%20a%20free%20trial%20for%20proprietary%20code)

</dd>
</dl>
</details>

<!-- tips_end -->
<!-- recent_review_start -->

<h6>
<details>
<summary><strong><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/info.svg" width="12" height="12" align="absmiddle" alt=""></picture> Recent review info</strong></summary>
<dl>
<dd>
<br>

<!-- review_info_content -->
<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/cog-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/cog.svg" width="16" height="16" align="absmiddle" alt=""></picture> Run configuration</strong></summary>
<dl>
<dd>
<br>

- **Source mode**: Auto
- **Repository**: Unavailable
- **Branch**: Unavailable
- **File**: No configuration file from this repository applied
- **Commit**: Unavailable
- **Layers**: Organization UI
- **Review profile**: CHILL
- **Plan**: Advanced
- **Run ID**: `e060c2d7-ff39-476a-bb91-139fd3250284`

</dd>
</dl>
</details>

<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/git-commit-horizontal-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/git-commit-horizontal.svg" width="16" height="16" align="absmiddle" alt=""></picture> Commits</strong></summary>
<dl>
<dd>
<br>

Reviewing files that changed from the base of the PR and between 8272418466828d9fc65c75aadcc201dc72b14076 and ff000c1e28eb26361c07c402a5b00b69bc069665.

</dd>
</dl>
</details>

<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-plus-corner-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-plus-corner.svg" width="16" height="16" align="absmiddle" alt=""></picture> Files selected for processing: 17</strong></summary>
<dl>
<dd>
<br>

* `.claude/skills/spec-review-page/SKILL.md`
* `.claude/skills/spec-review-page/build.py`
* `.claude/skills/workflow-branch/SKILL.md`
* `.claude/skills/workflow-common/REFERENCE.md`
* `.claude/skills/workflow-manual/SKILL.md`
* `.claude/skills/workflow-ticket/SKILL.md`
* `.gitattributes`
* `.specify/memory/constitution.md`
* `.specify/specs/.gitignore`
* `.specify/specs/001-session-runway-band/plan.md`
* `.specify/specs/001-session-runway-band/research.md`
* `.specify/specs/001-session-runway-band/spec.md`
* `.specify/specs/001-session-runway-band/tasks.md`
* `CLAUDE.md`
* `NOTICE`
* `docs/development.md`
* `tests/spec-review-page.test.mjs`

</dd>
</dl>
</details>

**Included review availability:** This review used your included allowance. Your plan provides up to 1 included review per hour; 0 remain after this review.

</dd>
</dl>
</details>
</h6>

<!-- recent_review_end -->


<!-- internal state start -->


<!-- [left out: 21144 characters of encoded text] -->

<!-- internal state end -->

***

**Review (COMMENTED, on commit `ff000c1e28eb26361c07c402a5b00b69bc069665`)** by `copilot-pull-request-reviewer[bot]`, 2026-11-14T08:34:34Z, https://github.com/tmathura/claude-runway/pull/11#pullrequestreview-5903190246

<!-- ccr-overview-v2 -->

### 🟢 Approval recommended

No active review issues remain for the migration of feature specs to `.specify/specs/`.

**No open issues** 🎉

<details>
<summary><strong>What changed in this PR</strong></summary>

Moves feature specs under `.specify/specs/`, alongside bug notes, without changing the Runway mod or the historical spec text.

**Changes:**
- Relocates the four existing spec files and updates workflow paths, documentation, and generated-page attributes.
- Adds an ignore-rule exception so `feature.json` files inside spec folders remain trackable.
- Adds coverage for the new location and linked-parent rejection; documents the managed Spec Kit default and migration guidance.

| File | Description |
| ---- | ----------- |
| `tests/​spec-review-page.test.mjs` | Tests the new location and linked-parent rejection. |
| `NOTICE` | Excludes project-owned specs from Spec Kit attribution. |
| `docs/​development.md` | Updates paths and explains defaults, historical references, and ignore rules. |
| `CLAUDE.md` | Updates the repository layout. |
| `.specify/​specs/​001-session-runway-band/​tasks.md` | Moves historical tasks without text changes. |
| `.specify/​specs/​001-session-runway-band/​spec.md` | Moves the historical specification without text changes. |
| `.specify/​specs/​001-session-runway-band/​research.md` | Moves historical decisions without text changes. |
| `.specify/​specs/​001-session-runway-band/​plan.md` | Moves the historical plan without text changes. |
| `.specify/​specs/​.gitignore` | Keeps `feature.json` files inside spec folders trackable. |
| `.specify/​memory/​constitution.md` | Updates the spec path and records a patch amendment. |
| `.gitattributes` | Applies generated-page attributes at the new location. |
| `.claude/​skills/​workflow-ticket/​SKILL.md` | Updates folder renaming, validation, and issue references. |
| `.claude/​skills/​workflow-manual/​SKILL.md` | Passes the new spec paths through the workflow. |
| `.claude/​skills/​workflow-common/​REFERENCE.md` | Updates shared planning and release guidance. |
| `.claude/​skills/​workflow-branch/​SKILL.md` | Updates spec transfer paths for worktrees. |
| `.claude/​skills/​spec-review-page/​SKILL.md` | Updates folder discovery and link-check instructions. |
| `.claude/​skills/​spec-review-page/​build.py` | Updates a path example in a comment only. |
</details>

<sub>Review effort: Balanced</sub>
