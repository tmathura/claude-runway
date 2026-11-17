---
kind: "issue"
number: 19
title: "Pulse the recent pace figure while the pace is high"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:36:23Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/19"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Decisions (2026-11-15)","Notes for the run"]
---

# Issue #19: Pulse the recent pace figure while the pace is high

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:36:23Z, https://github.com/tmathura/claude-runway/issues/19

## Problem

#17 adds the recent pace of the 5-hour limit to the band, with a warning colour when the pace is high. A colour alone is easy to overlook while the owner types, because the band never moves.

## Expected behaviour

While the recent pace of the 5-hour limit is high, the pace figure pulses slowly between its warning colour and dim. When the pace is normal again, the figure is still.

## Solution requirements

- "High" is the same test that #17 uses for its strongest warning colour. Add no second threshold.
- The pulse is slow: say in the plan how many redraws a minute, and keep it well below the limit that Claude Code gives for the band. Only the style changes, never the text or the width.
- The timer for the pulse runs only while the pace is high. It is cancelled as soon as the pace is normal, and by `/clear`, a resume and the end of the session.
- A run with no person at the prompt starts no timer.
- Say in the plan whether the pulse stops by itself after some time when the owner does nothing (for example after a few minutes), so that an idle session does not redraw with no end.
- If another ticket already added a shared way to run an animation in the band, use it.
- No network request, no file read and no file write.
- Update `docs/configuration.md` and `docs/architecture.md`.

## Acceptance criteria

- [ ] With a high recent pace, the style of the pace figure changes between two values on the pulse timer, and the text stays the same.
- [ ] With a normal pace, there is no pulse and no extra timer.
- [ ] When the pace goes from high to normal, the pulse timer is cancelled.
- [ ] After `/clear` and after the end of the session, no pulse timer is left.
- [ ] A run with no person at the prompt starts no pulse.
- [ ] Hooks tests cover the cases above with the test clock.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.



## Decisions (2026-11-15)

- **What pulses:** the `ends in` text of the `5h` part, when the recent pace (not the average pace) gives its value and it is in the alert range. #17 has one pure function for this test.
- **The pulse:** one change of style every 1.5 seconds, between the error colour and dim.
- **It stops by itself** after 2 minutes with no new reading. A new reading that is still high starts it again.
- Use the shared way to animate from #18.

## Notes for the run

- Planning mode: Spec Kit spec flow. Release: minor.

Depends on #18
