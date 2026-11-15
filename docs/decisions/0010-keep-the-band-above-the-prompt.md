# 0010. Keep the band above the prompt

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14 (the session that started the repo). Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

After the first release the owner asked to put the band under the mode line, below the prompt.

## Options considered

- **The status line.** It takes plain text only, with no colours.
- **The hint line.** It is dim and is cut at the end of the row, or the band replaces Claude Code's own hints.
- **The mode labels.** Too small for the band.
- **A `position` setting, default above, as a ticket for 0.2.0.** Claude proposed it. The owner said to leave it.
- **No change.** Chosen.

## Decision

The band stays above the prompt, and there is no setting for its place. No ticket was written. The owner's reason: not recorded.

## Consequences

- A later request for a band below the prompt starts from the three places above and their limits.
