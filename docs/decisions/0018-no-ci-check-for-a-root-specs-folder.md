# 0018. No CI check for a `specs/` folder at the repo root

- Status: accepted
- Date: 2026-11-15
- Source: session transcript, 2026-11-15. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

Since ticket #8 the spec folders are in `.specify/specs/`. `/speckit-specify` with no folder argument still writes to `specs/` at the repo root, because its text is a managed file. Nothing warns when that happens.

## Options considered

- **A CI check that fails when a root `specs/` folder exists,** as a new ticket. Claude offered it. Not taken.
- **No check; the docs say to pass the folder.** Kept.

## Decision

No ticket was written for the check. The owner did not ask for it. Reason: not recorded.

## Consequences

- The rule to pass the folder is in "Spec Kit" in [development.md](../development.md).
- The first real spec after the move will show whether the rule is enough. The entry of #8: [ticket-008](../history/2026/11/ticket-008.md).
