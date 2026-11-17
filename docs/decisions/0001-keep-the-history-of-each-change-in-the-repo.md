# 0001. Keep the history of each change in the repo

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15. The decision was made before a ticket existed, and it led to
  [issue #24](../history/github/2026/11/issue-024.md).

## Context

Much of the history of this project was stored only on GitHub: the issue text, the PR text, the
plan of a ticket that touches no mod file, the release run table, and each decision that never
became a ticket. More facts were only in the session files of one PC. A new session, of a
person or an agent, reads only what a clone of the repo holds. It sees the code, but not why a
thing changed, which idea was dropped, or what was still to try.

The owner saw the video "Why I Keep a Dev Log When I Code with AI" by Patrick God
(<https://www.youtube.com/watch?v=Al4NWPMXkHo>) and gave its points. The repo already used the
same reason once: the `CHANGELOG.md` summary is in the repo so that it survives a move away
from GitHub.

## Options considered

- **Leave the history on GitHub.** It costs nothing. It is lost when the issues are lost or the
  project moves, and a clone does not hold it. Rejected.
- **Keep the history in the repo.** A clone holds all of it. It costs a step for each ticket and
  a one-time backfill. Chosen.

## Decision

The repo holds, for each change, what changed, why, which options were dropped, what was
checked, and where the work stopped. A reader with only a clone can read it, with no network.
The changes that were already merged are filled in from the sources that still give the facts.
Nothing secret or private is copied.

## Consequences

- The form of the record is in [0002](0002-the-form-of-the-history-record.md).
- Each ticket leaves its record with no step that a person can forget
  ([0006](0006-write-the-history-of-a-ticket-once-in-the-pr-body.md),
  [0007](0007-export-in-its-own-pr-as-the-last-step.md)).
- The repo is public, so each text is checked for sensitive content before its commit.
- A fact that no source gives says `not recorded`. Nobody writes a reason that no source states.
