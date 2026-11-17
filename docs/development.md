# Development

How work moves from an idea to `main`. The rules behind these steps are in the
[constitution](../.specify/memory/constitution.md).

## Ticket workflow

1. Plan. (When the issue already exists, do this step later, in the worktree; see step 2.) Choose
   how by what the change touches ("touches the mod" is the file test in "Release", below):

   | The change | Plan with |
   | --- | --- |
   | Touches the mod and fixes a defect | Spec Kit bug triage ("Bug fixes", below) |
   | Touches the mod, anything else: new or changed behaviour, a refactor, the text the band shows | The Spec Kit spec flow ("Using it", below) |
   | Does not touch the mod: docs outside it, tests only, tooling, CI, Spec Kit, the workflow | Claude plan mode |

   A change to the mod always uses Spec Kit, so its reasoning is committed with the code. A plan
   made in Claude plan mode is not saved as a file. Its plan comparison is in the issue and in
   the PR body, so it reaches the repo in the squash commit and in the raw copies ("History",
   below). If it is not clear which row fits, ask the owner. If a plan-mode ticket grows into mod files, stop and plan it again with Spec Kit.

   Before your plan is shown, Codex and Copilot each write their own plan from the issue text (or
   the task description) alone, while you plan. Compare the three plans, take what is better into
   yours, and keep the comparison in the issue as `## Plan comparison`. A difference that needs a
   decision goes to the owner.

   The bug triage plan is `assessment.md` plus a Constitution Check that you write in it, because
   the assessment has none. Run the plan's Constitution Check. Have Codex and Copilot review the
   plan (for the spec flow: `spec.md`, `plan.md` and `tasks.md`), and apply their confirmed findings.
2. Open a GitHub issue from the plan, as "Tickets" (below) says, or use the one that already exists.
   If you planned with Spec Kit, add the issue number to the planning folder ("Folder names",
   below). Give the issue its type label before its branch is made. When the issue already exists,
   skip step 1 for now: make its branch (step 3), and then do step 1 once, in the worktree. If
   planning shows the label was wrong, fix the label.
3. Make a branch `<type>/<n>-<slug>` from the latest `origin/main`, in its own worktree. The type is
   `bugfix` for an issue with the `bug` label, and `feature` for all others. The type is set when the
   branch is made; a later label fix does not rename the branch. If Spec Kit ran in the
   main checkout, move `.specify/specs/NNN-<name>/` and `.specify/feature.json`, or
   `.specify/bugs/NNN-<slug>/`, into the worktree before its first commit. The main checkout must then
   be clean.
4. Make the change, with its tests and docs. If the work departs from the spec, update the spec in
   the same commit ("Keeping the spec current", below). If the change is a release, raise the
   version and add the `CHANGELOG.md` entry ("Release", below).
5. Run `npm ci --include=dev` (it installs the dev dependencies that the build needs), then
   `npm run build`, `npm test`, `npm run check-version`, `claude plugin validate plugins/runway`
   and `claude plugin test plugins/runway`. They must pass. Do this before every commit, also in
   the review rounds below.
6. Commit with the subject `[#n] Imperative description`.
7. Review the branch in rounds. In each round, run three reviews at the same time:
   `/codex:adversarial-review` and `/copilot:adversarial-review`, both with
   `--scope branch --base origin/main`, and a code review of the diff with its check against
   `CLAUDE.md` and the docs it links to. Fix the confirmed findings, record rejected ones with the
   reason, test, and commit. Stop when all three approve, or when every finding left was rejected
   in an earlier round. If Codex or Copilot is not set up, run this step and step 9 without it, and
   say so in the PR.
8. Open a PR into `main`. The bot reviewers (today Copilot and CodeRabbit) review each push. The
   PR body is the record of the ticket that `main` keeps ("History", below), so it says what
   changed and why, what was checked and what was not, each rejected finding with its reason, and
   what is left open. Check it for sensitive text before each create and each edit.
9. Review the PR in rounds. In each round, read every review, including findings that are only in a
   review body or summary comment. Fix the confirmed findings, have Codex and Copilot review the
   fixes, review the diff and check it against `CLAUDE.md`, test, commit and push. Answer and
   resolve every thread, then wait for the next reviews. Stop when no reviewer has findings and no
   thread is open, or when every finding left was rejected in an earlier round.
10. Squash-merge when every CI check passes. The squash commit is the PR title and the PR body
    (the repo settings `squash_merge_commit_title=PR_TITLE` and
    `squash_merge_commit_message=PR_BODY`). The ruleset on `main` ("Protect main + Copilot review")
    enforces the checks: a PR merges only when the jobs `CI (ubuntu-latest)`, `CI (macos-latest)` and
    `CI (windows-latest)` passed, CodeQL found no error alert and no security alert of high or
    critical level, every review thread is resolved, and its branch has the latest `main`. CodeQL
    runs through GitHub's default setup, with no workflow file. When `main` has moved on,
    merge `origin/main` into the branch, test, review, push, and wait for the reviews and CI again.
11. Remove the worktree and the branch, and pull `main`. CI
    (`.github/workflows/pull-request-ci.yml`) also runs on each push to `main`, so the merge commit
    gets its own run. If the PR raised the mod version, do the release run and, only if it and
    that CI run pass, publish the release ("Release", below).
12. Make the export PR: a second, small PR on the branch `export/<n>-history` that holds only the
    files that `npm run history -- export` wrote ("History", below). It needs no plan and no
    Codex and Copilot rounds; CI and the bot reviewers still check it. The answer to the merge
    question of the ticket covers it. If it fails, the ticket is still done, and the next export
    picks the ticket up.

The `workflow-*` Claude Code skills in `.claude/skills/` run these steps. Start with
`/workflow-manual`. `/workflow-auto` runs the open tickets, or one, from plan to merge without asking,
and reports what is not done; which tickets it takes and its options (`--ask-band`,
`--ask-merge`) are in its skill. The skills' shared rules are in `.claude/skills/workflow-common/REFERENCE.md`.
The skills load only when this repo is open as the project in Claude Code. You can also follow the
steps by hand.

## Tickets

Each change has one GitHub issue on `tmathura/claude-runway`, assigned to the owner. After its
PR is merged, a ticket has one more PR, the export PR, with the same issue number ("History",
below).
`workflow-ticket` makes it from the approved draft. An issue that already exists (one filed by
hand) is made to match before its branch is made.

- **Title:** an imperative sentence that says what changes, for example "Show the reset time of a
  limit that is reached". No ticket number, no type prefix such as "Bug:", and no full stop at the
  end.
- **Body:** these sections, in this order:
  1. `## Problem`: what is wrong or missing, with evidence (file and line, error text, a failing
     case).
  2. `## Expected behaviour`: what must happen instead.
  3. `## Solution requirements`: what the change must do and must not do.
  4. `## Acceptance criteria`: a checklist (`- [ ] ...`) that a reviewer can check.

  Other sections can follow, for example `## Constitution Check`. When the plan used Spec Kit, the
  last line names the planning folder ("Folder names", below).
- **Type label:** exactly one. Use the first that fits:
  1. `documentation`: a change to docs only, also when it corrects a mistake in the docs. Docs are
     `README.md`, `CLAUDE.md`, `docs/`, `.specify/specs/`, `.specify/bugs/` and the constitution. The mod's
     own README and the workflow skills are not docs;
  2. `bug`: a defect;
  3. `enhancement`: anything else: new or changed behaviour, a refactor, tests, tooling, CI,
     Spec Kit, the workflow.
- **Other labels:**
  - `question`: while the issue asks the owner to decide. Remove it when the owner has decided.
  - `duplicate`, `invalid`, `wontfix`: when the issue closes without its own change. Add a comment
    that says why, for a duplicate "Duplicate of #n".
  - `good first issue`, `help wanted`, `accessibility`: as GitHub defines them.

  Never create a new label.
- **Scope change:** when the scope changes during the work, edit the issue body and add a dated line
  that says what changed and why. Put it above the folder line, if there is one.
- **Closing:** for an issue with its own change, the PR body has `Closes #n`, so the merge closes the
  issue. Do not tick the acceptance boxes; the PR body ("Change" and "Testing") says what was done
  and how it was checked. Close an issue with no change of its own (`duplicate`, `invalid`,
  `wontfix`) by hand, after its comment: as a duplicate, or as not planned.

## History

The repo keeps its own history, so that a person or an agent with only a clone can read what
changed, why, which options were dropped, what was checked, and what is left open. The reasons
for this form are in the decision records 0001 to 0007 in [docs/decisions](decisions/README.md).

A new session reads [docs/history/current-state.md](history/current-state.md) first, then checks
the files it links to.

### Is the page behind `main`?

The page is built at each export. After a ticket merges, the page is behind `main` until the
export PR of that ticket merges. It stays behind when an export fails. So check the page before
you act on it, with two commands. They need only the clone:

```bash
git log -5 --format='%H %s' origin/main
git grep -l 'Commit on `main`: `<that commit>`' -- 'docs/history/[0-9]*'
```

- Run both from the root of the checkout. The check is for a checkout with no uncommitted
  change under `docs/history/`.
- The first command lists the newest commits on `main`, each with its subject. Take the first
  one whose subject is not `[#n] Export the history of #n (#p)`. Skip an export commit, because
  it is always newer than the page that it builds. If all five are export commits, list more
  (`-20`).
- The second command looks for that commit in the entries of your checkout
  (`docs/history/YYYY/MM/`). The entry of a merged change holds its commit on `main`, and the
  build writes the entries and the page together. If the command prints a file, the page has
  the last merged change, so it is current. If it prints nothing, the page is behind.
- `origin/main` is `main` as it was at your last fetch. Fetch first when you have the network.

When the page is behind, do not take the facts from it. Read the merged changes with
`git log origin/main`. Ask GitHub for the open issues (`gh issue list --limit 1000`), the open
PRs (`gh pr list --limit 1000`) and the releases (`gh release list --exclude-drafts --limit 1000`;
the last release is the one with the newest publish date).

The check sees merged changes only. These change no commit on `main`: an issue that was opened
or closed after the last export, a PR that was opened or was closed with no merge, and a
release or a release run table that came after the last export. So ask GitHub also when the
answer must be exact.

### What is where

| Place | What it holds | Who writes it, and when |
| --- | --- | --- |
| The PR body, kept by the squash commit on `main` | The record of a ticket: problem, change, testing, plan comparison, review rounds with each rejected finding, state | The ticket, once. Nobody writes a history file by hand |
| `docs/history/github/YYYY/MM/` | A raw copy of each issue, PR and release: `issue-NNN.md`, `pull-NNN.md`, `release-vX.Y.Z.md` | `npm run history -- export`, in the export PR |
| `docs/history/YYYY/MM/ticket-NNN.md` (`pr-NNN.md` for a merged PR with no ticket) | The entry of a merged change: a header with its issue, PR, commit, state and planning notes, then six fields that point to the sections of the PR | The same command. It makes the entry and keeps the header current |
| `docs/history/YYYY/MM/release-run-vX.Y.Z.md` | The result of a release run | The same command, from the table comment that the release run posts on the merged PR ("Release", below) |
| `docs/history/README.md`, `current-state.md`, `open.md`, `gaps.md`, each month's `README.md`, `docs/decisions/README.md` | The index, the current state, the open issues and PRs, the facts that no source gives yet, the list of decision records | The same command builds them. Do not edit them |
| `docs/decisions/NNNN-title.md` | One decision | The session that makes the decision, by hand ("Decision records", below) |

The folders are by the year and month (UTC) of a date that never changes, so a link to a file
stays good: the merge of the PR for an entry and for a release run, the creation for a raw copy.
(A release run entry moves only if a second PR sets the same version again in another month,
which the release rules do not allow.)

An entry has the same fields in the same order: What changed, Why, Options dropped, What was
checked, Review result, Left open. The command writes each field as a pointer to the section of
the PR that holds the fact (`## Change`, `## Problem`, `## Plan comparison`, `## Testing`,
`## Review rounds`, `## State`), or as the exact text `not recorded` when the PR has no such
section. So keep those headings in a PR body. The command rewrites a field only while it still
holds such generated text. A field that a person completed stays as it is. This is how the
entries from before #24 were backfilled: each has a note line "Backfilled:" with its date and
sources, and each added fact names its source. `docs/history/gaps.md` lists every field that
still says `not recorded`.

When you complete a field by hand, leave the two marker lines, the six headings and the header
as they are. The `- PR:` line of the header says whose entry the file is: an entry moves with
its PR when the title of the PR is edited later, and the build refuses an entry file with no
such line. The file name comes from the `[#n]` at the start of the PR title. So do not change
that part of a title after the merge: the entry gets a new file name, and a link to the old
name is dead. `npm run history -- check` names such a link in `docs/history/` and
`docs/decisions/` (it does not read the links of other files); point it to the new name, or
to the raw copy of the PR, whose path never changes.

Do not invent a fact. Where no source gives it, leave `not recorded`. Do not copy text that the
repo already holds; link to it.

### Commands

| Purpose | Command |
| --- | --- |
| Read GitHub, write the raw copies, then build | `npm run history -- export --finds <file outside the repo>` |
| Build the entries and pages from the raw copies, with no network | `npm run history -- build` |
| Fail when a page is stale, an entry is malformed, a link is dead or text is sensitive | `npm run history -- check` (`npm test` runs it) |
| The sensitive-text check for any file | `npm run history -- scan <file>...` |

The script is `scripts/history.mjs`. It needs `gh` with a login for `export`, and nothing but
Node for the other commands.

Things to know:

- `export` reads all issues, PRs and releases each time. A file whose content did not change
  stays the same, so git shows only real changes.
- An export PR is left out of the export: a PR on the branch `export/<n>-history`, with the
  title `[#<n>] Export the history of #<n>`, that changes only `docs/history/` and
  `docs/decisions/README.md`.
- An item that GitHub no longer has keeps its raw copy, with the line `gone: true` in its top
  block. It no longer counts as open, as a release or as a release run. The export checks a
  kept copy for sensitive text each time, because the patterns and the private word list can
  grow. A new find there is listed with the file as its place; a private detail is replaced,
  and a secret stops the export with exit 4, because it is in the history of `main`.
- Only a PR that merged into `main` gets an entry. A PR that merged into another branch has its
  raw copy; its change reaches `main` with the PR of that branch.
- A release run table counts only when it is a comment of the owner, on the merged PR that set
  that version, with the first line `Release run vX.Y.Z`. A table with another version in that
  line, or on another PR, gives no release run entry.
- A long run of encoded characters (the hidden state that a review bot stores in a comment) is
  left out of a raw copy, and the copy says how many characters were there. Nobody can read such
  text, so nobody can check it.
- A release tag is never changed in a raw copy, because the tag names the release, its file and
  its URL. When a tag holds a private detail, or a word from the private word list, the export
  stops with exit 2 and writes nothing. The owner then renames the tag on GitHub, or takes the
  word from the list. For a kept copy of a release that GitHub no longer has, the file is
  removed in a ticket of its own; that case also gives exit 2. The tag of a release on GitHub
  that matches a secret pattern stops the export with exit 4, as each public secret does.
- The file name of a release or a release run is in lower case, and a raw copy of a release
  holds GitHub's number of that release (`id`). A release whose tag is renamed keeps its copy
  when the file name stays the same. When another release would get the file name of a kept
  copy, the export stops with exit 2: remove the kept file in a ticket of its own, then run
  the export again.
- When a write stops half-way (a full disk, a locked file), no old file is changed, or the next
  run of `export` or `build` finishes the work. Run the command again.
- The resolved state of each review thread is in the raw copy of its PR. A review that is still
  pending (a draft that only its author sees) is left out.
- A raw copy holds no "updated" time of GitHub, because that time also changes when an export PR
  refers to the issue. The current-state page gives the time of the newest event in the raw
  copies: an item created, closed, merged or published, or a release run table posted.
- The raw copies are a reading copy. They cannot be loaded back into GitHub.

Run the export again, outside a ticket, in two cases: before a move away from GitHub, and after
an edit of an old issue, PR or release. Make the change through the export PR steps ("History
export" in `.claude/skills/workflow-common/REFERENCE.md`), with the number of an open ticket for
this work.

### Decision records

A decision gets a record when no ticket records it: a choice between options, an idea that was
proposed and dropped, a limit that the owner set. A decision that a ticket's plan comparison or
spec folder already holds needs none.

- One file for each decision: `docs/decisions/NNNN-title-with-dashes.md`. `NNNN` is the next free
  number. A number is never used again.
- The template is MADR 4.0.0 minimal, with three lines at the top:

  ```markdown
  # NNNN. Title

  - Status: accepted
  - Date: YYYY-MM-DD
  - Source: the ticket, the owner, or "session transcript" with its date

  ## Context
  ## Options considered
  ## Decision
  ## Consequences
  ```

- An accepted record is not rewritten. A later decision gets a new record that says which one it
  replaces. The old one gets only a new status line: `- Status: superseded by [NNNN](file)`.
- The session that makes the decision writes the record. It commits the record in the PR of the
  ticket it works on. When no ticket is in work, the record gets its own `documentation` ticket.
- `docs/decisions/README.md` is built by `npm run history -- build`. Run it after you add a
  record. `npm test` fails when the list is stale, or when two records have the same number.

### Sensitive text

The repo is public, and git keeps each commit for good. No secret and no private detail may
reach a commit: not in a raw copy, an entry, a decision record, a built page or a PR body.

- A secret: a password, an API key, a token, a private key, a connection string, a signed URL, a
  session cookie, a value from an `.env` file.
- A private detail: an email address, a phone number, a home folder path that holds a user
  name, a machine name, and a name or data of an employer, a customer or another project.

Each text gets two checks before its commit, and a PR body before each create or edit: the
pattern check (`npm run history -- scan`) and a read, because a plain password matches no
pattern. The patterns are in `scripts/history.mjs`. A find stops the commit: replace the value
with `[removed: <kind>]` and check again. Never print a found value; say its kind and its place.
The owner is told about every find. A secret that is already public stops the work until the
owner answers, because it must be revoked first. The steps, and the two local files that hold
the private words and the finds that the owner was told about, are in "Sensitive text" in
`.claude/skills/workflow-common/REFERENCE.md`.

GitHub secret scanning and push protection are on for this repo. They find only the token forms
of known providers, so they do not replace these checks. If GitHub blocks a push, stop and
report. Never bypass the block.

## Spec Kit

The repo uses [Spec Kit](https://github.com/github/spec-kit) 1.2.2 with the Claude Code
integration (`.claude/skills/speckit-*`) and bash scripts (`.specify/scripts/bash/`). It has one
extension, the bundled `bug` extension ("Bug fixes", below). The `speckit-*` skills and the files
under `.specify/`, except the constitution, the files under `.specify/specs/` and the bug notes, are managed files: do not edit them.

### Using it

Run the skills in this order:

1. `/speckit-specify SPECIFY_FEATURE_DIRECTORY=.specify/specs/<name> <feature description>` writes
   `.specify/specs/<name>/spec.md`. Before the issue exists, use the name alone; when the issue
   exists, use `.specify/specs/NNN-<name>` ("Folder names", below).
2. `/speckit-clarify` (optional) answers open questions in the spec.
3. `/speckit-plan` writes `plan.md`.
4. `/speckit-tasks` writes `tasks.md`.
5. `/speckit-analyze` (optional) checks the spec, plan and tasks against each other.
6. `/speckit-implement` works through `tasks.md`.

`/speckit-checklist` (optional) writes a requirements checklist. Run it only after `/speckit-plan`.
Without a plan, its setup script stops with "plan.md not found". This is how Spec Kit works. The
skill and script stay unchanged so that upgrades keep working.

Things to know:

- The skills run the scripts in `.specify/scripts/bash/` directly, for example
  `.specify/scripts/bash/setup-plan.sh --json`. They work the same on macOS, Linux and Windows,
  because Claude Code's Bash tool uses Git Bash on Windows.
- `jq` is optional. Without it, the scripts use `printf` and `awk`.
- Git stores the scripts as executable (mode `100755`). If a script fails with "permission denied",
  run `chmod +x .specify/scripts/bash/*.sh`. If `git ls-files -s .specify/scripts/bash` then shows
  `100644`, also run `git add --chmod=+x .specify/scripts/bash/*.sh` and commit it.
- Specs live in `.specify/specs/NNN-<name>/`, where `NNN` is the issue number ("Folder names",
  below). Always pass the folder: `.specify/specs/NNN-<name>`, or `.specify/specs/<name>` while the
  issue does not exist yet. Without it, `/speckit-specify` still writes to `specs/` at the repo
  root, because its text is a managed file, and it takes the highest number there plus one, which
  is not the issue number. In a worktree, check that `.specify/feature.json` exists after it.
- `.specify/feature.json` points to the current spec. Each checkout has its own copy, and git ignores
  it. A new or resumed worktree has none, so `/speckit-plan`, `/speckit-analyze` and
  `/speckit-implement` fail with "Feature directory not found". To fix it, write
  `{"feature_directory": ".specify/specs/NNN-<name>"}` to `.specify/feature.json`. Always use a path
  from the repo root.
- Spec Kit does not create git branches here. Branches are made by the ticket workflow.
- The tasks template says tests are optional. In this repo the constitution (Principle V) asks for
  them, so `tasks.md` must include test tasks.
- `/speckit-specify`, `/speckit-plan` and `/speckit-tasks` rewrite their files. Make later corrections
  by hand, then run `/speckit-analyze` again.
- The bundled Spec Kit workflow (`.specify/workflows/`) was deleted because nothing uses it. If an
  upgrade brings it back, delete it again.

### Folder names

A spec folder and a bug folder start with the ticket's GitHub issue number, padded with zeros to 3
digits, as Spec Kit pads its own numbers: `.specify/specs/NNN-<name>/` and `.specify/bugs/NNN-<slug>/`. For
#59, `NNN` is `059`. So the folder, the issue and the branch carry the same number.

- When the issue exists before you plan (a ticket that starts from an issue), use the number from
  the start: `SPECIFY_FEATURE_DIRECTORY=.specify/specs/NNN-<name>`, or `slug=NNN-<slug>`.
- When you plan before the issue exists (step 1 of the ticket workflow), use the name without the
  number. As soon as the issue is created, add the number:
  1. Rename the folder to `NNN-<name>` or `NNN-<slug>`.
  2. In its files, replace the old folder path with the new one. In `assessment.md`, also set the
     `Slug` line to `NNN-<slug>`.
  3. For a spec, write the new path to `.specify/feature.json`.

  `workflow-ticket` does these steps.
- In both cases, the issue body ends with a line that names the folder: `Spec: .specify/specs/NNN-<name>/` or
  `Bug notes: .specify/bugs/NNN-<slug>/`.
- Until #8, spec folders were in `specs/` at the repo root. Records from before #8 are history and
  keep that path in their text: the spec and bug folders that merged before it, closed issues and
  merged PRs. Read it as `.specify/specs/`.
- `.specify/specs/.gitignore` is written by hand, not by Spec Kit. The managed `.specify/.gitignore`
  ignores every `feature.json` below `.specify/`; this file keeps one that is inside a spec folder.

### Bug fixes

The `bug` extension gives three skills. Run them in this order:

1. `/speckit-bug-assess "<symptom>" slug=<slug>` finds the cause and writes
   `.specify/bugs/<slug>/assessment.md`. It changes no code. Pull `main` first, then run it in the
   main checkout. When the issue is created, the folder becomes `.specify/bugs/NNN-<slug>/`
   ("Folder names", above); move it into the worktree as for a spec folder. For a bug issue that already
   exists, you can run it in the worktree instead, with the text from `gh issue view <n>` and
   `slug=NNN-<slug>` ("Folder names", above).
2. `/speckit-bug-fix slug=NNN-<slug>` makes the fix and writes `fix.md`.
3. `/speckit-bug-test slug=NNN-<slug>` runs the checks again and writes `test.md`.

Things to know:

- The slug starts with the issue number ("Folder names", above). Apart from adding that number once
  the issue exists, keep the slug for the whole ticket.
- Commit the bug folder with the fix. Once the fix has merged, the folder is history.
- The assess skill quotes the report in `assessment.md` and records any URL it was given exactly as
  given. Give it the issue text, not a URL. Pasted logs can also hold secrets. Before you commit the
  folder, check that it holds no token, password or signed URL; the constitution ("Development
  workflow") keeps credentials out of the repo.
- Tickets that use bug triage need no `.specify/specs/` folder and no `.specify/feature.json`.
- Write the Constitution Check by hand as its own section at the end of `assessment.md`, before the
  first fix. It is then committed with the notes.
- `assessment.md` does not change after the fix starts. If the fix departs from it, record why under
  "Deviations from Assessment" in `fix.md`, in the same commit.
- The skills ask before they overwrite a report. Do not run `/speckit-bug-fix` again when `fix.md`
  exists.
- The bug folder gets a `review.html` as a spec folder does, by the same rule, which builds the
  first page and refreshes it ("Spec review page" under "Checking review findings" in
  `.claude/skills/workflow-common/REFERENCE.md`).

### Keeping the spec current

While a feature is being built, its spec folder must describe the feature as it is being built
(constitution, "Implementation-to-Spec Consistency"). Once the work has merged, the folder is
history.

When a decision, a count, the scope, the approach or the shape of a test departs from the spec, do
one sweep before you push:

1. In `research.md`, record the new decision with its date and reason. Keep the old decision as the
   rejected alternative.
2. Carry the change through the rest of the folder: a dated entry under "Clarifications" in
   `spec.md`; `plan.md` (summary, Technical Context, Constitution Check, project structure and
   phases); `data-model.md`; `contracts/`; the `tasks.md` task that did the work (add a suffixed
   task, such as `T053b`, if work was added); `checklists/`; and any file the feature added.
3. Run `/speckit-analyze` and fix what it finds.
4. Commit the spec changes with the code, in the same commit.
5. Then build or refresh the spec review page where it applies ("Spec review page" under "Checking review
   findings" in `.claude/skills/workflow-common/REFERENCE.md`).

A change written only in a PR body or a commit message does not count.

### Setup

Install the CLI from the release tag the repo uses:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.2.2
```

Use a release tag, not the main branch. A build from main is unreleased work, and its version ends
in `.dev0`.

The repo was set up with:

```bash
specify init --here --force --non-interactive --ignore-agent-tools --integration claude --script sh
git add --chmod=+x .specify/scripts/bash/*.sh
```

Use `--script sh`, because the constitution (Principle IV) says repo scripts use bash. Most macOS and
Linux machines also have no PowerShell for `ps`. The `py` option installs the PowerShell scripts too,
and needs `python`. Do not run `init` again on this repo: `--force` overwrites
changed shared files.

### Upgrading

1. Find the newest release on the [releases page](https://github.com/github/spec-kit/releases).
   Run `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z`,
   then `specify integration upgrade claude` and `specify extension update bug`. `uv tool upgrade`
   does not move a pinned tag. Change the version and the tag in this file.
   A new version can change the managed files and the bug extension: read that diff. Running the
   same version again changes only the `installed_at` times.
   The repo's bug extension comes from the copy inside Spec Kit, not from the online catalogue. If
   `specify extension list` does not show the version that the new release ships, run
   `specify extension remove bug`, `specify extension add bug`, then
   `specify integration upgrade claude` again.
2. The upgrade refuses if someone changed a managed file by hand. Read the diff before you commit.
3. If the upgrade adds a script, run `git add --chmod=+x .specify/scripts/bash/*.sh` again.

### Line endings

`.gitattributes` forces LF. Spec Kit's manifests (`.specify/integrations/*.manifest.json`) store a
SHA-256 hash of each file's exact bytes. With CRLF, files nobody changed look changed, and
`specify integration upgrade` refuses to run.

## Release

A ticket is a release when it changes anything under `plugins/runway/` or
`.claude-plugin/marketplace.json`, because Claude Code updates an installed mod by its version.
These files are also what "touches the mod" means in "Ticket workflow", step 1.
A ticket that changes only repo files (docs, specs, tests, CI, scripts, package files, README) is
not a release. Each user-facing ticket is its own release.

Pick the level by what users see (SemVer):

- patch for a fix;
- minor for a new part, option or behaviour;
- major for a change that breaks use.

In the PR that raises the version:

1. Run `npm run bump-version -- X.Y.Z`. `npm run check-version` must pass.
2. Add a `### X.Y.Z` entry at the top of the "Runway mod" section of
   `plugins/runway/CHANGELOG.md`: a few plain bullets that say what changed for users. The summary
   lives in the repo, so it survives a move away from GitHub.
3. Run the tests, `claude plugin validate plugins/runway` and `claude plugin test plugins/runway`.

After the merge, do the release run that the constitution asks for (Principle V): on the owner's
system, on a detached checkout of the merge commit. Claude runs the validation and the hooks tests.
The owner loads the mod with `claude --plugin-dir` in a real session and reads the band against
`/usage`, `/context` and `/cost`, because Claude cannot see the band. The run can open that session
for the owner. The steps are in "Release run" in `.claude/skills/workflow-common/REFERENCE.md`. Its table (each step, pass, fail or unsure,
and a note) is a comment on the merged PR. The history export copies that comment to the release
run entry `docs/history/YYYY/MM/release-run-vX.Y.Z.md` ("History", above).

The CI run on the merge commit on `main` must pass too. It is the last step of the release run, so
its result is in the same table.

If a step fails, do not publish. The version stays on `main` with no tag. The fix is a new ticket
and a new patch release, with a new, higher number. Its `CHANGELOG.md` entry also says what the
failed version changed. If a step is unsure, do not publish until the owner has finished the run.

When the run passes, publish a GitHub release on that same merge commit:

- the tag `vX.Y.Z` on the merge commit;
- the title `vX.Y.Z`;
- notes that are the `CHANGELOG.md` entry, followed by GitHub's generated notes.

```bash
gh release create vX.Y.Z --target <merge commit> --title "vX.Y.Z" --notes-file <entry> --generate-notes
```

The full PR list of a release comes from git, because every squash merge puts the PR title in the
commit subject: `git log --oneline v<previous>..v<version>`.
