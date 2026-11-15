---
kind: "issue"
number: 25
title: "Fill the history record from the first PC's memory and session transcripts"
state: "closed"
state_reason: "duplicate"
labels: ["documentation","duplicate"]
author: "tmathura"
created_at: "2026-11-15T15:27:39Z"
updated_at: "2026-11-15T15:30:31Z"
closed_at: "2026-11-15T15:30:31Z"
url: "https://github.com/tmathura/claude-runway/issues/25"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Sensitive information"]
---

# Issue #25: Fill the history record from the first PC's memory and session transcripts

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-15T15:27:39Z, https://github.com/tmathura/claude-runway/issues/25

## Problem

#24 backfills the history of each change from what git and GitHub hold. Some facts are in neither. They exist only on the PC that did most of the work on this repo, in Claude Code's own folders for the project (under `~/.claude/projects/`, one folder for the main checkout and one for each worktree):

- the memory files (`memory/`): short notes on how the owner wants the work done, corrections the owner gave, and pointers to resources;
- the session transcripts (`*.jsonl`): the full text of each chat. Only they hold an idea that was dropped in chat, and the reason, when no ticket recorded it.

Neither is in git, and neither reaches another machine. On the PC that filed this ticket, on 2026-11-15, the memory folder for this project is empty and the project folders hold 5 transcripts, last changed on 2026-11-14 and 2026-11-15. The first commits are from 2026-11-13. Claude Code can also remove old transcripts after a time, so this source gets smaller.

After #24, the record marks each fact it could not find as "not recorded" and lists those gaps.

Depends on #24

## Expected behaviour

The facts that only the first PC holds are in the repo: each gap of #24 that a transcript can fill is filled, each decision that had no ticket has an entry, and each memory note that is still true is in the project guidance. Nothing secret or private is copied.

## Solution requirements

- Run this ticket on the PC that did the original work. First check that the project folders there hold a transcript from 2026-11-13, the day of the first commits. If it does not, stop and report: this is the wrong machine.
- Memory: read each memory file. If the memory folder is empty, say so in the PR and go on with the transcripts. Check that it is still true against the current files. Move a note that still applies into `CLAUDE.md` or the doc it belongs to. Do not copy a note that the repo already states.
- Transcripts, gaps: take the list of "not recorded" facts from #24. For each one, search the transcripts of that ticket. A transcript names its branch and its dates, so the sessions of ticket `<n>` are those on the branch `<type>/<n>-<slug>`. Fill the fact in the entry of that ticket, in the field #24 gave it.
- Transcripts, decisions with no ticket: search for an idea that was proposed and dropped, a choice between options, and a limit the owner set, where no issue, PR, spec or bug note records it. Write each as a decision record (ADR), one file in `docs/decisions/`, in the template #24 chose, with the date of the session. Then bring the index up to date as #24 says.
- Mark each added fact with its source, "session transcript" or "memory", and the date. Do not change a fact that #24 took from git or GitHub. If a transcript disagrees with it, keep both and say so.
- Write each entry in your own words, short. Never paste transcript text, tool output or a file that was pasted into a chat.
- Check each added line for a token, password, signed URL, email address or other private detail before the commit (constitution, "Development workflow"). The transcripts hold everything that was typed or pasted, so check with more care than for the GitHub sources.
- Do not commit a transcript or a memory file, and do not copy them to another machine.
- Keep guesses apart from facts. A reason that the transcript does not state stays "not recorded".
- Say in the PR how many gaps were filled, how many stay open, and which sessions could not be read.
- Do not change a file under `plugins/runway/` or `.claude-plugin/marketplace.json` (this is not a release).

## Acceptance criteria

- [ ] The PR says which machine ran the ticket and how many transcripts and memory files it read.
- [ ] Each memory note is in the project guidance, or the PR says why it was left out (not true any more, already stated, or private).
- [ ] Each "not recorded" gap from #24 is filled with its source, or is listed in the PR as still open.
- [ ] Each decision with no ticket that the search found has an entry with its date and the source "session transcript".
- [ ] No entry holds pasted transcript text, and a check finds no token, password, signed URL or private detail.
- [ ] No transcript or memory file is in the commit.
- [ ] `npm run build`, `npm test`, `npm run check-version` and `claude plugin validate plugins/runway` pass.

## Sensitive information

The repo is public, and git keeps each commit for good. A session transcript holds everything that was typed, pasted or printed by a tool, so it is the source with the highest risk. This section is a hard rule for the whole ticket. It uses the rule and the patterns that #24 put in the repo.

What counts:

- secrets: a password, an API key, a token (GitHub, Copilot, OpenAI, Anthropic, a cloud provider), a private key, a connection string, a signed URL, a session cookie, a value from an `.env` file;
- private details: an email address, a phone number, a home folder path that holds a user name, a machine name, and a name or data of an employer, a customer or another project.

The rule:

- Check each added line before each commit, with the pattern search from #24 and a read of the text, because a plain password matches no pattern.
- A find stops the commit and the push. Replace the value with `[removed: <kind>]`, then check again.
- Never print a found value: not in chat, a commit message, a PR, an issue or a log. Report only its kind and where it was.
- Tell the owner about every find, in a transcript, a memory file or the text this ticket writes. No find is fixed in silence.
  - How: keep a list of finds in a file outside the repo (the scratchpad). For each find give the kind and the exact place (the session file and its date, or the memory file). Never give the value. Show the full list in chat at the end of the run.
  - A secret (the first group above) stays on that PC and is not copied. It may still be in use, so tell the owner at once, with a notification if the session can send one, so that the owner can revoke it. The run can go on, because the transcript is not public.
  - The PR and the issue get only the number of finds by kind, and the words "reported to the owner".
  - Do not edit or delete a transcript or a memory file. The owner decides that.
- Do not send transcript or memory text to an outside service. Read the files on that PC only.
- If GitHub push protection blocks a push, stop and report. Never bypass the block.

Add to the acceptance criteria:

- [ ] The PR says which checks ran on the added text and how many finds there were by kind, with no value and no place shown.
- [ ] The owner got the full list of finds in chat, with the kind and the exact place of each, or the words "no finds".

***

**Comment** by `tmathura`, 2026-11-15T15:30:28Z, https://github.com/tmathura/claude-runway/issues/25#issuecomment-6896886673

Duplicate of #24. This PC is the first and only PC for this repo, so the work of this ticket is now Part 5 of #24.
