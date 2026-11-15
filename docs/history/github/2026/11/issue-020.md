---
kind: "issue"
number: 20
title: "Empty the bar in steps when a limit window resets"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:36:26Z"
updated_at: "2026-11-14T23:39:50Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/20"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Decisions (2026-11-15)","Notes for the run"]
---

# Issue #20: Empty the bar in steps when a limit window resets

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:36:26Z, https://github.com/tmathura/claude-runway/issues/20

## Problem

A reset of a usage limit is easy to miss in the band. When the 5-hour or the 7-day window starts again, the bar and the share jump to their new low value on the next reading, with no sign that a reset happened.

## Expected behaviour

When a reading shows that a limit window started again, its bar empties in a few steps over 1 to 2 seconds, down to the new share. Then the band is still again.

## Solution requirements

- A reset is seen from the readings the mod already has: for the same window, the reset time is later than before and the share is lower. Say the exact test in the plan. A share that goes down with the same reset time is not a reset.
- The animation changes only the cells of the bar (`CELLS`, `plugins/runway/hooks/lib/limits.ts`). The share, the time and the width of the row show their new values from the first frame, so nothing moves sideways.
- A fast timer runs only during the animation and is cancelled when it ends. At any other time the mod makes no extra redraw.
- It applies to the `5h` and the `7d` part. If both reset in one reading, both animate together on one timer.
- A new session that starts after a reset shows no animation: there is no earlier reading in that session.
- A run with no person at the prompt starts no timer.
- `/clear`, a resume, the end of the session and a new reading during the animation: the timer is cancelled, and no timer is left over.
- If another ticket already added a shared way to run a short animation in the band, use it.
- No network request, no file read and no file write.
- Update `docs/configuration.md` and `docs/architecture.md`.

## Acceptance criteria

- [ ] After a reading with a later reset time and a lower share for a window, the bar of that part goes down in steps over the set time and ends at the new share.
- [ ] The text of the share and of the time is the new value in every frame.
- [ ] A lower share with the same reset time starts no animation.
- [ ] The first reading of a session starts no animation.
- [ ] After the animation, after `/clear`, and after the end of the session, no animation timer is left.
- [ ] A run with no person at the prompt starts no animation.
- [ ] Hooks tests cover the cases above with the test clock, and `node --test` tests cover the pure function that gives the bar of a frame.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.


## Decisions (2026-11-15)

- **The test for a reset:** for the same window, the new reading has a later `resetsAt` than the reading before it in this session, and a lower `percentUsed`.
- **The frames:** the bar goes from the old number of filled cells to the new one, one cell for each frame, 150 milliseconds apart. With 8 cells that is 1.2 seconds at most.
- Use the shared way to animate from #18.

## Notes for the run

- Planning mode: Spec Kit spec flow. Release: minor.

Depends on #18
