# 0004. The text files are the source, with no database

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15, for `tmathura/copilot-plugin-cc` issue 162; taken over for this
  repo in ticket #24 ([issue](../history/github/2026/11/issue-024.md)).

## Context

The record must be readable from a clone, by a person and by an agent, with no network and no
extra tool. A database would make search fast, but it is a second copy that can differ from the
files, and git cannot show a readable diff of it.

## Options considered

- **A database file in the repo** (for example SQLite). Fast search. A binary file in git, a
  second copy of each fact, and a tool to read it. Rejected.
- **Text files only.** A text search finds a fact. Chosen.
- **A search index built from the files.** Allowed, but only outside git.

## Decision

The Markdown files under `docs/history/` and `docs/decisions/` are the source. The pages that
help a reader (the indexes, `current-state.md`, `open.md`, `gaps.md`) are built from those files
by `npm run history -- build`, and `npm run history -- check` fails when one is stale. The repo
holds no database. A search index that someone builds from the files stays out of git.

## Consequences

- The record needs only a text editor and a text search.
- The built pages are in git, so a reader on GitHub or in a zip download has them too. The cost
  is that a merge of two export branches can conflict in a built page. The fix is to run the
  build again, because the pages depend only on the entry files.
- The top block of a raw copy (`key: value` lines) is the only part that a program reads.
