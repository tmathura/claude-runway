---
kind: "issue"
number: 1
title: "Show what a session has left in one band above the prompt"
state: "closed"
state_reason: "completed"
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-13T20:50:41Z"
updated_at: "2026-11-13T22:56:53Z"
closed_at: "2026-11-13T22:56:53Z"
url: "https://github.com/tmathura/claude-runway/issues/1"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria"]
---

# Issue #1: Show what a session has left in one band above the prompt

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-13T20:50:41Z, https://github.com/tmathura/claude-runway/issues/1

## Problem

In a Claude Code session, four things can run out: the 5-hour usage limit, the 7-day usage limit, the context window and the prompt cache. Each one is shown in a different place (`/usage`, `/context`, `/cost`) or not shown at all (the prompt cache). You see a limit only when you ask, or when you reach it.

## Expected behaviour

One band above the prompt shows, at all times, how much is left of each thing and when it ends:

- the 5-hour and 7-day limits against the time that has passed in each window, with a forecast of when a limit ends at the present pace;
- the context window in tokens, how it grew over the last prompts, and how many prompts fit before it is full;
- the time before the prompt cache goes cold;
- the session cost and what the last prompt added;
- the number of agents that run.

The part that ends soonest comes first. On a narrow window, the least urgent parts are dropped whole.

## Solution requirements

- A Claude Code mod, `runway`, in `plugins/runway/`, installed from this repo as a marketplace.
- It only watches: every hook passes its event on unchanged. No network, no files, no message sent.
- A part with no reading draws nothing. An account with no usage limits still gets the other parts.
- It works in the terminal, the desktop app and VS Code, on Windows, macOS and Linux.
- Pure functions turn the readings into the band, with `node --test` tests. The hooks have `claude plugin test` tests.

## Acceptance criteria

- [ ] The band shows the 5-hour and 7-day limits with the share used, the time left, and a forecast when the pace would reach the limit before the reset.
- [ ] The band shows the context tokens, the share of the window, a small chart of recent prompts and the prompts left.
- [ ] The band shows the time before the prompt cache goes cold, and says when it is cold.
- [ ] The band shows the session cost and the last prompt's share of it.
- [ ] The band shows the running agents while there are any.
- [ ] A part in a warning state comes before the calm parts, and the band never takes a second row.
- [ ] With no reading at all, the band draws nothing.
- [ ] `npm test`, `npm run build`, `npm run check-version`, `claude plugin validate plugins/runway` and `claude plugin test plugins/runway` pass.

Spec: specs/001-session-runway-band/
