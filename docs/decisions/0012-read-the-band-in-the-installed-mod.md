# 0012. Count a reading of the installed mod as the band reading of v0.1.1 and v0.1.2

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

The release run asks the owner to load the mod with `claude --plugin-dir` from the merge commit and to read the band (constitution, Principle V). The release v0.1.1 waited for that reading, and the backlog run stopped on it.

## Options considered

- **The owner reads the band with `--plugin-dir`.** Claude recommended it.
- **Skip v0.1.1** with a `checked by owner` line in its record. Dropped.
- **Run the next tickets outside the stop rule.** Dropped: it could leave two releases with no GitHub release.
- **Install the mod and read the band there.** Chosen by the owner.

## Decision

The owner said to install the band. Claude installed `runway` 0.1.1 from this repo's marketplace at user scope, at the merge commit, and counted the owner's reading of that copy as step 3 of the release run. The same was done for v0.1.2, with the installed copy updated first. Why a reading of the installed copy counts as step 3: not recorded.

## Consequences

- The run tables say so: "not `--plugin-dir`" ([v0.1.1](../history/2026/11/release-run-v0.1.1.md), [v0.1.2](../history/2026/11/release-run-v0.1.2.md)).
- Claude later called this less clean: the owner's normal sessions ran a version before its release run was complete.
- Ticket #22 then added the test session that the release run opens with `--plugin-dir` ([entry](../history/2026/11/ticket-022.md)).
