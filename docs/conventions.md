# Conventions

How to write code, tests and docs in this repo. The
[constitution](../.specify/memory/constitution.md) wins if this file disagrees with it.

## Code

- TypeScript files (`.ts`) that Claude Code and Node both load as they are. There is no build output.
  Use only syntax that Node can strip: no `enum`, no `namespace`, no parameter properties.
- An import of a local file names it without a suffix (`./lib/view`), the form that Claude Code
  reads. `tests/resolve-ts.mjs` adds the suffix for Node.
- A file under `lib/` does not import from `claude-code`, so that Node can run it in a test.
- The types of the mod's state are written once, in `plugins/runway/types/index.d.ts`. Claude Code
  reads that file as the state contract, and it cannot hold an import.
- Double quotes, semicolons, 2-space indent, LF line endings.
- Small functions with named exports. Helpers stay private to their module.
- The files under `plugins/runway/hooks/lib/` are pure: they take readings and the time as
  arguments, and return data. They do not call `$`. Only `runway.ts` calls `$`.
- A function that gets an absent or wrong figure returns "no reading". It does not throw.

### Comments

Write a comment only to say why the code is the way it is, when the code cannot show it. Do not
describe what the code does. Do not put ticket or spec ids in comments; they belong in commits and
PRs. The exception is the notice that a file was changed from another project, which the license
requires.

Before:

```ts
// Loop over the parts and drop the last one until the band fits (#1, see spec 001)
```

After:

```ts
// A part cut in the middle reads as a wrong figure, so a part is dropped whole.
```

## Tests

- A behaviour change comes with its tests in the same PR.
- Test the pure files with `node --test` and `node:assert/strict`. Pass the time in as an argument;
  a test never reads the real clock.
- Test the hooks with `claude plugin test plugins/runway`.
- Cover the failure paths in the constitution, Principle V.
- Tests do not use the network or a real login.
- Name a test file after the module or the behaviour it covers.

## Docs

- Each fact lives in one file. Other files link to it.
- Change the docs in the same PR as the behaviour.
- Write plainly, in the style of ASD-STE100: short sentences, one idea in each, everyday words. Keep
  code names exactly as they are.
- Draw diagrams as Mermaid blocks.
