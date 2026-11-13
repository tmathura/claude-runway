# Development

How work moves from an idea to `main`. The rules behind these steps are in the
[constitution](../.specify/memory/constitution.md).

## Ticket workflow

1. Plan. Choose how by what the change touches:

   | The change | Plan with |
   | --- | --- |
   | Touches the mod and fixes a defect | Spec Kit bug triage ("Bug fixes", below) |
   | Touches the mod, anything else | The Spec Kit spec flow ("Spec Kit", below) |
   | Does not touch the mod: docs outside it, tests only, tooling, CI | Claude plan mode |

   "Touches the mod" means it changes `plugins/runway/**` or `.claude-plugin/marketplace.json`.
2. Open a GitHub issue from the plan, as "Tickets" (below) says.
3. Make a branch `<type>/<n>-<slug>` from the latest `origin/main`, in its own worktree under
   `.claude/worktrees/`. The type is `bugfix` for an issue with the `bug` label, and `feature` for
   all others. The slug is 3 to 5 words from the issue title, in kebab-case.
4. Make the change, with its tests and docs. If the work departs from the spec, update the spec in
   the same commit. If the change touches the mod, raise the version and add the `CHANGELOG.md`
   entry ("Release", below).
5. Run the commands in [CLAUDE.md](../CLAUDE.md). They must pass. Do this before every commit.
6. Commit with the subject `[#n] Imperative description`: 72 characters at most, no full stop at the
   end. Stage files by name. Never commit on `main`.
7. Review the branch. Fix the confirmed findings, and record rejected ones with the reason.
8. Open a PR into `main`. Its title has the same form as a commit subject. Its body has these
   sections: `## Problem`, `## Change`, `## Testing`, then `Closes #n`. Each push rewrites the body
   so that it describes the branch as it is now.
9. The owner squash-merges when every CI check passes.

## Tickets

- Title: an imperative sentence that says what changes. No ticket number, no type prefix, no full
  stop at the end.
- Body sections, in order: `## Problem`, `## Expected behaviour`, `## Solution requirements`,
  `## Acceptance criteria` (`- [ ]` items). The last line is `Spec: specs/NNN-<name>/` or
  `Bug notes: .specify/bugs/NNN-<slug>/`.
- Exactly one type label, the first that fits: `documentation`, `bug`, `enhancement`.

## Spec Kit

Spec Kit 1.2.2 is set up for Claude Code with bash scripts. The `speckit-*` skills and the files
under `.specify/`, except the constitution and the bug notes, are managed files: do not edit them.

- A spec folder and a bug folder start with the ticket's GitHub issue number, padded with zeros to 3
  digits: `specs/NNN-<name>/` and `.specify/bugs/NNN-<slug>/`. For #7, `NNN` is `007`.
- Always pass `SPECIFY_FEATURE_DIRECTORY=specs/NNN-<name>` to the Spec Kit scripts. Without it,
  Spec Kit takes the highest number in `specs/` plus one, which is not the issue number.
- The order is: specify, clarify (optional), plan, tasks, analyze, implement.
- `tasks.md` MUST include test tasks, although the template says tests are optional.

To update Spec Kit, install the CLI at the new tag
(`uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z`),
then run `specify integration upgrade claude` and `specify extension update bug`. If the upgrade
brings back `.specify/workflows/`, delete it.

## Bug fixes

A defect in the mod uses the Spec Kit `bug` extension: `/speckit-bug-assess`, `/speckit-bug-fix` and
`/speckit-bug-test`. The notes go in `.specify/bugs/NNN-<slug>/` and are committed with the fix.
Write a `## Constitution Check` in `assessment.md`, because the template has none.

## Release

Each ticket that touches the mod is its own release.

1. `npm run bump-version -- X.Y.Z` sets the version in every manifest.
2. Add a `### X.Y.Z` entry to `plugins/runway/CHANGELOG.md`: a few plain bullets that say what
   changed for users.
3. After the PR is merged, do the release run in the constitution, Principle V, on the merge commit.
4. If the run passes, publish the GitHub release `vX.Y.Z` on that commit.
