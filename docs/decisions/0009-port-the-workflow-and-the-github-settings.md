# 0009. Port the workflow and the GitHub settings from the owner's other plugin repo

- Status: accepted
- Date: 2026-11-13
- Source: session transcript, 2026-11-13 (the session that started the repo). Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

For the first version Claude left out the seven workflow skills of `tmathura/copilot-plugin-cc`, and set up no branch rules, no CodeQL and no bot reviewers. The repo was created private.

## Options considered

- **A small repo with no workflow skills and no GitHub rules.** Claude's first choice. Overruled by the owner.
- **Copy as much as possible from `tmathura/copilot-plugin-cc`.** Chosen.

## Decision

The owner said that the skills should have been ported, and that this repo must copy as much as possible from `tmathura/copilot-plugin-cc`, because that repo holds the owner's way of work. The GitHub settings were copied on the same order: squash merge only, the ruleset on `main`, CodeQL default setup, secret scanning with push protection, and Dependabot. The owner later said that the repo can be public, and it was made public. The reason for private first: not recorded.

## Consequences

- This led to issue #5 ([entry](../history/2026/11/ticket-005.md)), which ported the skills and the docs.
- The two repos share the workflow texts, so a change in one is a reason to look at the other.
