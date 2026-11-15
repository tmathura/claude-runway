---
kind: "release-run"
version: "v0.1.1"
pr: 9
ticket: 7
merge_commit: "8272418466828d9fc65c75aadcc201dc72b14076"
date: "2026-11-14T02:04:13Z"
updated_at: "2026-11-14T07:50:30Z"
url: "https://github.com/tmathura/claude-runway/pull/9#issuecomment-6869875744"
---

# Release run v0.1.1

The result of the release run for [PR #9](../../github/2026/11/pull-009.md), copied from its table comment on GitHub (https://github.com/tmathura/claude-runway/pull/9#issuecomment-6869875744). Do not edit: `npm run history -- export` rewrites this file.

Merge commit: 8272418466828d9fc65c75aadcc201dc72b14076

| Step | Result | Note |
| --- | --- | --- |
| 1 `claude plugin validate` | pass | Exit 0, "Validation passed" |
| 2 `claude plugin test` | pass | Exit 0, 26 tests passed, none failed |
| 3 The band in a real session | pass | On 2026-11-14 the owner read the band in a real session and answered that it matches `/usage`, `/context` and `/cost`. The band was one row. The session used the mod installed from `main` at the merge commit (version 0.1.1), not `--plugin-dir` |
| 4 CI on the merge commit | pass | Push run https://github.com/tmathura/claude-runway/actions/runs/43544091818 ended with success |

Every step passed. The run allows publishing.
