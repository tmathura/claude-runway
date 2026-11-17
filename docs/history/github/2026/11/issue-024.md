---
kind: "issue"
number: 24
title: "Keep the history of each change in the repo, and backfill it"
state: "closed"
state_reason: "completed"
labels: ["enhancement"]
author: "tmathura"
created_at: "2026-11-15T15:27:35Z"
closed_at: "2026-11-17T20:49:25Z"
url: "https://github.com/tmathura/claude-runway/issues/24"
headings: ["Problem","Expected behaviour","Solution requirements","Acceptance criteria","Sensitive information","The devlog video","Plan comparison"]
---

# Issue #24: Keep the history of each change in the repo, and backfill it

Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.

***

**Body** by `tmathura`, 2026-11-15T15:27:35Z, https://github.com/tmathura/claude-runway/issues/24

## Problem

Much of the history of this project is stored only on GitHub. If the issues are lost, or the project moves to another system, that history is gone.

What git keeps today:

- the code and docs;
- for changes to the mod, the reasons, in `.specify/specs/` (1 folder) and `.specify/bugs/` (2 folders);
- `plugins/runway/CHANGELOG.md`;
- the review rounds and rejected findings, because the squash commit holds the message of each branch commit. The repo setting is `squash_merge_commit_message=COMMIT_MESSAGES`. For example, the body of commit `d0afdda` (#22, PR #23) is 195 lines of round commits, and holds none of the PR body.

What only GitHub keeps (on 2026-11-15: 15 issues, 7 of them closed; 8 merged PRs; 3 releases):

- the issue text: problem, requirements, acceptance criteria and `## Plan comparison`;
- the PR body: `## Change` and `## Testing`;
- the plan of a ticket that touches no mod file. "Ticket workflow", step 1, in `docs/development.md` says: "A plan made in Claude plan mode is not saved in the repo";
- the release run table, which is a comment on the merged PR ("Release" in `docs/development.md`);
- a decision that never became a ticket, for example an idea that was dropped in chat.

What only this PC keeps, in Claude Code's own folders for the project (under `~/.claude/projects/`, one folder for the main checkout and one for each worktree):

- the memory files (`memory/`): short notes on how the owner wants the work done, corrections the owner gave, and pointers to resources. On 2026-11-15 this folder is empty;
- the session transcripts (`*.jsonl`): the full text of each chat. Only they hold an idea that was dropped in chat, and the reason, when no ticket recorded it. On 2026-11-15 there are 5, last changed on 2026-11-14 and 2026-11-15;
- the chat that started this repo, session `4c4f3520-4d98-4f21-a86f-8245d889f4dc`. It ran from 2026-11-13 to 2026-11-14 in the folder of another project, so its transcript is not in the folders of this project. The first commits are from 2026-11-13, so this chat holds the first decisions.

Neither is in git. This PC is the first and the only one that worked on this repo, so no other machine holds them. Claude Code can also remove old transcripts after a time, so this source gets smaller.

A new session, on this machine or another, can read only what git and GitHub hold. The repo already uses this reason once: the `CHANGELOG.md` summary "lives in the repo, so it survives a move away from GitHub" ("Release" in `docs/development.md`).

## Expected behaviour

The repo holds, for each change, what changed, why, which options were dropped, what was checked, and where the work stopped. A person or an agent with only a clone of the repo can read it, with no access to GitHub. The same holds for the changes that are already merged, as far as the sources still give the facts. The facts that only this PC holds are in the repo too, and nothing secret or private is copied.

## Solution requirements

Part 1: choose the form.

- Start from the devlog video that led to this ticket. Its points are in "The devlog video", below. For each point, say whether the chosen form covers it, and how.
- tmathura/copilot-plugin-cc#162 asks for the same record in that repo. If it is merged first, start from its comparison and its decision records. Check that each point still holds for this repo, and use the same form unless this repo gives a reason not to. Say in the PR what was taken from it.
- Search the web for the existing standards and common practice for this kind of record before choosing. Do not work from memory alone. Give the source (a link) for each one that is compared. At least: architecture decision records (Nygard's ADR and MADR), Keep a Changelog, a dated devlog file, the PR body as the squash commit message (`squash_merge_commit_message=PR_BODY`), and git notes. Add others that the search finds.
- Compare them on these points: it survives a move away from GitHub; it needs no second copy written by hand ("Each fact lives in one file", `docs/conventions.md`); it works with two machines and with tickets in worktrees at the same time, with no merge conflict on a shared file; the cost for each ticket; a new agent session can find the current state fast; it holds events after the merge (the release run) and decisions with no ticket.
- Write the choice, the reason and the rejected options into the repo, in the form that is chosen.
- The owner decided these points on 2026-11-15 for tmathura/copilot-plugin-cc#162. They apply to this repo too. The comparison still covers them, and it chooses the details (which ADR template, the folder names, the fields), but it does not reopen them:
  - **Decisions are architecture decision records (ADRs).** One file for each decision, in the folder `docs/decisions/`, with a number and a short title in the file name. An accepted record is not rewritten. A later decision gets a new record that says which one it replaces, and the old one gets only a status line that points to it.
  - **No file grows without limit.** One file for each entry (a decision, a ticket's history entry, an exported issue, PR or release). No shared log file that each ticket adds to.
  - **Entries are split by time.** The history entries and the exported files sit in folders by the year and month of the event (for a ticket: its merge date). Time fits better than version here, because most tickets are not a release and so have no version of their own.
  - **An index and a "current state" page.** The index lists the entries, split by time as the entries are. The current-state page is short and is the first page a new session reads: where the work stands, the last release, what is open, and links to the entries that matter now. It gives its date and links to facts; it does not repeat them.
  - **No database.** The text files are the source. A search index built from them is allowed only if it stays out of git.
- Two tickets that merge at the same time must not edit the same line of a shared page. So the index and the current-state page are built from the entries by a command, or are split so that a ticket adds a file and edits no shared list. Say which, and how a stale page is found (for example a check in `npm test`).
- The owner also decided these points on 2026-11-15 for that ticket, on Claude's advice. They apply here too:
  - **`main` is not rewritten, also not once for this ticket.** Editing the old commit messages gives each of the commits on `main` a new ID. That breaks the clones of users who installed the mod, the 3 release tags, the link from each commit to its PR (the start check of `workflow-auto` uses it), and each place that names a commit ID.
  - **A ticket's history is written once, in the PR body. Nobody writes a history file by hand.** The squash commit keeps the PR body on `main`. An old ticket gets one backfilled file. A new ticket gets its file from the export, by a command, after its merge (the next point).
  - **The export is its own PR, as the very last step of the workflow.** After a ticket's PR is merged and its cleanup is done (and after its release run and its release, if it is a release), the workflow makes a second PR, the export PR. It holds only files that the export command wrote: the ticket's issue, its PR, its release and its release run result, and the index and current-state page. A commit message cannot be corrected and a zip download has no git history, so the file is the copy that can be fixed and that every copy of the repo holds.
- The export PR needs these rules. Write them into the workflow skills and `docs/development.md`:
  - It uses the ticket's own issue number, in the branch name and the commit subject.
  - The owner decided on 2026-11-15 that the rules must allow the export PR. Today they do not. Amend the constitution (`.specify/memory/constitution.md`, "Development workflow") in this ticket's PR, and raise its version as "Governance" says, with the level and the reason in the PR body. The amendment allows only this case, and names its limits:
    - "Each change has one GitHub issue and one branch": a ticket may have one more branch and PR, the export PR, after its own PR is merged.
    - "A PR is merged only when ... the Codex and Copilot review loop ... finished": an export PR holds only files made by the export command, so it merges without that loop. Tests and CI must still pass, and the bot reviewers' loop still runs.
    - An export PR that holds a hand-written change is not an export PR. It follows the full rules.
  - Carry the same exception into the texts that repeat these rules: "Commit and push rules" in `REFERENCE.md` (the merge answer covers the export PR), "Ticket workflow" in `docs/development.md`, and the workflow skills.
  - An export PR is not exported itself. This stops the loop. Its record is its squash commit.
  - It holds no hand-written change, so it needs no plan, no blind plan and no Codex and Copilot rounds. CI must pass, as the ruleset asks, and the bot reviewers still review it. A bot finding on exported text is rejected by rule, because the text is a copy; a finding on the command or the index is checked as usual. Say this in the PR body, as the constitution asks for a reviewer that did not run.
  - The owner's answer to the merge question of the ticket also covers its export PR. `workflow-manual` does not ask a second time.
  - The export command writes each item that is merged and not yet exported, not only the ticket of this run. So a ticket whose export PR failed, or that was merged by hand, is picked up by the next run.
  - If the export PR cannot be made or merged, the ticket is still done. Report it, and leave it for the next run.
  - The sensitive-information rule below applies to each export PR.
- For these points, look at what other projects do, with sources, as for the rest of Part 1. Record what you find with the decision. If the search shows a strong reason against a point, do not change it yourself: report it to the owner with the sources.
- A first look on 2026-11-15, to check and extend, not to trust as it is:
  - GitHub offers the PR title with the PR description as the default squash message, and several guides advise it. Some projects use the title only, with no body. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests and https://www.ssw.com.au/rules/use-squash-and-merge-for-open-source-projects
  - For ADRs, the common practice is one decision in one file, numbered and never renumbered, not edited after it is accepted, replaced by a new record with a status line on the old one, and an index page. https://www.martinfowler.com/bliki/ArchitectureDecisionRecord.html
  - The common rule is not to rewrite a branch that other people have pulled. https://www.gitkraken.com/blog/golden-rule-of-rebasing-in-git

Part 2: use it from now on.

- Each merged ticket leaves its record in the repo with no step that can be forgotten. Change the workflow skills (`workflow-pr`, `workflow-manual`, `workflow-auto`, `REFERENCE.md`) and `docs/development.md` so that they do it.
- The record keeps facts apart from guesses. It says what was checked and how ("the build passed" is not "the owner tried it").
- The squash commit on `main` holds the PR body. Change the repo setting `squash_merge_commit_message` from `COMMIT_MESSAGES` to `PR_BODY`, and update the "Merge style" row of the "Repo" table in `REFERENCE.md`. Name the old and new values in the PR body. The rejected findings must still reach `main`: today they come from the round commit messages, so check that the PR body holds each one with its reason. `collect-rejected.mjs` reads the branch before the merge and must keep working.
- A decision with no ticket gets a decision record in `docs/decisions/` (Part 1). No PR body holds it.
- The release run result gets its own entry, one file for each version, in the time folders. No PR body holds it, because the run comes after the merge.
- The workflow keeps the index and the current-state page up to date at each merge, with no step that can be forgotten.
- Say in the workflow who writes an entry there and when: the release run after it posts its table, and a session that drops an idea with no ticket.

Part 3: backfill.

- Backfill as much as the sources give, for every merged change. Sources: the git history on `main`, `.specify/specs/`, `.specify/bugs/`, the GitHub issues (open and closed, with their comments), the merged PRs (bodies, the release run comments, and the review threads where they hold a decision), the GitHub releases and `plugins/runway/CHANGELOG.md`.
- Mark each backfilled entry as backfilled, with its sources and the date of the backfill. Keep the date of the original event.
- Do not invent. Where no source gives a fact, write "not recorded". Do not write a reason that no source states.
- Do not copy a fact that the repo already holds in another file; link to it.
- Before the commit, check that the backfill holds no token, password or signed URL (constitution, "Development workflow").
- The backfilled files are built from the sources, so they do not count toward the 3-file limit, as bug notes do not ("Bug triage" in `REFERENCE.md`).
- Say in the PR what could not be backfilled, and why.
- Build the record so that a later source can fill it with no rework. Part 5 adds the facts that only this PC holds (its memory and session transcripts):
  - one entry for each ticket, in its own file, found by its issue number;
  - the same fields in the same order in each entry, so a new fact has one place to go;
  - a missing fact is the exact text `not recorded` in its field, so a search finds every gap;
  - a source for each fact, or for each field, so a later source is added and does not replace the first;
  - one list of all gaps, in the repo, that Part 5 works through.

Part 4: export what GitHub holds.

- Make a one-time export to files in the repo of everything that only GitHub holds: every issue (open and closed) with its comments and labels; every PR (merged, closed and open) with its body, comments, reviews and review threads; and every release with its notes.
- This is the raw copy. The backfill of Part 3 is the short record. A backfilled entry links to the exported file and does not repeat its text.
- Use one file for each issue, PR and release, so that a later export changes only the files that changed. Choose a format that a person and an agent can both read.
- Write down the commands that made the export, so that it can run again before a move away from GitHub. Say in `docs/development.md` when to run it again.
- Check the export for a token, password or signed URL before the commit (constitution, "Development workflow"). Remove any, and say in the PR what was removed.
- The exported files are built from GitHub, so they do not count toward the 3-file limit.

Part 5: add what only this PC holds.

- Do this part after Parts 3 and 4, in the same ticket, on this PC.
- Read the chat that started this repo too: session `4c4f3520-4d98-4f21-a86f-8245d889f4dc`. Find its file with `ls ~/.claude/projects/*/4c4f3520-4d98-4f21-a86f-8245d889f4dc.jsonl`. It is in the folder of another project, so it can also hold text about that project. Use only the parts about claude-runway. Do not name that project or its folder, and do not copy a fact about it, in the repo, a PR or an issue. Do not read the memory files of that folder.
- First list the transcripts and memory files in the project folders. Say in the PR how many there are, and which tickets have no transcript (for example the work of 2026-11-13, if no transcript from that day is left).
- Memory: read each memory file. Check that it is still true against the current files. Move a note that still applies into `CLAUDE.md` or the doc it belongs to. Do not copy a note that the repo already states. If the memory folder is empty, say so in the PR.
- Transcripts, gaps: take the list of `not recorded` facts from Part 3. For each one, search the transcripts of that ticket. A transcript names its branch and its dates, so the sessions of ticket `<n>` are those on the branch `<type>/<n>-<slug>`. Fill the fact in the entry of that ticket, in its field.
- Transcripts, decisions with no ticket: search for an idea that was proposed and dropped, a choice between options, and a limit the owner set, where no issue, PR, spec or bug note records it. Write each as a decision record in `docs/decisions/`, with the date of the session. Then bring the index up to date.
- Mark each added fact with its source, "session transcript" or "memory", and the date. Do not change a fact that came from git or GitHub. If a transcript disagrees with it, keep both and say so.
- Write each entry in your own words, short. Never paste transcript text, tool output or a file that was pasted into a chat.
- A reason that the transcript does not state stays `not recorded`.
- Say in the PR how many gaps were filled, how many stay open, and which sessions could not be read.

Must not:

- commit a transcript or a memory file, copy one to another machine, or send its text to an outside service;
- rewrite the history of `main` (no force-push, no changed commit);
- change a file under `plugins/runway/` or `.claude-plugin/marketplace.json` (this is not a release);
- add a runtime dependency;
- need the network to read the record.

## Acceptance criteria

- [ ] The repo holds the comparison of the standards that were looked at, each with its source link, the choice, the reason and the rejected options.
- [ ] The comparison says, for each point of "The devlog video", whether the chosen form covers it, and how.
- [ ] After this ticket, a merged ticket leaves in the repo: the problem, the change, the reason, the dropped options, what was tested, and the review result. The PR of this ticket is the first example.
- [ ] The workflow skills and `docs/development.md` describe the new step, and no text in them contradicts it.
- [ ] The record has a place for the release run result and for a decision with no ticket, and each has one real entry (the v0.1.2 run table, and the decision that led to this ticket).
- [ ] Each merged PR up to this ticket has a backfilled entry, or is listed in the PR as not backfilled with the reason.
- [ ] Each backfilled entry names its sources and is marked as backfilled. A fact with no source says `not recorded`.
- [ ] Each entry has the same fields in the same order, and the repo holds one list of all `not recorded` gaps that are left after Part 5.
- [ ] `gh api repos/tmathura/claude-runway --jq .squash_merge_commit_message` prints `PR_BODY`, the "Merge style" row says so, and the squash commit of this ticket's PR holds its PR body with each rejected finding.
- [ ] `docs/decisions/` holds one ADR file for each decision, in the template that Part 1 chose, and the workflow says who adds a record and when. The first records are the decisions of this ticket (the form of the record, the split by time, no database).
- [ ] No file in the record is a shared log that each ticket adds to. Each entry is its own file, in a folder for the year and month of its event.
- [ ] The index lists every entry, old and new, and a command or a check shows when it is stale. Each line points to the ticket's file and names its commit on `main`.
- [ ] The constitution allows the export PR in so many words, with its limits, and its version is raised. No other rule in the constitution, `REFERENCE.md`, `docs/development.md` or the workflow skills forbids what the export PR does.
- [ ] The workflow skills make the export PR as their last step, with the rules of Part 1: the same issue number, no export of an export PR, CI and bot reviews, no second merge question, and a catch-up for items that were missed. This ticket's own export PR is the first example, and it is merged.
- [ ] The record of the decisions (`main` is not rewritten; one text in the PR body; the export PR as the last step) gives what other projects do, with source links.
- [ ] The current-state page exists, gives its date, fits on about one screen, and a new session is told to read it first (`CLAUDE.md`).
- [ ] The repo holds one exported file for each issue, each PR and each release that existed when the export ran, and the count of each matches GitHub.
- [ ] The commands that made the export are in the repo, and `docs/development.md` says when to run it again.
- [ ] A check of the backfill and the export finds no token, password or signed URL.
- [ ] With the network off, a reader can find for a past ticket (test with #7 and #22) what changed, why, and what was checked, from the clone alone.
- [ ] The PR says how many transcripts and memory files Part 5 read, and which tickets have no transcript.
- [ ] Part 5 read session `4c4f3520-4d98-4f21-a86f-8245d889f4dc`, and the record holds the decisions from it with the source "session transcript". No text in the repo, the PR or an issue names the other project or its folder.
- [ ] Each memory note is in the project guidance, or the PR says why it was left out (not true any more, already stated, or private).
- [ ] Each `not recorded` gap is filled with its source, or is in the list of gaps that are still open.
- [ ] Each decision with no ticket that the transcript search found has a decision record with its date and the source "session transcript".
- [ ] No entry holds pasted transcript text, and no transcript or memory file is in a commit.
- [ ] `npm run build`, `npm test`, `npm run check-version` and `claude plugin validate plugins/runway` pass.

## Sensitive information

The repo is public, and git keeps each commit for good. So no sensitive text may reach a commit, in the export, in the backfill, or in a record written from now on. This section is a hard rule for all four parts.

What counts:

- secrets: a password, an API key, a token (GitHub, Copilot, OpenAI, Anthropic, a cloud provider), a private key, a connection string, a signed URL, a session cookie, a value from an `.env` file;
- private details: an email address, a phone number, a home folder path that holds a user name, a machine name, and a name or data of an employer, a customer or another project.

The rule:

- Check all text before each commit that adds it. Use two checks: a pattern search for the known forms of keys and tokens, and a read of the text, because a plain password matches no pattern. Keep the patterns in the repo with the export commands.
- A find stops the commit and the push. Replace the value with `[removed: <kind>]`, then check again.
- Never print a found value: not in chat, a commit message, a PR, an issue or a log. Report only its kind and where it was.
- Tell the owner about every find, in every source: an issue, a PR, a comment, a review thread, a release, the git history, a file in the repo (also `.specify/specs/` and `.specify/bugs/`), and the text this ticket writes. No find is fixed in silence.
  - How: keep a list of finds in a file outside the repo (the scratchpad). For each find give the kind, the exact place (the issue or PR number and the comment link, or the commit and the file and line), and whether it is already public. Never give the value. Show the full list in chat at the end of the run.
  - A secret (the first group above) that is already public, on GitHub or in the git history: stop the run and tell the owner at once, with a notification if the session can send one. It must be revoked first; removing the text does not make it safe. Go on only after the owner answers. Under `workflow-auto` the ticket is Not done until then.
  - A private detail, or a secret that was only in text this ticket was about to write: remove it, add it to the list, and go on.
  - The PR and the issue get only the number of finds by kind, and the words "reported to the owner". They do not name the place, because the repo is public and the place would point to a secret that may still work.
  - Do not edit or delete the issue, PR or comment that holds the find. The owner decides that.
  - A find in a transcript or a memory file (Part 5): a transcript holds everything that was typed, pasted or printed by a tool, so check its text with the most care. The place of the find is the session file and its date, or the memory file. A secret there stays on this PC and is not copied. It may still be in use, so tell the owner at once, so that the owner can revoke it. The run can go on, because the transcript is not public. Do not edit or delete a transcript or a memory file.
- GitHub secret scanning and push protection are on for this repo (`secret_scanning_push_protection=enabled`). They find the token forms of known providers only (`secret_scanning_non_provider_patterns=disabled`), so they do not replace the checks above. If GitHub blocks a push, stop and report. Never bypass the block.
- From now on (Part 2): `workflow-pr` checks the PR body before it creates or edits the PR. With `PR_BODY`, that text becomes a commit on `main`, and it cannot be removed later without rewriting history. The same check applies to a decision record, a history entry and the current-state page.

Add to the acceptance criteria:

- [ ] The patterns for the secret check are in the repo, and the PR says which checks ran on the export and the backfill and how many finds there were by kind, with no value and no place shown.
- [ ] The owner got the full list of finds in chat, with the kind and the exact place of each, or the words "no finds".
- [ ] `workflow-pr` says to check the PR body for sensitive text before it creates or edits a PR, and to stop on a find.

## The devlog video

The owner saw a video about devlogs for work with AI agents and gave its transcript. It is "Why I Keep a Dev Log When I Code with AI" by Patrick God: https://www.youtube.com/watch?v=Al4NWPMXkHo. Its points, in short:

- A new AI chat sees the code, but not why a thing changed, which idea was dropped, or what was still to try. A devlog is a short record of what happened and what matters next.
- An entry answers: what changed; why it was chosen; what was checked; what the state is now; what the next useful step is.
- An idea that was tried and dropped gets a line, so the next agent does not suggest it again.
- A code change does not show its state. Built locally, tried by the owner, released, and "a known issue is open" are different states, and the entry says which one applies.
- Keep guesses apart from facts. Read words like "tested", "finished" and "released" with care: "the app builds" is not "the owner tried the screen".
- The checks must fit the change, and the entry says which checks ran and which did not.
- The devlog can live in git. Git and commit messages record the change; the devlog adds the state and the reasons.
- Project guidance (an `AGENTS.md`, here `CLAUDE.md` and the docs it links to) holds the rules that keep applying. The devlog holds what happened. A decision in the devlog can later move into the guidance.
- A handover is the devlog plus a short summary of the current state. It needs no special file for each task.
- Notes get old. A new session reads the guidance and the entries that matter, then checks the current files before it goes on.
- Keep the dated history, but make the current state easy to find.
- The notes move with the project to another AI tool.
- Link to useful files or results. Keep an entry short.

2026-11-15: #25 is now Part 5 of this ticket. This PC is the first and only PC for this repo, so no second machine has to run that part.

2026-11-15: added the chat that started this repo (session `4c4f3520-4d98-4f21-a86f-8245d889f4dc`) as a source for Part 5. It is in the folder of another project, so the first search did not find it.

2026-11-15: took over the change of the same day in tmathura/copilot-plugin-cc#162. A new ticket now gets its history file from an export PR, the last step of the workflow, and the constitution is amended to allow that PR. Before, a new ticket had no file and its record was its squash commit only.

## Plan comparison

Codex and Copilot each wrote a plan from the issue text alone (2026-11-15). Claude planned at the same time.

- All three agree on: decision records in `docs/decisions/` in MADR form; one Node script with no dependency that uses `gh`; short entries and raw copies in folders by year and month; a generated index, current-state page and gap list, with a stale check in `npm test`; `PR_BODY`; the export PR rules; a sensitive-text scan with its patterns in the repo.
- Raw copies: Codex put them in `docs/exports/`, Copilot in the same month folder as the entries. The plan keeps them under `docs/history/github/`, apart from the short entries but in one tree.
- Constitution version: Codex proposed 2.0.0, Copilot 1.2.0. The plan takes 1.2.0: no principle is removed, and one workflow rule gains one named exception.
- Taken from Codex: the PR body must also hold the rejected findings of the PR review loop, which `collect-rejected.mjs` does not read; the scan covers every path that edits a PR body; the PR body gets a `## State` section; a test with more than one page of items.
- Taken from Copilot: one script with subcommands (`export`, `build`, `check`, `scan`); `check` also tests the field order of each entry.
- Not taken from Codex: a database-like test set for concurrent exports. Entries hold no clock date, so two exports give the same bytes, and an export branch that conflicts takes `main` and runs the export again.
- The plan review loop with Codex and Copilot ran 7 rounds; both approved at the end. Its main changes: a secret that is already public stops the export before any file is written, and one that the owner has dealt with is bound to the hash of its value; the export reads everything before it writes; a field is refreshed only while it holds generated text; the release state comes from the tag commit; review threads keep their resolved state; an export PR is known by branch, title and file list, and a second export run with `--export-base` proves that it holds only generated changes; a raw file of an item that GitHub no longer has is kept and marked `gone`; the export also runs when a release waits or fails; a failed export PR removes only what its run created.

***

**Comment** by `tmathura`, 2026-11-17T15:10:26Z, https://github.com/tmathura/claude-runway/issues/24#issuecomment-6952028974

workflow-auto: waits for the owner

**Where it stopped.** `workflow-manual` Step 7, the code review round loop. Rounds 1 to 17 are committed on the branch `feature/24-keep-change-history-in-repo` (head `a2b674e`, pushed). There is no PR yet, and nothing is merged.

**Why.** In round 17, the Copilot call ended two times with no verdict ("Copilot ended its last turn without an answer"). The workflow rule says that a reviewer whose code review round call failed twice is not ready for the rest of the ticket, and `workflow-auto` needs both local reviewers. `setup --json` still says that Copilot is ready, so this looks like a fault of single calls, not of the installation. Copilot gave a verdict in round 16 (approve), after one rerun.

**State of the review.** Round 17: Codex 1 finding and `code-review` 6 findings, all fixed in `a2b674e`. That head has no review yet. The command set passes on it.

**The decision needed.** Choose one:

1. Run the ticket again (recommended): remove the `question` label and run `/workflow-auto 24`. The run starts round 18 on the current head with all three reviewers.
2. Go on without Copilot for the rest of this ticket: the PR then names Copilot as not available from round 17 on.

Please answer with a comment that starts with `decision:`, then remove the `question` label. Only a comment from the owner counts.
