# 0014. No mode that skips the band reading or reads it once for many tickets

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

The owner asked how to run all open tickets with no question about the band. Six of the eight open tickets were releases.

## Options considered

- **Skip the band reading.** Not possible: the constitution (Principle V) asks for it before each release.
- **A mode that merges every ticket and reads the band once at the end** (named `--publish-last` in the chat). Claude described it and advised against it: nobody could tell which ticket broke the band, and it breaks the rule that each user-facing ticket is its own release.
- **Ask only for the band reading, and do the rest without asking.** Chosen.

## Decision

No ticket was written for a mode that skips or batches the band reading. The owner agreed with the advice. The option `--ask-band` came from this (issue #22).

## Consequences

- A backlog run still stops once for each release, for the band reading.
- The entry of #22: [ticket-022](../history/2026/11/ticket-022.md).
