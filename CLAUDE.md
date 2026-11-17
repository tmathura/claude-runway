# claude-runway

A Claude Code mod that draws one band above the prompt. The band shows how much is left of the usage
limits, the context window and the prompt cache, with the session cost and the running agents.

This file only gives directions. The rules live in the files below.

## Read first

- [docs/history/current-state.md](docs/history/current-state.md): read this page first. It says
  where the work stands: the last release, the last merged changes, what is open. It is built
  from GitHub at the last export, so it can be behind `main`. Before you act on it, do the
  check at the start of "History" in [docs/development.md](docs/development.md): two commands
  tell whether the page is behind `main`. When it is behind, take the facts from git and
  GitHub, not from the page, as that text says. Also check the files that the page links to.
- [Constitution](.specify/memory/constitution.md): the project rules. It wins over every other doc.
- [docs/conventions.md](docs/conventions.md): how to write code, tests and docs.
- [docs/development.md](docs/development.md): the ticket workflow, the history record, Spec Kit
  and release. While a feature is being built, keep its spec folder in step with the code, as
  "Keeping the spec current" there says.
- [docs/decisions/](docs/decisions/README.md): the decisions that no ticket records, one file
  each. When you make such a decision or drop an idea, add a record ("History" in
  `docs/development.md`).

## Layout

```
.claude-plugin/marketplace.json   marketplace entry
plugins/runway/                   the mod: hooks/runway.ts is the only file that calls Claude Code,
                                  hooks/lib has the pure functions, types/ the state contract,
                                  tests/ the hooks tests
scripts/bump-version.mjs          sets and checks the version in every manifest
scripts/history.mjs               exports GitHub to docs/history, builds its pages, checks them
tests/                            node --test suites for hooks/lib, the scripts and the workflow skills
docs/                             architecture, configuration, operations, conventions, workflow
docs/history/                     the history of each change: entries by month, raw copies of
                                  GitHub under github/, built pages (do not edit by hand)
docs/decisions/                   decision records, one file each
.specify/                         Spec Kit: constitution, templates, scripts, the bug extension, bug notes
.specify/specs/                   Spec Kit feature folders
.claude/skills/speckit-*          Spec Kit skills (managed, do not edit)
.claude/skills/workflow-*         the ticket workflow skills (written for this repo, edit as normal)
.claude/skills/spec-review-page   builds review.html, a one-page reading aid, in a spec or bug folder
```

## Commands

| Purpose | Command |
| --- | --- |
| Install | `npm ci --include=dev` |
| Type check | `npm run build` |
| Test the pure files | `npm test` |
| Check versions | `npm run check-version` |
| Build the history pages | `npm run history -- build` |
| Check the history record | `npm run history -- check` |
| Validate the mod | `claude plugin validate plugins/runway` |
| Test the hooks | `claude plugin test plugins/runway` |
| Try the mod | `claude --plugin-dir plugins/runway` |
