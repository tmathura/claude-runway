# claude-runway

A Claude Code mod that draws one band above the prompt. The band shows how much is left of the usage
limits, the context window and the prompt cache, with the session cost and the running agents.

This file only gives directions. The rules live in the files below.

## Read first

- [Constitution](.specify/memory/constitution.md): the project rules. It wins over every other doc.
- [docs/conventions.md](docs/conventions.md): how to write code, tests and docs.
- [docs/development.md](docs/development.md): the ticket workflow, Spec Kit and release. While a
  feature is being built, keep its spec folder in step with the code.

## Layout

```
.claude-plugin/marketplace.json   marketplace entry
plugins/runway/                   the mod: hooks/runway.ts is the only file that calls Claude Code,
                                  hooks/lib has the pure functions, types/ the state contract,
                                  tests/ the hooks tests
scripts/bump-version.mjs          sets and checks the version in every manifest
tests/                            node --test suites for hooks/lib and the scripts
docs/                             conventions and workflow
specs/                            Spec Kit feature folders
.specify/                         Spec Kit: constitution, templates, scripts, the bug extension
.claude/skills/speckit-*          Spec Kit skills (managed, do not edit)
```

## Commands

| Purpose | Command |
| --- | --- |
| Install | `npm ci --include=dev` |
| Type check | `npm run build` |
| Test the pure files | `npm test` |
| Check versions | `npm run check-version` |
| Validate the mod | `claude plugin validate plugins/runway` |
| Test the hooks | `claude plugin test plugins/runway` |
| Try the mod | `claude --plugin-dir plugins/runway` |
