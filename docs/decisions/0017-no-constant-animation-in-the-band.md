# 0017. No constant animation in the band

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

The owner asked for a more lively band. Claude Code gives a mod some elements that move.

## Options considered

- **An animation that runs all the time.** Dropped: it does work on every frame, it takes the eye away from the prompt, and it can flicker.
- **The `Raster` element.** Dropped: too much for one row of text.
- **Short animations that start on an event and then stop.** Chosen.

## Decision

The band has no constant animation. An animation is short and starts on an event. Claude advised this, and the owner then asked for the tickets.

## Consequences

- The tickets: [#18](../history/github/2026/11/issue-018.md), [#19](../history/github/2026/11/issue-019.md) and [#20](../history/github/2026/11/issue-020.md). They hold the rule, but not the dropped options.
