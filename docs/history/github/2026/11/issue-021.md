---
kind: "issue"
number: 21
title: "Give the calm band more colour"
state: "open"
state_reason: null
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:37:44Z"
updated_at: "2026-11-14T23:39:44Z"
closed_at: null
url: "https://github.com/tmathura/claude-runway/issues/21"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Notes for the run"]
---

# Issue #21: Give the calm band more colour

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:37:44Z, https://github.com/tmathura/claude-runway/issues/21

## Problem

The band looks bland when all is fine. It uses colour only to warn.

- The mod has five styles: `plain`, `dim`, `good`, `warn` and `alert` (`Style`, `plugins/runway/hooks/lib/view.ts:13`), drawn with the colours `success`, `warning` and `error` (`LOOKS`, `plugins/runway/hooks/runway.ts:14`).
- When no part warns, almost every run is `plain` or `dim`: the labels (`5h`, `7d`, `ctx`, `cache`), the shares, the chart, the cost and the agents count. Only some cells of a limit bar are `good`.
- So a calm band is one row of grey and white text, and the parts are hard to tell apart at a glance.

## Expected behaviour

A calm band has colour that helps the eye: each part is easy to find, and a healthy limit looks healthy. Yellow and red still mean a warning and nothing else, so a warning stands out as much as today.

## Solution requirements

- Start from this scheme, and say in the plan what was changed and why:
  - the labels `5h`, `7d`, `ctx` and `cache`: the theme's accent colour;
  - the filled cells of a limit bar, while the part is calm: the success colour;
  - the context chart: each bar coloured by its height, from the success colour for a low bar to the warning and error colours for a high one, by the same limits that turn the `ctx` part yellow and red;
  - the cost: one quiet second colour that is not a warning colour;
  - the separators and the secondary figures: dim, as today.
- Use the theme colour names that Claude Code gives (`ThemeColorName` in the type file), not fixed colour codes, so that the band fits a light and a dark theme and a theme that a person changed.
- Yellow and red (the warning and error colours) appear only where the band warns today. The one new use is the high bars of the context chart, which follow the limits of the `ctx` part.
- Colour is never the only sign of a state: each warning keeps its text of today (`ends in`, `reached`, `cache cold`, `~N left`), so the band reads the same with no colour.
- The text and the width of the band do not change. Only styles change.
- The band looks right on every surface that the hooks tests cover (`terminal`, `desktop`, `vscode`).
- No option for the colours in this ticket.
- Update `docs/configuration.md` (the part that says what each colour means).

## Acceptance criteria

- [ ] In a calm band, the labels have the accent colour, and the filled cells of each limit bar have the success colour.
- [ ] The bars of the context chart have a colour by their height, and the limits for yellow and red are those of the `ctx` part.
- [ ] A part that warns looks as it does today: the same runs are yellow or red.
- [ ] No run that is not a warning has the warning or the error colour, except the high bars of the context chart.
- [ ] The text of the band is the same as before for every case in the existing tests.
- [ ] `node --test` tests cover the style of each run for a calm, a warning and an alert case of each part. A hooks test checks the colours of one full band on each surface.
- [ ] `docs/configuration.md` lists each colour and what it means.
- [ ] The PR says that the look in a real terminal, with a light and a dark theme, can only be judged by the owner in the release run.
- [ ] The change is a minor release, with its `CHANGELOG.md` entry.


## Notes for the run

- Order: after #17, so that the scheme also covers the figure that #17 changes. Before the animation tickets (#18, #19, #20), which change the styles of the same runs.
- Planning mode: Spec Kit spec flow (the look of the band changes). Release: minor.
- Add the new styles to `Style` and `LOOKS` only. Do not put colour names in the files under `hooks/lib/`: they give a style, and `runway.ts` maps a style to a colour, as today.
- For the chart, one run per bar is needed in place of one run for the whole chart. Check the width rules with that change.

Depends on #17
