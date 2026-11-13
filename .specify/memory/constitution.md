# claude-runway Constitution

Runway is a Claude Code mod. It draws one band above the prompt that shows how much is left of each
thing that can run out in a session: the usage limits, the context window and the prompt cache. It
also shows the session cost and the running agents.

The rules below are ranked. If two rules conflict, Principle I wins first, then Principle II. The
detailed conventions are in [docs/conventions.md](../../docs/conventions.md). The workflow steps are
in [docs/development.md](../../docs/development.md).

## Core Principles

### I. Watch only

- Every hook MUST pass its event on unchanged (`return next(e)`). The mod MUST NOT change, delay or
  refuse a prompt, a tool call, a model request or a setting.
- The mod MUST NOT send a message, start an agent, run a process, read or write a file, or use the
  network.
- The mod MUST read only the figures that Claude Code gives it: token counts, limits, cost, the
  model id, and the number and state of agents. It MUST NOT read or keep the text of a prompt, an
  answer or a tool call.
- What the mod keeps in local storage MUST be numbers, times, the model id and window names only.
- A feature that needs more than this MUST change this principle first, in its own ticket.

Why: a person installs the mod to see their session. It must be safe to leave on in every session,
including sessions with private code.

### II. A missing reading never breaks the band

- The mod API is early access. A field can be absent, and an account without a subscription has no
  limits. A part of the band with no reading MUST draw nothing. The other parts MUST still draw.
- A hook MUST NOT throw on an absent, zero, negative or out-of-range figure, or on a window name it
  does not know.
- The mod MUST use only what the type file of the running build declares. `claude plugin validate`
  MUST pass.
- The supported Claude Code versions MUST be documented.

### III. Small, own code, no dependencies

- The mod MUST NOT have runtime npm dependencies.
- A devDependency is allowed only for build or test. Its PR MUST give the reason.
- Code MUST come from one of three sources: code written in this repo, the Spec Kit files already
  in the repo, or repo tooling outside the mod that the owner wrote in another of the owner's own
  repos.
- Code from other mods MUST NOT be copied. Those repos are read for ideas only. An idea taken from
  another mod MUST be credited in `NOTICE`.
- A new part of the band, a new option or a new layer MUST be justified in its spec. The default
  answer is no.

### IV. Every surface, every system

- The band MUST draw from one tree on every surface that has the band: the terminal, the desktop
  app and VS Code. It MUST use only elements that all of them have.
- The band MUST fit the width that Claude Code gives it. On a narrow width it MUST drop whole parts,
  the least urgent first. It MUST NOT wrap to a second row or cut a part in the middle.
- The mod MUST work the same on macOS, Linux and Windows.
- Repo scripts MUST use Node or bash (Git Bash on Windows). They MUST NOT use PowerShell or fixed
  paths.

### V. Tested, including failure paths

- The logic that turns readings into text MUST be pure functions, tested with `node --test`.
- The hooks MUST be tested with `claude plugin test`.
- A change MUST have tests for the failure paths it touches: no reading yet, an account with no
  limits, an unknown window name, a reset time in the past, a figure of zero, and a width too narrow
  for every part.
- Before a GitHub release `vX.Y.Z` is published, a release run MUST load the mod with
  `claude --plugin-dir` in a real session on the owner's system and check each part of the band
  against `/usage`, `/context` and `/cost`. CI runs the automated tests on Windows, macOS and Linux.

## Distribution, licensing and versioning

- The license is Apache-2.0. The repo ships `LICENSE` and `NOTICE`.
- The repo is its own plugin marketplace. Users install with
  `claude plugin marketplace add tmathura/claude-runway`, then
  `claude plugin install runway@tmathura-runway`.
- Versions use SemVer, measured by what users see. The package, plugin and marketplace versions MUST
  match. A check script MUST enforce this. Every release MUST raise the version.
- The constitution has its own version.
- A new feature MUST start with a spec.

## Development workflow

- Each change has one GitHub issue and one branch, `<type>/<n>-<slug>`, in its own worktree. Commit
  subjects are `[#n] Imperative description`. PRs are squash-merged into `main`.
- A plan's Constitution Check MUST mark each principle as met (with the planned proof), not relevant
  (with the reason), or not met. "Not met" needs the owner's approval and a line in Complexity
  Tracking.
- A PR is merged only when tests and CI pass, the review rounds have finished, and each finding is
  fixed or recorded with the reason it was rejected.
- Pushes need the owner's approval. Starting the ticket workflow counts as approval for that
  ticket's own pushes and PR. Merging is the owner's step.

## Governance

- This constitution comes before all other project rules and docs.
- To change it, open a ticket and a PR, and raise the version: MAJOR when a principle is removed or
  changes meaning, MINOR when a principle is added or grows, PATCH for wording.
- Every plan and every PR review checks the work against this constitution.

### Implementation-to-Spec Consistency (non-negotiable)

- Every session reads the feature's spec folder (`specs/NNN-<name>/`) first. While the feature is
  being built, the folder MUST describe the feature as it is being built.
- When the work departs from any file in the spec folder, in scope, approach, a decision, a count or
  the shape of a test, those files MUST be updated in the same commit as the code, before the PR is
  pushed.
- The update MUST give the date and the reason. It MUST keep the earlier decision as the rejected
  alternative.
- The change MUST be carried through every file that repeats it.
- A change recorded only in a PR body or a commit message is a silent change. It is not allowed.
- Once the feature has merged, its spec folder is history. Later work does not update it.

Why: the agent trusts the spec folder at the start of each session. A decision changed in one file
only leaves stale copies in the others, and reviews then find them one at a time.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
