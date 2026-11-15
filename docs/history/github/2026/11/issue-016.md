---
kind: "issue"
number: 16
title: "Show the newest saved limits reading in every open session"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:26:08Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/16"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Decisions (2026-11-15)","Notes for the run"]
---

# Issue #16: Show the newest saved limits reading in every open session

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:26:08Z, https://github.com/tmathura/claude-runway/issues/16

## Problem

An open session does not show the limits that another session has read since.

- Each session shows the limits of its own last answer. It reads the saved reading of another session only once, at its start, and only when it has no limits of its own (`withSaved`, `plugins/runway/hooks/lib/view.ts:149`).
- The timer (`TICK_MS`, 30 seconds, `plugins/runway/hooks/runway.ts:12`) only draws the band again, so the times count down. It brings no new shares.
- The saved reading (`$.store`, key `limits`) has no time. A session cannot tell whether it is newer than its own reading.

Example from 2026-11-15, two sessions on one account at the same moment: one band showed `5h 41%`, the other `5h 39%`. The second one stays at 39% until its own next answer, however long that takes.

## Expected behaviour

Every open session shows the newest limits reading that any session on this computer has saved, within one tick of the timer. A session never shows a reading that is older than its own.

## Solution requirements

- Save the time of the answer with the limits reading: one record, as today, with one time added. No table and no history of readings.
- The time is the time of the answer that brought the limits, not the time of the save. A turn that sent nothing to the model, or a measure with no new reading of the limits, gives no new time.
- On a tick, a session reads the saved record and takes its limits when the record's time is later than the time of the session's own reading. Otherwise it keeps its own.
- To keep the reads few: a session that got an answer of its own since the last tick does not need the read on that tick. Say in the plan whether this rule is used.
- A session saves its reading only when it is later than the saved one. Say in the plan how this fits with #15, which asks for the same guarantee by another test; if this ticket makes #15 unnecessary, say so there.
- Keep the rules of today: a saved limit whose reset time has passed is not shown, only a limit whose reset time is a date is saved, and the saved reading is deleted when the limits left the account.
- A record that an earlier version saved has no time. Say in the plan how it is read (for example: as older than any reading with a time).
- The session's own figures do not change: the cost mark, the context, the chart and the cache come only from the session's own answers.
- No network request, no file read and no file write. Only `$.store`, `$.state` and the clock, as today.
- Update `docs/configuration.md` ("What the mod keeps") and the diagram in `docs/architecture.md`.

## Acceptance criteria

- [ ] Session A shows `5h 39%`. Session B saves `5h 41%` with a later time. After one tick, session A shows `5h 41%`.
- [ ] A saved record with an earlier time than the session's own reading changes nothing in the band.
- [ ] A turn that sent nothing to the model does not change the saved record or its time.
- [ ] A record with no time, from an earlier version, does not break the band and never replaces a reading that has a time.
- [ ] A session with no person at the prompt (no timer) makes no extra read.
- [ ] A hooks test covers each case above.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.


## Decisions (2026-11-15)

These settle the points that the text above leaves to the plan. The plan may depart from one only with a reason, and must then say so in the PR.

- **This ticket covers #15.** #15 is closed as a duplicate of this one. Its cases are part of this ticket:
  - a turn whose token counts are all zero does not change the saved record or its time (already above);
  - a measure that does not name `rateLimits` in `changed` does not change the saved record or its time;
  - a turn with a real answer, and a measure that names `rateLimits`, save the reading with the time of that event.
- **The time** is `$.clock.now()` at the event that brought the reading. It is saved as a number of milliseconds in the record, next to `limits`.
- **The read on a tick is skipped** when the session saved a reading of its own since the last tick.
- **A record with no time** (from version 0.1.2 or earlier) counts as older than any reading that has a time. At the start of a session it is still shown as today, when the session has no limits of its own.
- **The tick stays at 30 seconds** (`TICK_MS`). No new timer.
- **Which limits a session shows:** the whole newer record replaces the session's limits. Do not mix single windows of two readings.

## Notes for the run

- Order: no dependency. Do it before #17, which builds on the readings with their times.
- Planning mode: Spec Kit spec flow (new behaviour in the mod). Release: minor.
- Add one more acceptance case to the tests: two sessions in one hooks test are not possible, so write the other session's record straight into the test's store before the tick, as the tests of #7 and #10 do.
