# 0002. The form of the history record

- Status: accepted
- Date: 2026-11-15
- Source: ticket #24 ([issue](../history/github/2026/11/issue-024.md)). The standards were read
  on the web on 2026-11-15; each has its link below.

## Context

[0001](0001-keep-the-history-of-each-change-in-the-repo.md) says that the repo keeps its own
history. This record chooses the form. The owner fixed these points on 2026-11-15, and this
record does not reopen them: decisions are architecture decision records in `docs/decisions/`;
one file for each entry and no shared log; entries in folders by year and month; an index and a
current-state page; no database.

The forms are compared on six points:

1. It survives a move away from GitHub.
2. It needs no second copy written by hand ("Each fact lives in one file",
   [conventions](../conventions.md)).
3. It works with two machines, and with tickets in worktrees at the same time, with no merge
   conflict on a shared file.
4. The cost for each ticket.
5. A new agent session finds the current state fast.
6. It holds events after the merge (the release run) and decisions with no ticket.

## Options considered

| Form | 1 Survives | 2 No second copy | 3 No conflict | 4 Cost | 5 State fast | 6 After merge, no ticket |
| --- | --- | --- | --- | --- | --- | --- |
| Nygard ADR | yes | yes, for decisions | yes, one file each | low, only for a decision | no | decisions yes, events no |
| MADR | yes | yes, for decisions | yes, one file each | low, only for a decision | no | decisions yes, events no |
| Keep a Changelog | yes | no, a summary by hand | no, one shared file | low | no | no |
| One dated devlog file | yes | no, written by hand | no, one shared file | medium, each session | yes, at its end | yes |
| PR body as the squash message | yes, in each clone | yes, the PR text is the record | yes | none | no | no |
| git notes | only with extra push and fetch rules | yes | weak, the default merge is manual | medium | no | yes |
| Tracker inside git (git-bug, git-appraise, Fossil) | yes | yes, it replaces GitHub issues | yes | high, a new tool for all work | no | yes |
| Export to files (gh2md, python-github-backup) | yes | yes, made by a command | yes, one file each | low, a command | no | yes, it copies comments |
| One small file for each change (towncrier, reno, scriv) | yes | no, written by hand | yes, that is their aim | medium | no | no |
| A set of memory files (Cline memory bank, a progress file) | yes | no, written by hand | no, shared files | high, each session | yes | yes |

What each source says:

- **Nygard ADR.** A short text file for each important decision, with Title, Context, Decision,
  Status and Consequences. Records are numbered and "Numbers will not be reused". A replaced
  record stays and is marked as superseded.
  <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>
- **MADR 4.0.0.** A Markdown template that adds the options that were considered. File name
  `NNNN-title-with-dashes.md`, folder `docs/decisions`, status "superseded by ADR-0123".
  <https://adr.github.io/madr/>
- **Fowler on ADRs.** One record holds one decision. "Once an ADR is accepted, it should never be
  reopened or changed - instead it should be superseded".
  <https://martinfowler.com/bliki/ArchitectureDecisionRecord.html>. adr-tools makes a new record
  and marks the old one in one command: <https://github.com/npryce/adr-tools>.
- **Keep a Changelog.** "Changelogs are for humans, not machines." It also says that commit logs
  as a changelog are "full of noise", and that GitHub Releases are "a non-portable changelog".
  <https://keepachangelog.com/en/1.1.0/>
- **A dated devlog or progress file.** Anthropic describes a progress file that "keeps a log of
  what agents have done"; each session reads it and the git log first, and ends with a commit
  and an update.
  <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>. The Cline
  memory bank is six files that the agent must read at the start of every task:
  <https://docs.cline.bot/prompting/cline-memory-bank>.
- **The PR body as the squash commit message.** GitHub can use the PR title and description as
  the default message of a squash merge.
  <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests>.
  Details are in [0006](0006-write-the-history-of-a-ticket-once-in-the-pr-body.md).
- **git notes.** Text attached to a commit "without touching the objects themselves":
  <https://git-scm.com/docs/git-notes>. They are not pushed or fetched by default, and
  "Displaying Git notes on GitHub is no longer supported":
  <https://github.blog/news-insights/git-notes-display/>.
- **A tracker inside git.** git-bug stores issues as git objects: <https://github.com/git-bug/git-bug>.
  git-appraise stores reviews as git notes: <https://github.com/google/git-appraise>. Fossil keeps
  tickets in the repo itself: <https://fossil-scm.org/home/doc/trunk/www/bugtheory.wiki>.
- **Export tools.** gh2md writes issues and PRs to Markdown, one file for each with
  `--multiple-files`, and shows a nightly job that pushes the export back to the repo:
  <https://github.com/mattduck/gh2md>. python-github-backup writes JSON and says "there is no
  inbuilt restore command": <https://github.com/josegonzalez/python-github-backup>.
- **One small file for each change.** towncrier uses one fragment for each change in place of a
  shared file that every developer edits: <https://towncrier.readthedocs.io/en/stable/>. reno
  wants to "avoid merge issues" and says "Release notes should be part of the git history":
  <https://docs.openstack.org/reno/latest/user/design.html>. scriv "encourages writing changelog
  entries directly, rather than copying text from commit messages or pull requests":
  <https://scriv.readthedocs.io/en/latest/philosophy.html>.
- **AGENTS.md** is "a README for agents" with build and convention notes, and no state:
  <https://agents.md/>. In this repo that part is `CLAUDE.md` and the docs it links to.

## Decision

No single form covers all six points, so the record joins four of them. Each fact still has one
home.

1. **Decisions: decision records in `docs/decisions/`**, in the MADR 4.0.0 minimal template with
   a status line, a date line and a source line. The rules are in "History" in
   [development.md](../development.md).
2. **A ticket's history: its PR body**, which the squash commit keeps on `main`
   ([0006](0006-write-the-history-of-a-ticket-once-in-the-pr-body.md)).
3. **What only GitHub holds: an export to files**, `docs/history/github/YYYY/MM/`, one file for
   each issue, PR and release, written by `npm run history -- export`. The format is Markdown
   with a block of `key: value` lines at the top, so a person and a program can both read it.
   The command is this repo's own Node script. gh2md was not taken: it would be one more tool
   to install, and the script also needs the review threads, the release run tables and the
   sensitive-text check.
4. **One short entry for each merged change**, `docs/history/YYYY/MM/ticket-NNN.md`, and one for
   each release run, written by the same command. Each entry has the same fields in the same
   order: What changed, Why, Options dropped, What was checked, Review result, Left open. A
   field points to the section of the PR that holds the fact. It does not repeat the text. A
   fact with no source says `not recorded`, and `docs/history/gaps.md` lists those fields.
5. **The index, the open list and the current-state page are built from the entries** by the
   command, so no ticket edits a shared list by hand. `npm test` runs
   `npm run history -- check`, which fails when a built page is stale.

Rejected: a shared changelog or devlog file (two tickets edit the same lines); a second,
hand-written history file for each ticket (a second copy of the PR text); git notes (not pushed
by default, not shown by GitHub); a tracker inside git (all work would move to a new tool; a
move away from GitHub stays possible with the export); the memory-bank file set (hand-written
shared files that go stale).

How the form covers each point of the devlog video:

| Point of the video | Covered | How |
| --- | --- | --- |
| A new chat does not see why a thing changed or which idea was dropped | yes | The entry fields "Why" and "Options dropped"; the decision records |
| An entry says what changed, why, what was checked, the state now, the next step | yes | The six fields; the State line in the entry header; "Left open" |
| An idea that was tried and dropped gets a line | yes | "Options dropped" (the plan comparison), and a decision record for an idea with no ticket |
| The state of a change is said: built, tried by the owner, released, issue open | yes | The State line (`merged`, `released as`, `not released`); the release run entry gives each step with pass, fail or unsure |
| Keep guesses apart from facts | yes | `## Testing` in the PR says what was checked, how and by whom, and what was not; a backfilled fact names its source; a fact with no source says `not recorded` |
| The checks fit the change, and the entry says which ran | yes | `## Testing`, and the release run table |
| The devlog can live in git | yes | All of it is files in the repo; the PR text is in the squash commit |
| Project guidance holds the lasting rules; a decision can move there | yes | `CLAUDE.md` and the docs hold the rules; a decision record can be the source of a rule |
| A handover is the devlog plus a short summary of the current state | yes | `docs/history/current-state.md` |
| Notes get old; check the current files | yes | The current-state page gives the date of its data and says to check the files; `check` finds a stale page |
| Keep the dated history, make the current state easy to find | yes | Month folders, and `CLAUDE.md` names the current-state page as the first page to read |
| The notes move with the project to another AI tool | yes | Plain Markdown, no tool format |
| Link to files and results; keep an entry short | yes | An entry is pointers and a few sentences |
| One dated devlog file that each session adds to | no | Replaced by one file for each entry, because a shared file gives merge conflicts and grows without limit |

## Consequences

- A reader starts at `docs/history/current-state.md`, then the month index, then an entry, then
  the raw copy.
- An entry is short only because the PR body is complete. A PR body with a missing section
  gives a `not recorded` field, which the gap list shows.
- The raw copies are a reading copy. They cannot be loaded back into GitHub.
- The export shows the state of GitHub at its last run. It runs after each merge
  ([0007](0007-export-in-its-own-pr-as-the-last-step.md)).
- The same form is planned for `tmathura/copilot-plugin-cc` (its issue 162, open on 2026-11-15).
  That ticket was not merged first, so nothing was taken from it.
