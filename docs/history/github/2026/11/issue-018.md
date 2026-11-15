---
kind: "issue"
number: 18
title: "Burn the 5-hour share into its new value after a prompt"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:36:20Z"
updated_at: "2026-11-14T23:48:50Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/18"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Notes for the run"]
---

# Issue #18: Burn the 5-hour share into its new value after a prompt

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:36:20Z, https://github.com/tmathura/claude-runway/issues/18

## Problem

A costly prompt is easy to miss in the band. When one prompt takes a large share of the 5-hour limit, the `5h` share changes to its new value at once and looks the same as after a cheap prompt. The rise of the last prompt (`+1.5% 5h`) is in the cost part, which a narrow row drops.

The band is still at all times. Its only timer is `TICK_MS`, 30 seconds (`plugins/runway/hooks/runway.ts:12`), which draws the times again.

## Expected behaviour

When a prompt of the main thread raises the 5-hour share, the old number "burns" into the new one: for a short time the digits of the share show as block characters in fire colours, and then the new number shows. The size of the burn follows the size of the rise, so a costly prompt is easy to see and a cheap one is quiet. After the animation the band is still again.

Example of the full burn, one frame for each line:

```
39%   the old value
3▓%   the digits start to burn
▒▓▒   all burning
░▒░   dying down
41%   the new value, bright
41%   the new value, normal
```

## Solution requirements

- The rise is the one the mod already has for the last prompt (the difference to the mark in the view). Add no new stored figure for it. The old value for the first frames is the share that the band showed before this answer.
- Three steps, by the rise of the 5-hour share from one prompt of the main thread:

  | Rise | Animation |
  | --- | --- |
  | Under 1 point | None. The number changes as today. |
  | 1 point or more, under 3 points | A short ember: 2 frames. |
  | 3 points or more | The full burn: the 6 frames of the example. |

  The two limits (1 and 3) are constants in the code. No option.
- The frames are 150 milliseconds apart. The full burn ends in under 1 second.
- The width of the share never changes during the animation: each frame has as many characters as the wider of the old and the new value, so nothing in the row moves sideways. Only the characters and the style of the share change. The rest of the band is as in a still band.
- The characters are `░`, `▒` and `▓`. No emoji, because an emoji has another width in some terminals.
- The fire colours are a small fixed set from red through orange to yellow. They may be colour codes, because the theme has no orange. Say the codes in the plan, and check that each can be read on a light and on a dark background. They are used only in this animation.
- The animation runs only for a rise. A share that goes down, or a reset, starts no burn (#20 handles a reset).
- A fast timer runs only during the animation and is cancelled when it ends. The 30-second tick stays as it is. At any other time the mod makes no extra redraw.
- A run with no person at the prompt starts no timer, as today.
- `/clear`, a resume, the end of the session and a new answer during the animation: the timer is cancelled, the band shows the newest value, and no timer is left over.
- A subagent's turn starts no animation. A new value that came from another session's saved reading (#16) starts no animation: it is not this session's prompt.
- This ticket builds the shared way to run a short animation: one small function in `runway.ts` that runs N frames on `$.clock.every`, calls `$.ui.invalidate("ui.render")` on each, and cancels itself. #19 and #20 use it.
- The frames come from a pure function in `hooks/lib/` that takes the old value, the new value and the frame number, and gives the runs of the share. `runway.ts` maps the styles to colours, as today.
- No network request, no file read and no file write.
- Update `docs/configuration.md` (what the band shows, and the colours) and `docs/architecture.md` (the timer).

## Acceptance criteria

- [ ] After a prompt that raises the 5-hour share by 3 points or more, the share shows the 6 frames in order, 150 milliseconds apart, and then the new value in its normal style.
- [ ] After a rise of 1 point or more and under 3 points, the share shows the 2 frames of the ember and then the new value.
- [ ] After a rise under 1 point, a fall or a reset, there is no animation and no fast timer.
- [ ] In every frame the share has the same number of characters, and the rest of the band has the same text as a still band.
- [ ] A change from `9%` to `12%` and from `98%` to `100%` keeps the width rule (the wider value sets the width).
- [ ] After the animation, after `/clear`, and after the end of the session, the test clock has no timer left but the 30-second tick (or none, at the end).
- [ ] A new answer during the animation ends it, and the band shows the newest value.
- [ ] A run with no person at the prompt, a subagent's turn, and a value from another session's saved reading start no animation.
- [ ] `node --test` tests cover the pure function for each step and for the width cases. Hooks tests cover the timer cases with the test clock.
- [ ] The PR says that the look in a real terminal (the block characters, the colours, smooth or flicker) can only be judged by the owner in the release run.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.

## Notes for the run

- Planning mode: Spec Kit spec flow. Release: minor.
- 2026-11-15: scope change. This ticket first asked for a plain flash of the share at 3 points or more. The owner asked for the burn in its place, with the three steps above.

Depends on #21
