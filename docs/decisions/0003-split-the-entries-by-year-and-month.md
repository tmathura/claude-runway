# 0003. Split the entries by year and month

- Status: accepted
- Date: 2026-11-15
- Source: the owner, 2026-11-15, for `tmathura/copilot-plugin-cc` issue 162; taken over for this
  repo in ticket #24 ([issue](../history/github/2026/11/issue-024.md)).

## Context

The record gets one file for each entry ([0002](0002-the-form-of-the-history-record.md)). The
files need folders, or one folder grows without limit. A list of all entries has the same
problem.

## Options considered

- **One folder for all entries.** Simple, but it grows without limit. Rejected.
- **Folders by version.** Most tickets are not a release, so they have no version of their own.
  Rejected.
- **Folders by the year and month of the event.** Each entry has a date, and a month folder
  stays small. Chosen.

## Decision

Entries and raw copies are in `YYYY/MM/` folders, by the UTC date of the event:

| File | Event |
| --- | --- |
| `docs/history/YYYY/MM/ticket-NNN.md`, `pr-NNN.md` | the merge of the PR |
| `docs/history/YYYY/MM/release-run-vX.Y.Z.md` | the merge of the PR that set the version |
| `docs/history/github/YYYY/MM/issue-NNN.md`, `pull-NNN.md` | the item was created |
| `docs/history/github/YYYY/MM/release-vX.Y.Z.md` | the release was created |

Each of these dates never changes, so a file keeps its path and a link to it stays good. An
issue that closes later, or a draft release that is published in another month, keeps its path.
A release run entry does not use the date of its table comment, because a newer table can be
posted in a later month, and other entries and decision records link to the file.

Each month folder has a `README.md` that lists its files. `docs/history/README.md` lists the
months. No page lists all entries.

## Consequences

- No file and no folder grows without limit.
- A ticket's entry is found by its number with a file search (`ticket-007.md`), or through the
  month index.
- A release run table that is posted again replaces the text of its entry. The file stays
  where it is.
- One case still moves a release run entry: a second PR, merged in another month, sets the same
  version again and gets a newer table. The release rules do not allow this (a version number
  is not used again), so it needs a mistake first. A link to the old path is then dead, and
  `npm run history -- check` names it.
