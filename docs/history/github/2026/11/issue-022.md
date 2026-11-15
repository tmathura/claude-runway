---
kind: "issue"
number: 22
title: "Add an --ask-band option to workflow-auto, and open the test session for the owner"
state: "closed"
state_reason: "completed"
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-14T23:41:50Z"
closed_at: "2026-11-15T07:11:16Z"
url: "https://github.com/tmathura/claude-runway/issues/22"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Notes for the run","Added 2026-11-15: open the test session for the owner","Plan comparison"]
---

# Issue #22: Add an --ask-band option to workflow-auto, and open the test session for the owner

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-14T23:41:50Z, https://github.com/tmathura/claude-runway/issues/22

## Problem

`workflow-auto` has no way to ask the owner only for the band reading.

- Without `--ask-merge`, step 3 of the release run is `unsure`, because the owner is not asked ("Publish the release" row in `.claude/skills/workflow-auto/SKILL.md`, and step 3 in "Release run" in `.claude/skills/workflow-common/REFERENCE.md`). The release then waits for the owner, and the run stops early, because later releases must wait for it.
- With `--ask-merge`, the run asks for the band reading, but it also asks before each merge and before each release is published.

So a backlog of several release tickets cannot run in one go. On 2026-11-14 a run stopped after its first release (v0.1.1) for this reason, and the owner had to start it again. Eight tickets are open now (#13 to #21), and six of them are releases.

Only the owner can read the band, so that one question cannot go away. The merge and publish questions can.

## Expected behaviour

`/workflow-auto --ask-band` runs as `/workflow-auto` does: it merges each PR that is ready and publishes each release whose run allows it, without asking. It asks the owner one question for each release: step 3 of the release run, the band reading. The run goes on with the next ticket after the answer.

## Solution requirements

- Add the argument `--ask-band` to `workflow-auto` ("Input"). It can stand alone or with an issue number. With `--ask-merge` it changes nothing, because `--ask-merge` already asks for the band.
- With `--ask-band`, step 3 of the release run asks as `workflow-manual` does: it gives the owner the command with the path of the release worktree, and asks **The band matches** / **It does not match** / **Not now**.
  - "The band matches": step 3 is `pass`. If the run then allows publishing, publish without a further question.
  - "It does not match": step 3 is `fail`, with what the owner saw. "Result" creates the fix ticket, as today.
  - "Not now": step 3 is `unsure`. The release waits for the owner and the run stops early, as today without the flag.
- The question is asked only after steps 1, 2 and 4 are done or running, so that the owner is not asked for a release that already failed. Say the exact order in the skill text.
- The owner must close their test session before cleanup removes the release worktree. Keep that rule, and say it in the question.
- The report's first lines give the mode: `ask-merge: no`, and a new line `ask-band: yes` or `ask-band: no`. After a summary of the conversation the run reads the mode from there. If it cannot read the mode, it uses `--ask-merge`, as today.
- "Never end the turn to ask" in "Each ticket" gets this one exception, next to the one for `--ask-merge`.
- The permission rule in "Commit and push rules" in `REFERENCE.md`, and the line in the constitution about a merge without the owner's answer, speak of a run "without `--ask-merge`". Check that their words still fit a run with `--ask-band`, and change only the words that do not. If the constitution's text must change, follow its amendment rule (a PATCH version).
- Update `docs/development.md` where it describes `/workflow-auto` and the release run.
- Change no file of the mod. This ticket is not a release.

## Acceptance criteria

- [ ] `workflow-auto` "Input" names `--ask-band`, alone and with an issue number, and says what it does with `--ask-merge`.
- [ ] The "Publish the release" row and step 3 of "Release run" say what happens with `--ask-band` for each of the three answers.
- [ ] The report section of `workflow-auto` names the `ask-band` line.
- [ ] A search of the workflow skills and `docs/development.md` for `--ask-merge` shows no place that is now wrong or leaves `--ask-band` out where the rule is about asking for the band.
- [ ] `npm test` and `npm run build` pass.
- [ ] The PR says that the flag was not tried in a real run, because the skill text is read at the start of a run.

## Notes for the run

- Order: before the release tickets (#16 and later). It blocks nothing by a `Depends on` line, but the owner wants to use the flag for them.
- Planning mode: Claude plan mode (the workflow, no mod file). Not a release.
- The new flag takes effect only in a run that starts after this ticket is merged.


## Added 2026-11-15: open the test session for the owner

The owner asked that the run does as much of step 3 as it can, so that the owner only looks and answers.

Requirements:

- With `--ask-band` (and with `--ask-merge`, and in `workflow-manual`), step 3 of the release run opens the test session for the owner before it asks the question:
  - it opens a new terminal window on the owner's system;
  - in that window it starts `claude --settings '{"enabledPlugins":{"runway@tmathura-runway":false}}' --plugin-dir "<release worktree>/plugins/runway"` with one short first prompt as its argument, so that the band has values when the owner looks. The first prompt is a fixed, harmless text, for example "Say OK.";
  - then it asks the question. The question says what the owner does: type `/usage`, `/context` and `/cost` in that window, compare them with the band, close the window, and answer.
- The run never reads that session, never types in it and never judges the band. Claude cannot see the band; only the owner's answer counts, as today.
- Write the command to open the window for Windows, the owner's system (`node -p process.platform` prints `win32`). On any other system, or when the window cannot be opened, the run shows the command for the owner to paste, as today. This is one exception to "Shell and paths" in `REFERENCE.md` ("do not use PowerShell"): say so there, and keep it to this one step.
- The safety rules of the release run hold: the real `claude` CLI and the login already there, no token printed or stored, no environment printed.
- The window stays open until the owner closes it. Cleanup of the release worktree comes after the owner's answer; if the folder is still in use, cleanup reports it as today.
- If the open step fails, that is not a failed release step: the run falls back to showing the command.

Acceptance criteria:

- [ ] Step 3 in "Release run" in `REFERENCE.md` says how the window is opened on Windows, what the first prompt is, and what happens on another system or on a failure.
- [ ] The question text names the three commands to type and says to close the window before the answer.
- [ ] The PR shows one try of the open command on the owner's system and its exit code. The run does not wait for the owner for this: the PR says that the owner sees the window for the first time at the next release.



## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone, before they saw Claude's plan.

- **Where the plans agree:** the flag in `workflow-auto` ("Input", the report lines, the exception to "never ask", the "Publish the release" row); the order of the release run steps (1, 2, then step 4 started, then step 3); the three answers; the fallback to the pasted command; the changes to `workflow-manual` and `docs/development.md`; no change to the words about the merge permission.
- **Where they differ:** Codex and Copilot open the window with a `powershell.exe ... Start-Process` command in the skill text, with an exception in "Shell and paths". Codex also adds an exception to Principle IV of the constitution; Copilot sees no need for a constitution change. Claude uses a Node script that runs `cmd.exe /c start` with an argument list, and a settings file in place of the JSON string. That needs no quoting by hand and no PowerShell, and its argument list and failure paths can be tested.
- **What Claude took:** from both, the exact order of the steps and "do not ask after a failure". From Copilot: `ask-band` in the report is `yes` only for `--ask-band`. Not taken: the PowerShell command and the constitution change.
- **From the plan review (3 rounds, both approve at the end):** no `windowsHide` for the start (it would hide the window); refuse a path with a character that `cmd` reads (`&`, `%` and others); inject the launcher so that tests cover a failed start; a narrow exception for `cmd` in "Shell and paths"; the record of a run on another system gives the command to paste; single quotes in the printed command; a check of the settings file before the start; `NOTICE` stays as it is.

2026-11-15: scope change. The window is opened by a Node script (`open-band-session.mjs`) that calls `cmd.exe /c start`, not by a PowerShell command. So the exception in "Shell and paths" is for `cmd` in that one script, and PowerShell stays forbidden.
