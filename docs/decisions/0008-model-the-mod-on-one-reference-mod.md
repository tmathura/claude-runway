# 0008. Model the mod on one reference mod, and drop the trial mod

- Status: accepted
- Date: 2026-11-13
- Source: session transcript, 2026-11-13 (the session that started the repo). Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

Before the repo existed, Claude built a small trial mod named `usage-band`. It showed only the 5-hour and the weekly limit with their reset times. Claude had also listed about a dozen public mods that show usage.

## Options considered

- **Keep the trial mod and grow it.** Dropped by the owner.
- **Build a fuller mod with the functions of one reference mod.** Chosen. The owner picked one mod from the list as the model.
- **The other mods on the list.** Dropped. Reason: not recorded.

## Decision

The owner asked for a fuller mod, with the functions of the reference mod, and said that the trial mod must be removed at the end. Claude deleted the trial mod after PR #4 was opened. The code of `runway` is written in this repo; only the idea comes from the reference mod.

## Consequences

- The reference mod is credited in [`NOTICE`](../../NOTICE), and what was taken and left out is in [`research.md`](../../.specify/specs/001-session-runway-band/research.md) §2.
- The trial mod is in no repo.
