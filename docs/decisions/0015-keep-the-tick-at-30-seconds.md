# 0015. Keep the timer of the band at 30 seconds

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

The band draws again on a timer (`TICK_MS` in `plugins/runway/hooks/runway.ts`), so that its times count down. The owner asked about 15 seconds.

## Options considered

- **15 seconds.** Dropped.
- **An option for the interval.** Dropped.
- **30 seconds, one fixed value.** Kept.

## Decision

The timer stays at 30 seconds, with no option. Reason: the times in the band show minutes, so 15 seconds would double the redraws and the reads with no gain that a person can see. Claude decided; the owner did not object.

## Consequences

- A new part that shows seconds would be a reason to look at this again.
