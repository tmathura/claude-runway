---
kind: "pull"
number: 12
title: "[#10] Save only the limits that have a reset time"
state: "merged"
draft: false
labels: []
author: "tmathura"
created_at: "2026-11-14T09:49:39Z"
updated_at: "2026-11-14T12:05:37Z"
closed_at: "2026-11-14T09:54:33Z"
merged_at: "2026-11-14T09:54:33Z"
merge_commit: "bec4a35db62253dd2962d0ecdb61823d0ac1907e"
head: "bugfix/10-skip-limit-without-reset"
base: "main"
url: "https://github.com/tmathura/claude-runway/pull/12"
headings: ["Problem","Change","Testing","Plan comparison","Review rounds"]
version_set: "0.1.2"
release_runs: ["v0.1.2"]
---

# PR #12: [#10] Save only the limits that have a reset time

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T09:49:39Z, https://github.com/tmathura/claude-runway/pull/12

## Problem

The mod saved a limit that it can never show from the saved reading (#10).

- `cleanLimits` keeps a limit that has no `resetsAt`, so that the band of its own session shows it.
- `follow` (`plugins/runway/hooks/runway.ts`) saved every limit of the view under the key `limits` in `$.store`.
- `withSaved` takes only a saved limit whose reset time is ahead. So such a limit was saved, but no session showed it. Since #7, the next start of another session deleted the record again.

Nothing wrong showed in the band. The cost was a record with no use, and one delete at each start of another session.

## Change

- `plugins/runway/hooks/runway.ts`, `follow`: it saves only the limits whose reset time is a date (`!Number.isNaN(Date.parse(limit.resetsAt ?? ""))`). The view does not change, so the band of the session shows its own limits as before.
- **The decision that the issue asks for:** a reading that is already saved stays when the view has only limits that cannot be saved. It goes as before: a reading with a limit that can be saved replaces it, the limits leave the account (`follow` deletes it), or its limits are past their reset time (the start of a session deletes it, #7).
  - The first plan deleted it in `follow`. The plan review showed that the start of a session does not go through `follow`, so that rule would not hold there. Keeping it is one rule for every path, and it adds no delete.
  - What this means for users: while the account's newest reading has only limits that cannot be saved, a new session can show an older saved reading, until that reading's own reset times pass.
- `follow` still saves a limit whose reset time has passed, as on `main`: it has no clock reading, the next answer replaces the record, and the start of a session deletes a record with no limit left.
- No contract, option or state shape changed. `hooks/lib/view.ts` did not change.
- Docs: the row for the saved reading in `docs/configuration.md`, and one line of the sequence diagram in `docs/architecture.md`.
- Release: patch, 0.1.2. It is a fix that users do not see in the band of their session. `plugins/runway/CHANGELOG.md` has the entry.
- Bug notes: `.specify/bugs/010-skip-limit-without-reset/` (assessment, fix, test and the review page).

## Testing

Ran locally on Windows, after the last change:

- `npm ci --include=dev`: ok
- `npm run build`: no errors
- `npm test`: 244 passed, 0 failed, 10 skipped
- `npm run check-version`: all version files match 0.1.2
- `claude plugin validate plugins/runway`: Validation passed
- `claude plugin test plugins/runway`: 33 passed, 0 failed

New hooks tests (7): an answer saves its limits that have a reset time; an answer with only limits with no reset time (the band shows them, nothing is saved, no delete call); the same for a reset time that is not a date; the same through `session.measure`; a mixed reading (only the limit with a reset time is saved); a saved reading of another session stays after such an answer; it also stays when the session starts with such a reading. Two existing tests now also check that the store has no record after the limits left the account.

Not checked:

- The new tests were not run against the code before the fix.
- The band in a real session. The release run after the merge does that.
- Whether Claude Code ever reports a limit with no reset time. The type file allows it.

The hooks tests answer the store from a `Map` in the test, not from Claude Code's store. CI runs the automated tests on Windows, macOS and Linux.

## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** the root cause (`follow` saves the view's limits as they are, and `withSaved` can never give back a limit with no reset time); the fix only in `follow` in `plugins/runway/hooks/runway.ts`, with no change to `view.ts`, so the band shows the same; hooks tests for an answer with only limits with no reset time and for a mixed answer; the row in `docs/configuration.md`; the patch release 0.1.2.
- **Where they differ:** what happens to a reading that is already saved when the view has only limits with no reset time. Codex keeps it until its limits are past their reset time. Copilot deletes it, but only when the view had a limit with a reset time before the update. Claude first planned to delete it whenever the view had any limit before the update. Codex also tests the same path through `session.measure`.
- **What Claude took:** first Copilot's rule for the delete. The plan review (2 rounds, both approve at the end) showed that this rule does not cover the start of a session, which does not go through `follow`. The plan then took Codex's rule: keep the saved reading. It is one rule for every path, and it adds no delete. From Codex also: the test through `session.measure`, and store checks in the existing tests.

## Review rounds

Review round (`code-review`, Codex, Copilot): 5 rounds, last result `code-review` approve, Codex approve, Copilot approve. In round 2, both Copilot calls ended with no verdict; the owner said to go on, and Copilot answered and approved in rounds 3, 4 and 5.

Rejected findings:

- code-review: `follow` still saves a limit whose reset time has passed, and no test gives `follow` such a limit: `main` saves it today and the issue is about a limit with no reset time; `follow` has no clock reading, the next answer replaces the record, and the start of a session deletes a record with no limit left (#7).
- code-review: `follow` writes the view's limits on every measure and turn, so an old session can replace a newer saved reading with its old one: `main` behaves so today and the issue does not ask to change it. It can get its own ticket.
- code-review: move the rule "a new session can show this limit" to one function in `view.ts`: the two tests differ on purpose, because `withSaved` also compares with the clock and `follow` has no clock reading; the plan keeps `view.ts` unchanged, and a hooks test covers each form.
- code-review: the sequence diagram shows the save and the delete only under `session.measure`, not under `turn.complete`: `main` has this gap today and the issue does not ask to change the diagram's steps.
- code-review: the deviation entry in `fix.md` is labelled "review round 3" but has the wording of round 4: wording only; the entry is true for the branch as it is.
- code-review: the diagram line says "the limits that can be saved", a term that only `assessment.md` defines: wording only; the line points to `docs/configuration.md`, which holds the rule.

PR review: 1 round, ended. Copilot: no findings. CodeRabbit: no findings.

Closes #10

***

**Comment** by `coderabbitai[bot]`, 2026-11-14T09:49:53Z, https://github.com/tmathura/claude-runway/pull/12#issuecomment-6875469657

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

The `follow` hook now saves only limits with parseable reset times. It preserves an existing saved reading when current limits have no qualifying reset time and retains deletion behavior when the account has no limits. Tests, documentation, bug records, and release metadata are updated.

**Changes: Saved limit persistence**

|Layer / File(s)|Summary|
|:---|:---|
|**Filter saved limits and verify persistence** <br> `.specify/bugs/010-skip-limit-without-reset/assessment.md`, `plugins/runway/hooks/runway.ts`, `plugins/runway/tests/runway.test.ts`|The hook filters limits with `Date.parse` and stores only qualifying limits. Tests cover mixed, missing, and invalid reset times, preservation of an existing reading, and deletion when no limits remain.|
|**Document and release the behavior** <br> `docs/architecture.md`, `docs/configuration.md`, `plugins/runway/CHANGELOG.md`, `package.json`, `plugins/runway/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.specify/bugs/010-skip-limit-without-reset/*`|Documentation and release notes describe the save and retention rules. Version metadata changes to `0.1.2`. Bug records include the fix, verification report, and review page with citation navigation and source filtering.|

<!-- change_assessment_start -->


**Estimated code review effort:** 3 (Moderate) | ~20 minutes

<!-- change_assessment_commit:"a45bfc2829f81fdf3d25a803d3731e804db771a3" -->
<!-- change_assessment_priority:{"version":1,"urgency":"p3","manual":false} -->
**Change:** Bug fix · **Severity of issue fixed:** Low
<!-- change_assessment_end -->

</dd>
</dl>
</details>

<!-- walkthrough_end -->
<details>
<summary><strong>Merge Risk:</strong> <strong><picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/risk-unassessed-16.svg" width="16" height="16" align="absmiddle" alt=""></picture> Minimal</strong> · up to <code>a45bf</code></summary>
<dl>
<dd>
<br>

<!-- final_review_risk_start -->
<!-- final_review_risk_label
**Merge Risk:** **⚪ Minimal** · up to `a45bf`
-->
<!-- final_review_risk_coverage:{"sourceCommitId":"a45bfc2829f81fdf3d25a803d3731e804db771a3","coveredCommitId":"a45bfc2829f81fdf3d25a803d3731e804db771a3","kind":"reviewed"} -->

The change stops saving limits that have no usable reset time, while the in-session band is unchanged. Tests and documentation cover the new rules and the release is a patch version. No merge-blocking risk was found.
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

|         Check name         |                                             Status                                             | Explanation                                                                                                                                                                                                        |
| :------------------------ | :--------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|         Title check        | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | The title "[`#10`] Save only the limits that have a reset time" matches the main change. The PR changes `follow` in plugins/runway/hooks/runway.ts to persist only limits whose `resetsAt` parses as a dat…          |
|     Linked Issues check    | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | [`#10`] Only one active directly linked issue applies. Its coding requirements are met by the PR as described and summarized:<br><br>1. Do not save a limit without a reset time: `follow` in `plugins/runway/ho…    |
| Out of Scope Changes check | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | All changed areas connect to `#10` or to the release steps the issue requires:<br><br>- `plugins/runway/hooks/runway.ts` (`follow`): the fix itself.<br>- `plugins/runway/tests/runway.test.ts`: tests for the requ… |
|      Description Check     | ![Passed](https://storage.googleapis.com/coderabbit_public_assets/pre-merge-checks-passed.svg) | Check skipped - CodeRabbit’s high-level summary is enabled.                                                                                                                                                        |

<details>
<summary><strong>Full details: Title check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

The title "[`#10`] Save only the limits that have a reset time" matches the main change. The PR changes `follow` in plugins/runway/hooks/runway.ts to persist only limits whose `resetsAt` parses as a date, and the tests, docs, and changelog cover the same behavior. The title is specific and concise. The issue number prefix is a minor convention, not a problem.

</dd>
</dl>
</details>

<details>
<summary><strong>Full details: Linked Issues check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

[`#10`] Only one active directly linked issue applies. Its coding requirements are met by the PR as described and summarized:

1. Do not save a limit without a reset time: `follow` in `plugins/runway/hooks/runway.ts` saves only limits where `Date.parse(limit.resetsAt ?? "")` is a number. Limits with a missing or non-date `resetsAt` are not written.
2. Band unchanged: `hooks/lib/view.ts` is not changed, so `cleanLimits` and the session band still show limits without a reset time, as before.
3. Saved reading of limits with reset times unchanged: a reading with a saveable limit still replaces the saved reading.
4. Decision on an existing saved reading: the PR keeps it when the view has only unsaveable limits. The decision is stated in the PR description and in `docs/configuration.md`.
5. No network request, file read, or file write is added. No contract, option, or state shape changes.
6. Docs: the saved-reading row in `docs/configuration.md` is updated.
7. Tests: new hooks tests cover all-unsaveable answers (no save, no delete call), mixed answers (only the saveable limit saved), non-date reset times, the `session.measure` path, a preserved reading of another session, and a new session start with such a reading. Existing tests now check the store after limits leave the account.
8. Patch release 0.1.2 with a `CHANGELOG.md` entry; version files are updated.

Limits of this assessment: the review used the PR description and the change summary only. No repository inspection was run. The new tests were not run against pre-fix code, and the hooks tests use a `Map` rather than Claude Code's store. These limits affect confidence in the test quality. They do not show a missing requirement.

</dd>
</dl>
</details>

<details>
<summary><strong>Full details: Out of Scope Changes check</strong></summary>
<dl>
<dd>
<br>

**Explanation**

All changed areas connect to `#10` or to the release steps the issue requires:

- `plugins/runway/hooks/runway.ts` (`follow`): the fix itself.
- `plugins/runway/tests/runway.test.ts`: tests for the requirements in `#10`.
- `docs/configuration.md` and `docs/architecture.md`: the saved-reading row (required by `#10` when its text changes) and one sequence-diagram line that describes the same save rule.
- `plugins/runway/CHANGELOG.md`, `package.json`, `.claude-plugin/marketplace.json`, `plugins/runway/.claude-plugin/plugin.json`: the patch release and changelog entry that `#10` requires.
- `.specify/bugs/010-skip-limit-without-reset/` (assessment, fix, test, and review HTML): bug notes for `#10`. They describe the same change and do not alter runtime behavior.

No change was found that is unrelated to `#10`. `view.ts` is unchanged, so no band behavior changed beyond the intended fix. `package-lock.json` is in `ignored_files`. It was not inspected, and its absence is not treated as evidence. The version-file check reported in the PR description is not affected by this exclusion for this assessment.

</dd>
</dl>
</details>

</dd>
</dl>
</details>

<!-- pre_merge_checks_walkthrough_end -->
<!-- tips_start -->



Thanks for using [CodeRabbit](https://coderabbit.ai?utm_source=oss&utm_medium=github&utm_campaign=tmathura/claude-runway&utm_content=12)! It's free for OSS, and your support helps us grow. If you like it, consider giving us a shout-out.

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
- **Run ID**: `95227ae6-4c4d-4ad4-9c97-0f75fe9cbb68`

</dd>
</dl>
</details>

<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/git-commit-horizontal-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/git-commit-horizontal.svg" width="16" height="16" align="absmiddle" alt=""></picture> Commits</strong></summary>
<dl>
<dd>
<br>

Reviewing files that changed from the base of the PR and between 9cdb4abf4804baee62617156bcbd3c28d6cc11ec and a45bfc2829f81fdf3d25a803d3731e804db771a3.

</dd>
</dl>
</details>

<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-minus-corner-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-minus-corner.svg" width="16" height="16" align="absmiddle" alt=""></picture> Files ignored due to path filters: 1</strong></summary>
<dl>
<dd>
<br>

* `package-lock.json` is excluded by `!**/package-lock.json`

</dd>
</dl>
</details>

<details>
<summary><strong><picture><source media="(prefers-color-scheme: dark)" srcset="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-plus-corner-dark.svg"><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/file-plus-corner.svg" width="16" height="16" align="absmiddle" alt=""></picture> Files selected for processing: 12</strong></summary>
<dl>
<dd>
<br>

* `.claude-plugin/marketplace.json`
* `.specify/bugs/010-skip-limit-without-reset/assessment.md`
* `.specify/bugs/010-skip-limit-without-reset/fix.md`
* `.specify/bugs/010-skip-limit-without-reset/review.html`
* `.specify/bugs/010-skip-limit-without-reset/test.md`
* `docs/architecture.md`
* `docs/configuration.md`
* `package.json`
* `plugins/runway/.claude-plugin/plugin.json`
* `plugins/runway/CHANGELOG.md`
* `plugins/runway/hooks/runway.ts`
* `plugins/runway/tests/runway.test.ts`

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


<!-- [left out: 17472 characters of encoded text] -->

<!-- internal state end -->

***

**Comment** by `tmathura`, 2026-11-14T12:05:37Z, https://github.com/tmathura/claude-runway/pull/12#issuecomment-6877006029

Release run v0.1.2

Merge commit: bec4a35db62253dd2962d0ecdb61823d0ac1907e

| Step | Result | Note |
| --- | --- | --- |
| 1 `claude plugin validate` | pass | Exit 0, "Validation passed" |
| 2 `claude plugin test` | pass | Exit 0, 33 tests passed, none failed |
| 3 The band in a real session | pass | On 2026-11-14 the owner read the band in a new session and answered that it matches `/usage`, `/context` and `/cost`. The session used the mod installed from `main` at the merge commit (version 0.1.2), not `--plugin-dir` |
| 4 CI on the merge commit | pass | Push run https://github.com/tmathura/claude-runway/actions/runs/43582747667 ended with success |

Every step passed. The run allows publishing.

***

**Review (COMMENTED, on commit `a45bfc2829f81fdf3d25a803d3731e804db771a3`)** by `copilot-pull-request-reviewer[bot]`, 2026-11-14T09:51:16Z, https://github.com/tmathura/claude-runway/pull/12#pullrequestreview-5903541775

<!-- ccr-overview-v2 -->

### 🟢 Approval recommended

No active review issues are recorded for the fix that prevents saving limits with missing or invalid reset times.

**No open issues** 🎉

<details>
<summary><strong>What changed in this PR</strong></summary>

Addresses #10 by preventing Runway from saving limits with missing or invalid reset times, while preserving how the current session displays its limits.

**Changes:**
- Filters saved limits without changing the view; keeps an existing saved reading when no current limit can be saved.
- Adds seven hooks tests and strengthens two existing tests with storage checks.
- Documents the retention rule and verification results, and updates release metadata to 0.1.2.

| File | Description |
| ---- | ----------- |
| `plugins/​runway/​tests/​runway.test.ts` | Tests filtering, display preservation, retention, and deletion. |
| `plugins/​runway/​hooks/​runway.ts` | Saves only limits with parseable reset times. |
| `plugins/​runway/​CHANGELOG.md` | Describes the 0.1.2 fix and retention behavior. |
| `plugins/​runway/​.claude-plugin/​plugin.json` | Updates the plugin version to 0.1.2. |
| `package.json` | Updates the package version to 0.1.2. |
| `package-lock.json` | Synchronizes lockfile version metadata. |
| `docs/​configuration.md` | Clarifies which limits are saved and retained. |
| `docs/​architecture.md` | Updates the diagram’s storage description. |
| `.specify/​bugs/​010-skip-limit-without-reset/​test.md` | Records verification results and remaining limitations. |
| `.specify/​bugs/​010-skip-limit-without-reset/​review.html` | Provides a review companion with embedded source notes. |
| `.specify/​bugs/​010-skip-limit-without-reset/​fix.md` | Records implementation details and plan deviations. |
| `.specify/​bugs/​010-skip-limit-without-reset/​assessment.md` | Documents the root cause and retention decision. |
| `.claude-plugin/​marketplace.json` | Updates marketplace versions to 0.1.2. |
</details>

<sub>Review effort: Balanced</sub>
