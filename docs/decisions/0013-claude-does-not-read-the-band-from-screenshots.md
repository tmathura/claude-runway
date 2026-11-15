# 0013. Claude does not read the band from screenshots

- Status: accepted
- Date: 2026-11-14
- Source: session transcript, 2026-11-14. Written on 2026-11-15 from the session transcript, in ticket #24. No ticket recorded this decision.

## Context

Claude cannot see the band, so the owner reads it in each release run. That costs the owner time for each release.

## Options considered

- **Claude sends `/usage`, `/context` and `/cost` as keys to the test window, takes screenshots and compares the numbers itself;** the owner judges only the look. Claude proposed it. Dropped.
- **The owner reads the band.** Kept.

## Decision

The owner said no to the screenshot idea. The points against it, which Claude gave with the proposal: small text can be misread, a screenshot holds the whole screen, sending keys takes the keyboard focus, and a still picture shows no animation.

## Consequences

- "Release run" in `.claude/skills/workflow-common/REFERENCE.md` says that Claude never reads the test session and never types in it, and never judges step 3 itself.
- Issue #22 holds that rule, but not that the other way was proposed and refused.
