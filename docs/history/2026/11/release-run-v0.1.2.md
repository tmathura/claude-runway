---
kind: "release-run"
version: "v0.1.2"
pr: 12
ticket: 10
merge_commit: "bec4a35db62253dd2962d0ecdb61823d0ac1907e"
date: "2026-11-14T12:05:37Z"
url: "https://github.com/tmathura/claude-runway/pull/12#issuecomment-6877006029"
---

# Release run v0.1.2

The result of the release run for [PR #12](../../github/2026/11/pull-012.md), copied from its table comment on GitHub (https://github.com/tmathura/claude-runway/pull/12#issuecomment-6877006029). Do not edit: `npm run history -- export` rewrites this file.

Merge commit: bec4a35db62253dd2962d0ecdb61823d0ac1907e

| Step | Result | Note |
| --- | --- | --- |
| 1 `claude plugin validate` | pass | Exit 0, "Validation passed" |
| 2 `claude plugin test` | pass | Exit 0, 33 tests passed, none failed |
| 3 The band in a real session | pass | On 2026-11-14 the owner read the band in a new session and answered that it matches `/usage`, `/context` and `/cost`. The session used the mod installed from `main` at the merge commit (version 0.1.2), not `--plugin-dir` |
| 4 CI on the merge commit | pass | Push run https://github.com/tmathura/claude-runway/actions/runs/43582747667 ended with success |

Every step passed. The run allows publishing.
