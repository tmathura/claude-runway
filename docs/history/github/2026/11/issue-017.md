---
kind: "issue"
number: 17
title: "Show the recent pace of the 5-hour limit in the band"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:33:29Z"
updated_at: "2026-11-14T23:39:42Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/17"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Decisions (2026-11-15)","Notes for the run"]
---

# Issue #17: Show the recent pace of the 5-hour limit in the band

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:33:29Z, https://github.com/tmathura/claude-runway/issues/17

## Problem

The band does not show when the usage rises fast right now.

- The forecast `ends in` in a limit part uses the average pace since the window started (`forecast`, `plugins/runway/hooks/lib/limits.ts:21`). A burst in the last minutes barely moves it.
- The rise of the last prompt, `+1.5% 5h`, is in the cost part. It shows one prompt only, and a narrow row drops the cost part.
- The view keeps one 5-hour figure from the start of the session (`mark`, `plugins/runway/hooks/lib/view.ts`), and no readings over time. So the mod cannot say how fast a share rose in the last minutes.

Example: the 5-hour share goes from 35% to 41% in 15 minutes. The band shows `41%` and an `ends in` that is almost the same as before. Nothing says that this pace would use up the limit in about 2 and a half hours.

## Expected behaviour

The `5h` part shows the recent pace of the share, so that the owner sees at a glance when the usage rises fast. The figure is dim at a normal pace, and yellow or red when the recent pace would use up the limit well before the reset.

## Solution requirements

- Keep the last readings of the 5-hour share with their times, for a fixed span. Start with 15 minutes. Keep them in the session's state (`$.state`), not in `$.store`, and keep only what the span needs.
- Decide in the plan how the figure reads, and say why. Two candidates:
  - a rate, for example `+6%/15m` or `+24%/h`;
  - an end time from the recent pace, in the words the band already uses, for example `ends in 2h27m` (recommended: the owner already knows how to read it).
- Decide in the plan how the new figure lives with the `ends in` of today, which uses the average pace: one figure that takes the sooner of the two, or two figures. The row must not get two texts that a reader can mix up.
- The span is one constant in the code. No option.
- Too few readings in the span, a share that went down (a reset), or a reading with no reset time: show no recent pace. Never show a figure from readings of two different windows.
- A reading is taken only when an answer or a measure brought it. The timer adds no reading.
- Say in the plan whether the `7d` part gets the same figure. Start with `5h` only unless the plan shows that `7d` needs it.
- The figure must fit the width rules: say in the plan where it stands when the row is narrow.
- If #16 is merged first: say whether readings that came from another session count for the pace. The pace is the account's, so they should, but only with their own times.
- No network request, no file read and no file write.
- Update `docs/configuration.md` (what the band shows, the colours, and "What the mod keeps").

## Acceptance criteria

- [ ] With readings of 35% and then 41% of the 5-hour share, 15 minutes apart and 4h32m before the reset, the `5h` part shows the recent pace, in a warning colour.
- [ ] With a slow rise, the figure is dim or absent, as the plan decides.
- [ ] With one reading only, or with readings older than the span, no recent pace shows.
- [ ] After a reset of the window (the share goes down, or the reset time changes), no recent pace shows until there are enough new readings.
- [ ] A reading with no reset time breaks nothing.
- [ ] The band is still one row at 80 columns, and the tests for the width rules cover the new figure.
- [ ] `node --test` tests cover the pure function that gives the pace, with the cases above. A hooks test covers one case from an answer to the band.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.


## Decisions (2026-11-15)

These settle the points that the text above leaves to the plan. The plan may depart from one only with a reason, and must then say so in the PR.

- **How the figure reads:** as an end time, in the words the band already uses: `ends in 2h27m`. No rate such as `+6%/15m`.
- **One figure, not two:** the part shows one `ends in`. It is the sooner of the forecast from the average pace (today's rule) and the forecast from the recent pace. So the text and the width of the part are as today; only the value and its colour can change.
- **The span** is 15 minutes, one constant. The recent pace needs at least 2 readings in the span that are at least 2 minutes apart. With fewer, only the average pace is used, as today.
- **The colour** follows the rule of today for `ends in`: the warning colour, and the error colour when the end is within the window's `alertWithin`.
- **`7d`:** not in this ticket. `5h` only.
- **Readings from other sessions** (#16) count, each with its own time.
- **Where the readings are kept:** in the view in `$.state`, as a short list of `{ at, percentUsed, resetsAt }` for the 5-hour window, cut to the span on each new reading. The shape tag of the view changes (`view-3`).

## Notes for the run

- Planning mode: Spec Kit spec flow. Release: minor.
- #19 later makes this figure pulse, and #21 sets the colours of the calm band. Keep the function that says "the recent pace is what drives `ends in`, and it is in the alert range" as one pure function, so that #19 can use it.

Depends on #16
