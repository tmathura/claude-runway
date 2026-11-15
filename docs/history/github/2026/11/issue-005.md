---
kind: "issue"
number: 5
title: "Add the ticket workflow skills and the missing docs from copilot-plugin-cc"
state: "closed"
state_reason: "completed"
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-13T21:26:06Z"
updated_at: "2026-11-14T00:04:48Z"
closed_at: "2026-11-14T00:04:48Z"
url: "https://github.com/tmathura/claude-runway/issues/5"
headings: ["Problem","Wanted","Not wanted"]
---

# Issue #5: Add the ticket workflow skills and the missing docs from copilot-plugin-cc

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-13T21:26:06Z, https://github.com/tmathura/claude-runway/issues/5

## Problem

The repo has no ticket workflow. The `workflow-*` skills, the spec review page, and the docs for
architecture, configuration and operations exist in `tmathura/copilot-plugin-cc` only. Work on this
repo cannot follow the same steps from ticket to release.

## Wanted

- The skills `workflow-manual`, `workflow-auto`, `workflow-ticket`, `workflow-branch`,
  `workflow-commit`, `workflow-pr`, the shared `workflow-common` files and `spec-review-page`, adapted
  to this repo, with their tests.
- `docs/architecture.md`, `docs/configuration.md` and `docs/operations.md` for the mod.
- `LICENSE` and `NOTICE` in the mod's folder, so that an installed copy carries them.
- `CLAUDE.md`, `README.md`, `docs/development.md` and the constitution name the workflow.

## Not wanted

- The rules for ports from an upstream repo. This repo is not a port.
