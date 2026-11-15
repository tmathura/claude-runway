import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { makeTempDir, run } from "./helpers.mjs";
import {
  FIELDS_MARK,
  NOT_RECORDED,
  REPO,
  build,
  check,
  exportHistory,
  findSensitive,
  headings,
  parseEntry,
  parseTop,
  redact,
  renderTop,
  sha256
} from "../scripts/history.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "history.mjs");
const SHA = (letter) => letter.repeat(40);
const URL = `https://github.com/${REPO}`;

// ---------------------------------------------------------------------------------------------
// Fixtures: what GitHub and git give

function issue(number, more = {}) {
  return {
    number,
    title: `Issue ${number}`,
    state: "closed",
    state_reason: "completed",
    labels: [{ name: "enhancement" }],
    user: { login: "tmathura" },
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
    closed_at: "2026-11-02T10:00:00Z",
    html_url: `${URL}/issues/${number}`,
    body: "## Problem\n\nText.",
    ...more
  };
}

const FULL_BODY = "## Problem\n\nP.\n\n## Change\n\nC.\n\n## Testing\n\nT.\n\n## Plan comparison\n\nPC.\n\n## Review rounds\n\nR.\n\n## State\n\nS.";

function pull(number, more = {}) {
  const ticket = more.ticket ?? number - 1;
  return {
    number,
    title: `[#${ticket}] Change ${ticket}`,
    state: "closed",
    draft: false,
    labels: [],
    user: { login: "tmathura" },
    created_at: "2026-11-01T11:00:00Z",
    updated_at: "2026-11-03T10:00:00Z",
    closed_at: "2026-11-03T10:00:00Z",
    merged_at: "2026-11-03T10:00:00Z",
    merge_commit_sha: SHA("a"),
    head: { ref: `feature/${ticket}-change` },
    base: { ref: "main" },
    html_url: `${URL}/pull/${number}`,
    body: FULL_BODY,
    ...more
  };
}

function comment(number, more = {}) {
  return {
    issue_url: `https://api.github.com/repos/${REPO}/issues/${number}`,
    user: { login: "tmathura" },
    created_at: "2026-11-03T12:00:00Z",
    updated_at: "2026-11-03T12:00:00Z",
    html_url: `${URL}/issues/${number}#issuecomment-${more.id ?? 1}`,
    body: "A comment.",
    ...more
  };
}

function release(tag, more = {}) {
  return {
    tag_name: tag,
    name: tag,
    draft: false,
    prerelease: false,
    author: { login: "tmathura" },
    created_at: "2026-11-03T13:00:00Z",
    published_at: "2026-11-03T13:00:00Z",
    target_commitish: SHA("a"),
    html_url: `${URL}/releases/tag/${tag}`,
    body: "Notes.",
    ...more
  };
}

const thread = (more = {}) => ({
  isResolved: true,
  isOutdated: false,
  path: "a.ts",
  line: 3,
  comments: {
    pageInfo: { hasNextPage: false },
    nodes: [{ author: { login: "coderabbitai" }, createdAt: "2026-11-03T09:00:00Z", url: `${URL}/pull/2#discussion_r1`, body: "A finding." }]
  },
  ...more
});

function httpError(text) {
  return Object.assign(new Error(text), { stderr: text });
}

// A fake `gh` and `git` for one state of GitHub. `fail(args)` makes a call throw.
function fakes(state) {
  const calls = [];
  const paged = (items) => JSON.stringify(state.pageSize ? chunk(items, state.pageSize) : [items]);
  const gh = (args) => {
    calls.push(args.join(" "));
    if (state.fail?.("gh", args)) {
      throw httpError("gh: HTTP 500");
    }
    const target = args[args.length - 1];
    if (args[1] === "graphql") {
      const number = Number(args.find((arg) => arg.startsWith("n=")).slice(2));
      const nodes = state.threads?.[number] ?? [];
      return JSON.stringify({
        data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: state.moreThreads === number }, nodes } } } }
      });
    }
    const api = target.replace(`repos/${REPO}/`, "");
    if (api.startsWith("issues/comments")) {
      return paged(state.comments ?? []);
    }
    if (api.startsWith("issues?")) {
      return paged([...(state.issues ?? []), ...(state.pulls ?? []).map((item) => ({ ...item, pull_request: {} }))]);
    }
    if (api.startsWith("pulls?")) {
      return paged(state.pulls ?? []);
    }
    let match = /^pulls\/(\d+)\/(files|reviews)/.exec(api);
    if (match) {
      const list = match[2] === "files" ? state.files?.[match[1]] : state.reviews?.[match[1]];
      return paged(match[2] === "files" ? (list ?? []).map((filename) => ({ filename })) : list ?? []);
    }
    if (api.startsWith("releases")) {
      return paged(state.releases ?? []);
    }
    match = /^git\/ref\/tags\/(.+)$/.exec(api);
    if (match) {
      const tag = state.tags?.[match[1]];
      if (!tag) {
        throw httpError("gh: Not Found (HTTP 404)");
      }
      return JSON.stringify({ object: typeof tag === "string" ? { type: "commit", sha: tag } : { type: "tag", sha: tag.object } });
    }
    match = /^git\/tags\/(.+)$/.exec(api);
    if (match) {
      const tag = Object.values(state.tags).find((item) => item.object === match[1]);
      return JSON.stringify({ object: { sha: tag.commit } });
    }
    throw new Error(`unexpected gh call: ${args.join(" ")}`);
  };
  const git = (args) => {
    calls.push(`git ${args.join(" ")}`);
    if (state.fail?.("git", args)) {
      throw httpError("git: fatal");
    }
    if (args[0] === "fetch" || args[0] === "ls-files") {
      return "";
    }
    if (args[0] === "check-ignore") {
      throw new Error("not ignored");
    }
    if (args[0] === "diff") {
      return (state.changed ?? []).join("\n");
    }
    if (args[0] === "show") {
      const [ref, file] = args[1].split(/:(.*)/);
      if (file === "package.json") {
        return JSON.stringify({ version: state.versions?.[ref] ?? "0.1.0" });
      }
      if (state.base?.[file] === undefined) {
        throw new Error("no such file at the ref");
      }
      return state.base[file];
    }
    throw new Error(`unexpected git call: ${args.join(" ")}`);
  };
  return { gh, git, calls };
}

function chunk(items, size) {
  const pages = [];
  for (let at = 0; at < items.length; at += size) {
    pages.push(items.slice(at, at + size));
  }
  return pages.length > 0 ? pages : [[]];
}

function runExport(root, state, more = {}) {
  const log = [];
  const { gh, git, calls } = fakes(state);
  const code = exportHistory({ root, gh, git, log: (line) => log.push(line), ...more });
  return { code, log: log.join("\n"), calls };
}

const read = (root, file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (root, file) => fs.existsSync(path.join(root, file));
const DEVELOPMENT = "docs/development.md";
// A repo root with the one hand-written file that the generated pages link to.
function makeRoot() {
  const root = makeTempDir();
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, DEVELOPMENT), "# Development\n");
  return root;
}
// The files that the command wrote.
const tree = (root) =>
  fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .filter((file) => file !== DEVELOPMENT)
    .sort();
const snapshot = (root) => Object.fromEntries(tree(root).map((file) => [file, read(root, file)]));

// The entry text with one field set by hand.
const setField = (text, name, value) => text.replace(new RegExp(`(## ${name}\\n\\n)[^\\n]*`), (_, start) => `${start}${value}`);

// One ticket: issue 1, merged PR 2.
const ONE = () => ({ issues: [issue(1)], pulls: [pull(2)], threads: { 2: [thread()] } });
const ENTRY = "docs/history/2026/11/ticket-001.md";
const RAW_PULL = "docs/history/github/2026/11/pull-002.md";
const RAW_ISSUE = "docs/history/github/2026/11/issue-001.md";

// Made-up values, built from parts so that no file in the repo holds a real-looking secret.
const TOKEN = ["gh", "p_", "a1B2".repeat(9)].join("");
const TOKEN_2 = ["gh", "p_", "z9Y8".repeat(9)].join("");
const EMAIL = ["jane.doe", "corp.example.io"].join("@");
const EMAIL_2 = ["john.roe", "corp.example.io"].join("@");

// ---------------------------------------------------------------------------------------------
// Raw copies

test("the top block reads back to the same values", () => {
  const values = { kind: "issue", number: 7, title: 'A "title": with\\odd text', labels: ["bug"], closed_at: null };
  assert.deepEqual(parseTop(`${renderTop(values)}\nbody`), values);
});

test("a broken top block is an error", () => {
  assert.throws(() => parseTop("# no block\n"), /top block/);
  assert.throws(() => parseTop("---\nkind: \"issue\"\n"), /no end line/);
  assert.throws(() => parseTop("---\nkind: issue\n---\n"), /not JSON/);
  assert.throws(() => parseTop("---\nnumber: 1\n---\n"), /no `kind`/);
});

test("headings outside code fences are found", () => {
  assert.deepEqual(headings("## One\r\ntext\n```\n## not this\n```\n##  Two  \n### three"), ["One", "Two"]);
});

test("an export writes the raw copies with LF and is the same on a second run", () => {
  const root = makeRoot();
  const state = ONE();
  state.issues[0].body = "## Problem\r\n\r\nLine.\r\n";
  state.comments = [comment(1, { body: `First\r\ncomment.\n<!-- ${"Ab0+/_-=".repeat(125)} -->\n${"x".repeat(999)}` })];
  state.reviews = { 2: [{ user: { login: "copilot" }, state: "COMMENTED", submitted_at: "2026-11-03T09:30:00Z", commit_id: SHA("b"), html_url: `${URL}/pull/2#r1`, body: "" }] };
  assert.equal(runExport(root, state).code, 0);
  const text = read(root, RAW_ISSUE);
  assert.ok(!text.includes("\r"));
  assert.equal(parseTop(text).title, "Issue 1");
  assert.deepEqual(parseTop(text).headings, ["Problem"]);
  assert.match(text, /\*\*Comment\*\* by `tmathura`, 2026-11-03T12:00:00Z/);
  // Encoded text that nobody can read is left out; a shorter run stays.
  assert.match(text, /<!-- \[left out: 1000 characters of encoded text\] -->\nx{999}\n/);
  const pullText = read(root, RAW_PULL);
  assert.equal(parseTop(pullText).merge_commit, SHA("a"));
  assert.match(pullText, /Review thread on `a\.ts` line 3 \(resolved\)/);
  assert.match(pullText, /_\(empty\)_/);
  const before = snapshot(root);
  assert.equal(runExport(root, state).code, 0);
  assert.deepEqual(snapshot(root), before);
});

test("the reader takes every page, and a PR in the issues list is no issue", () => {
  const root = makeRoot();
  const state = { pageSize: 1, issues: [issue(1), issue(3), issue(5)], pulls: [pull(2), pull(4)] };
  assert.equal(runExport(root, state).code, 0);
  const files = tree(root).filter((file) => file.includes("/github/"));
  assert.deepEqual(
    files.map((file) => path.basename(file)),
    ["README.md", "issue-001.md", "issue-003.md", "issue-005.md", "pull-002.md", "pull-004.md"]
  );
});

for (const [name, fail] of [
  ["a failed read", (tool, args) => tool === "gh" && args.at(-1).includes("releases")],
  ["a failed git fetch", (tool, args) => tool === "git" && args[0] === "fetch"],
  ["a failed git show of the merge commit", (tool, args) => tool === "git" && args[1] === `${SHA("a")}:package.json`],
  ["a failed git show of its parent", (tool, args) => tool === "git" && args[1] === `${SHA("a")}^:package.json`],
  ["a failed read of the PR file list", (tool, args) => tool === "gh" && args.at(-1).includes("/files")]
]) {
  test(`${name} gives exit 2 and leaves the files of an earlier run as they were`, () => {
    const root = makeRoot();
    const state = ONE();
    state.pulls.push(pull(9, { ticket: 1, head: { ref: "export/1-history" }, title: "[#1] Export the history of #1" }));
    state.files = { 9: ["docs/history/README.md"] };
    assert.equal(runExport(root, state).code, 0);
    const before = snapshot(root);
    state.issues.push(issue(5));
    const result = runExport(root, { ...state, fail });
    assert.equal(result.code, 2);
    assert.deepEqual(snapshot(root), before);
  });
}

test("text that is not JSON, and a thread list or comment list with a next page, give exit 2 and no file", () => {
  for (const change of [
    (state) => ({ ...state, moreThreads: 2 }),
    (state) => ({ ...state, threads: { 2: [thread({ comments: { pageInfo: { hasNextPage: true }, nodes: [] } })] } })
  ]) {
    const root = makeRoot();
    const result = runExport(root, change(ONE()));
    assert.equal(result.code, 2);
    assert.match(result.log, /more review threads or thread comments/);
    assert.deepEqual(tree(root), []);
  }
  const root = makeRoot();
  const { git } = fakes(ONE());
  const log = [];
  assert.equal(exportHistory({ root, gh: () => "<html>", git, log: (line) => log.push(line) }), 2);
  assert.match(log.join("\n"), /not JSON/);
  assert.deepEqual(tree(root), []);
});

test("an unresolved thread on a closed PR that was not merged is exported with its state", () => {
  const root = makeRoot();
  const state = { pulls: [pull(2, { merged_at: null })], threads: { 2: [thread({ isResolved: false, isOutdated: true })] } };
  assert.equal(runExport(root, state).code, 0);
  assert.match(read(root, RAW_PULL), /\(not resolved, outdated\)/);
  assert.equal(parseTop(read(root, RAW_PULL)).state, "closed");
  assert.ok(!exists(root, ENTRY));
});

test("an export PR gives no file and no entry; a hand-written PR on an export branch gets both", () => {
  const exportPull = (more = {}) =>
    pull(9, { ticket: 1, head: { ref: "export/1-history" }, title: "[#1] Export the history of #1", merged_at: "2026-11-04T10:00:00Z", merge_commit_sha: SHA("c"), ...more });
  const generated = ["docs/history/README.md", "docs/decisions/README.md"];
  const cases = [
    [exportPull(), generated, false],
    [exportPull({ title: "[#1] Fix the export" }), generated, true],
    [exportPull(), [...generated, "scripts/history.mjs"], true]
  ];
  for (const [item, files, exported] of cases) {
    const root = makeRoot();
    assert.equal(runExport(root, { issues: [issue(1)], pulls: [pull(2), item], files: { 9: files } }).code, 0);
    assert.equal(exists(root, "docs/history/github/2026/11/pull-009.md"), exported);
    assert.equal(exists(root, "docs/history/2026/11/pr-009.md"), exported);
  }
  // A hand-written file on the second page of the file list still counts.
  const root = makeRoot();
  const state = { pageSize: 1, issues: [issue(1)], pulls: [pull(2), exportPull()], files: { 9: ["docs/history/README.md", "CLAUDE.md"] } };
  assert.equal(runExport(root, state).code, 0);
  assert.ok(exists(root, "docs/history/github/2026/11/pull-009.md"));
});

// ---------------------------------------------------------------------------------------------
// Releases and release runs

test("the tag commit decides the release state", () => {
  const cases = [
    [{}, {}, "merged, not a release"],
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0")], tags: { "v0.2.0": SHA("a") } }, {}, /^released as v0\.2\.0 \(\[release\]\(\.\.\/\.\.\/github\/2026\/11\/release-v0\.2\.0\.md\), no release run table on the PR\)$/],
    // The target is a branch name; the tag commit still decides.
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0", { target_commitish: "main" })], tags: { "v0.2.0": SHA("a") } }, {}, /^released as v0\.2\.0/],
    // An annotated tag points to its commit through the tag object.
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0")], tags: { "v0.2.0": { object: SHA("9"), commit: SHA("a") } } }, {}, /^released as v0\.2\.0/],
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0", { draft: true, published_at: null })] }, {}, "merged with version 0.2.0, not released"],
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0")], tags: { "v0.2.0": SHA("f") } }, {}, "merged with version 0.2.0, not released"],
    // The tag is not found (HTTP 404): no tag commit, and no failed export.
    [{ versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0")] }, {}, "merged with version 0.2.0, not released"],
    [{ versions: { [SHA("a")]: "0.2.0" } }, {}, "merged with version 0.2.0, not released"]
  ];
  for (const [more, , want] of cases) {
    const root = makeRoot();
    assert.equal(runExport(root, { ...ONE(), ...more }).code, 0);
    const state = /^- State: (.*)$/m.exec(read(root, ENTRY))[1];
    if (typeof want === "string") {
      assert.equal(state, want);
    } else {
      assert.match(state, want);
    }
  }
});

test("a draft release has no tag yet, and keeps its path when it is published in a later month", () => {
  const root = makeRoot();
  const draft = release("v0.2.0", { draft: true, published_at: null });
  const state = { ...ONE(), versions: { [SHA("a")]: "0.2.0" }, releases: [draft] };
  const first = runExport(root, state);
  assert.equal(first.code, 0);
  assert.ok(!first.calls.some((call) => call.includes("git/ref/tags")));
  const file = "docs/history/github/2026/11/release-v0.2.0.md";
  assert.equal(parseTop(read(root, file)).tag_commit, null);
  state.releases = [{ ...draft, draft: false, published_at: "2026-12-02T09:00:00Z" }];
  state.tags = { "v0.2.0": SHA("a") };
  assert.equal(runExport(root, state).code, 0);
  assert.equal(parseTop(read(root, file)).tag_commit, SHA("a"));
  assert.ok(!exists(root, "docs/history/github/2026/12/release-v0.2.0.md"));
  assert.match(read(root, ENTRY), /- State: released as v0\.2\.0/);
});

test("the release run table of the owner becomes an entry; the newest wins; a moved one leaves no old file", () => {
  const root = makeRoot();
  const table = "Release run v0.2.0\r\n\r\n| Step | Result |\n| --- | --- |\n| 1 | pass |";
  const state = {
    ...ONE(),
    versions: { [SHA("a")]: "0.2.0" },
    comments: [
      comment(2, { id: 1, body: table }),
      comment(2, { id: 2, user: { login: "someone" }, created_at: "2026-11-05T12:00:00Z", body: "Release run v0.2.0\n\nfake" }),
      comment(1, { id: 3, body: "Release run v0.9.9\n\nnot on a PR" })
    ]
  };
  assert.equal(runExport(root, state).code, 0);
  const runFile = "docs/history/2026/11/release-run-v0.2.0.md";
  const top = parseTop(read(root, runFile));
  assert.deepEqual([top.kind, top.version, top.pr, top.ticket, top.merge_commit], ["release-run", "v0.2.0", 2, 1, SHA("a")]);
  assert.match(read(root, runFile), /\| 1 \| pass \|/);
  assert.ok(!read(root, runFile).includes("fake"));
  assert.ok(!exists(root, "docs/history/2026/11/release-run-v0.9.9.md"));
  assert.match(read(root, ENTRY), /not released \(\[release run\]\(release-run-v0\.2\.0\.md\)\)/);
  assert.match(read(root, "docs/history/2026/11/README.md"), /\[Release run v0\.2\.0\]\(release-run-v0\.2\.0\.md\), PR #2\./);

  state.comments.push(comment(2, { id: 4, created_at: "2026-12-01T08:00:00Z", body: "Release run v0.2.0\n\n| 1 | fail |" }));
  assert.equal(runExport(root, state).code, 0);
  assert.ok(!exists(root, runFile));
  assert.match(read(root, "docs/history/2026/12/release-run-v0.2.0.md"), /\| 1 \| fail \|/);
  assert.match(read(root, ENTRY), /\(\[release run\]\(\.\.\/12\/release-run-v0\.2\.0\.md\)\)/);
});

// ---------------------------------------------------------------------------------------------
// Entries

test("an entry points to the sections of the PR body, or says not recorded", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls[0].body = "## Problem\n\nP.\n\n## Change\n\nC.";
  assert.equal(runExport(root, state).code, 0);
  const text = read(root, ENTRY);
  assert.match(text, /^# #1 Issue 1\n/);
  assert.match(text, /- Issue: \[#1\]\(\.\.\/\.\.\/github\/2026\/11\/issue-001\.md\), label `enhancement`/);
  assert.match(text, /- PR: \[#2\]\(\.\.\/\.\.\/github\/2026\/11\/pull-002\.md\), merged 2026-11-03/);
  assert.match(text, new RegExp(`- Commit on \`main\`: \`${SHA("a")}\``));
  assert.match(text, /- Planning notes: none in the repo/);
  const { fields, notes } = parseEntry(text);
  assert.equal(notes, "");
  assert.equal(fields["What changed"], "See `## Change` in [PR #2](../../github/2026/11/pull-002.md).");
  assert.equal(fields["Why"], "See `## Problem` and `## Change` in [PR #2](../../github/2026/11/pull-002.md).");
  for (const name of ["Options dropped", "What was checked", "Review result", "Left open"]) {
    assert.equal(fields[name], NOT_RECORDED);
  }
  const gaps = read(root, "docs/history/gaps.md");
  assert.equal(gaps.match(/ticket-001\.md/g).length, 4);
  assert.match(gaps, /\[#1 Issue 1\]\(2026\/11\/ticket-001\.md\): Left open/);
});

test("a second build keeps hand-written text and note lines, and refreshes generated fields and the header", () => {
  const root = makeRoot();
  const state = { ...ONE(), versions: { [SHA("a")]: "0.2.0" } };
  state.pulls[0].body = "## Problem\n\nP.";
  assert.equal(runExport(root, state).code, 0);
  assert.equal(parseEntry(read(root, ENTRY)).fields["Why"], "See `## Problem` in [PR #2](../../github/2026/11/pull-002.md).");
  const edited = read(root, ENTRY)
    .replace(FIELDS_MARK, `${FIELDS_MARK}\n- Backfilled: 2026-11-15. Sources: the PR.`)
    .replace(`## Left open\n\n${NOT_RECORDED}`, "## Left open\n\nNothing was left open (source: session transcript, 2026-11-14).");
  fs.writeFileSync(path.join(root, ENTRY), edited);

  state.pulls[0].body = "## Change\n\nC.\n\n## Testing\n\nT.";
  state.releases = [release("v0.2.0")];
  state.tags = { "v0.2.0": SHA("a") };
  assert.equal(runExport(root, state).code, 0);
  const { fields, notes } = parseEntry(read(root, ENTRY));
  assert.equal(notes, "- Backfilled: 2026-11-15. Sources: the PR.");
  assert.equal(fields["Left open"], "Nothing was left open (source: session transcript, 2026-11-14).");
  assert.equal(fields["What changed"], "See `## Change` in [PR #2](../../github/2026/11/pull-002.md).");
  assert.equal(fields["Why"], "See `## Change` in [PR #2](../../github/2026/11/pull-002.md).");
  assert.equal(fields["What was checked"], "See `## Testing` in [PR #2](../../github/2026/11/pull-002.md).");
  assert.match(read(root, ENTRY), /- State: released as v0\.2\.0/);
  assert.deepEqual(check(root), []);

  // The section is removed again: the pointer goes back to `not recorded`.
  state.pulls[0].body = "## Change\n\nC.";
  assert.equal(runExport(root, state).code, 0);
  assert.equal(parseEntry(read(root, ENTRY)).fields["What was checked"], NOT_RECORDED);
});

test("planning notes come from the repo's folders, else from the issue's plan comparison", () => {
  for (const [folder, issueBody, want] of [
    [".specify/specs/001-some-feature", "", /\[`\.specify\/specs\/001-some-feature\/`\]\(\.\.\/\.\.\/\.\.\/\.\.\/\.specify\/specs\/001-some-feature\)/],
    [".specify/bugs/001-some-bug", "", /\[`\.specify\/bugs\/001-some-bug\/`\]/],
    [".specify/specs/010-other", "## Plan comparison\n\nx", /the `## Plan comparison` of \[issue #1\]\(\.\.\/\.\.\/github\/2026\/11\/issue-001\.md\)/],
    [".specify/specs/010-other", "", /none in the repo/]
  ]) {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, folder), { recursive: true });
    const state = ONE();
    state.issues[0].body = issueBody;
    assert.equal(runExport(root, state).code, 0);
    assert.match(/^- Planning notes: (.*)$/m.exec(read(root, ENTRY))[1], want);
    assert.deepEqual(check(root), []);
  }
});

test("a merged PR with no ticket gets a pr entry that points to the PR text", () => {
  const root = makeRoot();
  const state = { pulls: [pull(3, { title: "build(deps): Bump a from 1 to 2", body: "Bumps a.", user: { login: "dependabot[bot]" } })] };
  assert.equal(runExport(root, state).code, 0);
  const file = "docs/history/2026/11/pr-003.md";
  const text = read(root, file);
  assert.match(text, /^# PR #3 build\(deps\): Bump a from 1 to 2\n/);
  assert.match(text, /- Issue: none \(a PR with no ticket\)/);
  assert.match(text, /- Planning notes: none$/m);
  const { fields } = parseEntry(text);
  assert.equal(fields["What changed"], "See the text of [PR #3](../../github/2026/11/pull-003.md).");
  assert.equal(fields["Why"], "See the text of [PR #3](../../github/2026/11/pull-003.md).");
  assert.equal(read(root, "docs/history/gaps.md").match(/pr-003\.md/g).length, 4);
  assert.deepEqual(check(root), []);
});

test("the generated pages list the entries, the open items and the state", () => {
  const root = makeRoot();
  const open = Array.from({ length: 17 }, (_, index) =>
    issue(20 + index, { state: "open", closed_at: null, labels: index === 0 ? [{ name: "bug" }, { name: "question" }] : [] })
  );
  const state = {
    issues: [issue(1), ...open],
    pulls: [pull(2), pull(60, { ticket: 59, state: "open", merged_at: null, merge_commit_sha: null, closed_at: null, updated_at: "2026-11-09T08:00:00Z" })],
    versions: { [SHA("a")]: "0.2.0" },
    releases: [release("v0.2.0")],
    tags: { "v0.2.0": SHA("a") }
  };
  fs.mkdirSync(path.join(root, "docs/decisions"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/decisions/0001-keep-history.md"), "# 0001. Keep history\n\n- Status: accepted\n- Date: 2026-11-15\n");
  assert.equal(runExport(root, state).code, 0);

  const current = read(root, "docs/history/current-state.md");
  assert.match(current, /- State of GitHub as of: 2026-11-09T08:00:00Z/);
  assert.match(current, /- Last release: \[v0\.2\.0\]\(github\/2026\/11\/release-v0\.2\.0\.md\), published 2026-11-03/);
  assert.match(current, /- Decision records: 1 /);
  assert.match(current, /- 2026-11-03: \[#1 Issue 1\]\(2026\/11\/ticket-001\.md\), released as v0\.2\.0 \(release, no release run table on the PR\)/);
  assert.match(current, /## Open issues \(17\)/);
  assert.match(current, /`question`\): waits for the owner/);
  assert.match(current, /- and 2 more: \[the full list\]\(open\.md\)/);
  assert.equal(current.match(/^- \[#\d+ Issue/gm).length, 15);
  assert.match(current, /## Open PRs \(1\)\n\n- \[#60 /);
  assert.equal(read(root, "docs/history/open.md").match(/^- \[#\d+ Issue/gm).length, 17);
  assert.match(read(root, "docs/history/2026/11/README.md"), /- 2026-11-03: \[#1 Issue 1\]\(ticket-001\.md\)\. Commit `aaaaaaa`, PR #2, released as v0\.2\.0/);
  assert.match(read(root, "docs/history/README.md"), /\[2026-11\]\(2026\/11\/README\.md\): 1 merged changes, 0 release runs; \[21 raw copies\]/);
  assert.match(read(root, "docs/decisions/README.md"), /- \[0001\. Keep history\]\(0001-keep-history\.md\): accepted, 2026-11-15/);
  assert.deepEqual(check(root), []);
});

test("an item that GitHub no longer has keeps its raw copy, marked gone, and is no longer open", () => {
  const root = makeRoot();
  const state = { issues: [issue(1), issue(5, { state: "open", closed_at: null, created_at: "2026-10-01T10:00:00Z" })], pulls: [pull(2)] };
  assert.equal(runExport(root, state).code, 0);
  const file = "docs/history/github/2026/10/issue-005.md";
  const before = read(root, file);
  assert.match(read(root, "docs/history/open.md"), /#5 Issue 5/);

  const gone = { ...state, issues: [issue(1)] };
  assert.equal(runExport(root, gone).code, 0);
  assert.equal(read(root, file), before.replace("\n---\n\n#", "\ngone: true\n---\n\n#"));
  assert.ok(!read(root, "docs/history/open.md").includes("#5 Issue 5"));
  assert.match(read(root, "docs/history/github/2026/10/README.md"), /issue-005\.md\), no longer on GitHub/);
  assert.deepEqual(check(root), []);

  // The proof for an export PR: the kept file may differ from the base only by the gone line.
  assert.equal(runExport(root, { ...gone, base: { [file]: before, [ENTRY]: read(root, ENTRY) } }, { exportBase: "origin/main" }).code, 0);
  const edited = runExport(root, { ...gone, base: { [file]: before.replace("Text.", "Other text."), [ENTRY]: read(root, ENTRY) } }, { exportBase: "origin/main" });
  assert.equal(edited.code, 5);
  assert.match(edited.log, /issue-005\.md: GitHub no longer has this item/);

  // The item comes back: the mark goes away.
  assert.equal(runExport(root, state).code, 0);
  assert.equal(read(root, file), before);
});

test("a month folder that lost its last entry loses its index", () => {
  const root = makeRoot();
  const state = ONE();
  assert.equal(runExport(root, state).code, 0);
  const stale = "docs/history/2026/09/README.md";
  fs.mkdirSync(path.dirname(path.join(root, stale)), { recursive: true });
  fs.writeFileSync(path.join(root, stale), "# old\n");
  assert.ok(check(root).some((problem) => problem.startsWith(`${stale}: a month index`)));
  build(root);
  assert.ok(!exists(root, stale));
  assert.deepEqual(check(root), []);
});

// ---------------------------------------------------------------------------------------------
// check

test("check finds a stale page, a broken raw file, a malformed entry and a dead link", () => {
  const make = () => {
    const root = makeRoot();
    const state = ONE();
    state.issues[0].body = "See [details](docs/example.md).\n\n```md\n[x](missing.md)\n```";
    assert.equal(runExport(root, state).code, 0);
    assert.deepEqual(check(root), []); // copied text with relative links does not fail
    return root;
  };
  const edit = (root, file, change) => fs.writeFileSync(path.join(root, file), change(read(root, file)));

  let root = make();
  edit(root, "docs/history/current-state.md", (text) => `${text}\nextra\n`);
  assert.deepEqual(check(root), ["docs/history/current-state.md: stale; run `npm run history -- build`"]);

  root = make();
  edit(root, RAW_PULL, (text) => text.replace('kind: "pull"', "kind: pull"));
  assert.ok(check(root).some((problem) => /pull-002\.md: the value of `kind` in the top block is not JSON/.test(problem)));

  root = make();
  edit(root, ENTRY, (text) => text.replace(FIELDS_MARK, ""));
  assert.ok(check(root).includes(`${ENTRY}: a marker line is missing`));

  root = make();
  edit(root, ENTRY, (text) => text.replace("## Why", "## Reason"));
  assert.ok(check(root).some((problem) => problem.startsWith(`${ENTRY}: the fields are not`)));

  root = make();
  edit(root, ENTRY, (text) => setField(text, "Left open", "See [the notes](../notes.md), [a part](ticket-001.md#why) and [the folder](../11)."));
  assert.deepEqual(check(root), [`${ENTRY}: the link to ../notes.md points to no file`]);

  root = make();
  fs.writeFileSync(path.join(root, "docs/history/2026/11/notes.txt"), "x");
  fs.writeFileSync(path.join(root, "docs/history/2026/11/ticket-044.md"), read(root, ENTRY));
  assert.deepEqual(check(root), [
    "docs/history/2026/11/notes.txt: a file name that the history folder does not use",
    "docs/history/2026/11/ticket-044.md: an entry with no merged PR in the raw copies"
  ]);
});

test("check finds a stale generated field, but not a field that was completed by hand", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  const lose = (text) => text.replace('"Problem","Change"', '"Problem"');
  fs.writeFileSync(path.join(root, RAW_PULL), lose(read(root, RAW_PULL)));
  // The gap list and the state page count the new gap, so they are stale too.
  assert.ok(check(root).includes(`${ENTRY}: stale; run \`npm run history -- build\``));
  build(root);
  assert.equal(parseEntry(read(root, ENTRY)).fields["Why"], "See `## Problem` in [PR #2](../../github/2026/11/pull-002.md).");
  assert.equal(parseEntry(read(root, ENTRY)).fields["What changed"], NOT_RECORDED);
  fs.writeFileSync(path.join(root, ENTRY), setField(read(root, ENTRY), "What changed", "The band got a part."));
  build(root); // the gap list loses the gap that was filled by hand
  assert.equal(parseEntry(read(root, ENTRY)).fields["What changed"], "The band got a part.");
  assert.deepEqual(check(root), []);
});

test("check finds two decision records with one number, and sensitive text", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  fs.mkdirSync(path.join(root, "docs/decisions"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/decisions/0001-a.md"), "# 0001. A\n\n- Status: accepted\n- Date: 2026-11-15\n");
  fs.writeFileSync(path.join(root, "docs/decisions/0001-b.md"), `# 0001. B\n\n- Status: accepted\n- Date: 2026-11-15\n\nMail ${EMAIL}.\n`);
  assert.throws(() => build(root), /have the same number 0001/); // `build` writes nothing while a number is double
  const problems = check(root);
  assert.ok(problems.includes("docs/decisions: 0001-a.md and 0001-b.md have the same number 0001"));
  assert.ok(problems.includes("docs/decisions/0001-b.md:6: email address"));
  assert.ok(!problems.join("\n").includes(EMAIL));
  assert.deepEqual(check(root, { terms: ["0001. a"] }).filter((problem) => problem.endsWith("private term")), [
    "docs/decisions/0001-a.md:1: private term"
  ]);
});

test("check --export-base accepts generated changes only", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  const base = read(root, ENTRY);
  const run = (changed, baseFiles) =>
    check(root, {
      exportBase: "origin/main",
      changedPaths: () => changed,
      gitShow: (ref, file) => baseFiles[file] ?? null
    });
  assert.deepEqual(run([ENTRY, "docs/decisions/README.md"], {}), []);
  assert.deepEqual(run(["CLAUDE.md"], {}), ["CLAUDE.md: changed, but an export changes only docs/history/ and docs/decisions/README.md"]);

  const byHand = setField(base, "Left open", "A note by hand.");
  fs.writeFileSync(path.join(root, ENTRY), byHand);
  assert.deepEqual(run([ENTRY], {}), [`${ENTRY}: the field "Left open" changed by hand`]); // a new entry
  assert.deepEqual(run([ENTRY], { [ENTRY]: base }), [`${ENTRY}: the field "Left open" changed by hand`]); // an entry the base has
  assert.deepEqual(run([ENTRY], { [ENTRY]: byHand }), []); // the base has the same hand-written text

  fs.writeFileSync(path.join(root, ENTRY), base.replace(FIELDS_MARK, `${FIELDS_MARK}\n- Backfilled: today.`));
  assert.deepEqual(run([ENTRY], { [ENTRY]: base }), [`${ENTRY}: the note lines changed by hand`]);
});

// ---------------------------------------------------------------------------------------------
// Sensitive text

test("each pattern kind is found, and the allowed forms are not", () => {
  const join = (...parts) => parts.join("");
  const cases = [
    ["private key", join("-----BEGIN RSA ", "PRIVATE KEY-----")],
    ["Anthropic key", join("sk-", "ant-", "abc123DEF456ghi789JKL0")],
    ["OpenAI key", join("sk-", "proj-", "abc123DEF456ghi789JKL0")],
    ["GitHub token", TOKEN],
    ["GitHub token", join("github_", "pat_", "11ABCDEFG0abcdefghijkl_mnop")],
    ["AWS key id", join("AK", "IA", "ABCDEFGHIJKLMNOP")],
    ["Google key", join("AI", "za", "SyA1234567890abcdefghijklmnopqrstuv")],
    ["Slack token", join("xo", "xb-", "123456789012-abcdefghij")],
    ["JWT", join("ey", "JhbGciOiJIUzI1NiJ9", ".ey", "JzdWIiOiIxMjM0NTY3ODkwIn0", ".abcdefghijklmnop")],
    ["URL with a password", join("postgres://", "admin:", "hunter2pass", "@db.internal/app")],
    ["signed URL", join("https://x.example.com/file?X-Amz-", "Signature=", "0123456789abcdef0123")],
    ["cookie", join("Set-", "Cookie: session=", "abcdef0123456789")],
    ["connection string", join("Server=x;", "Pass", "word=", "s3cretValue;")],
    ["password or key value", join("pass", "word = ", "'correct-horse-9'")],
    ["password or key value", join("api_", "key: ", "abcDEF123456xyz")],
    ["email address", EMAIL],
    ["phone number", join("+31 ", "6 1234 ", "5678")],
    ["home folder path", join("C:", "\\Users\\", "janedoe", "\\work")],
    ["home folder path", join("C:", "/Users/", "janedoe")],
    ["home folder path", join("/c/", "Users/", "janedoe", "/x")],
    ["home folder path", join("/home/", "janedoe", "/.config")],
    ["home folder path", join("/Users/", "janedoe")]
  ];
  for (const [kind, value] of cases) {
    const finds = findSensitive(`before ${value} after`);
    assert.deepEqual(finds.map((find) => find.kind), [kind], value.slice(0, 12));
    const cleaned = redact(`before ${value} after`, finds);
    assert.ok(!cleaned.includes(finds[0].value), kind);
    assert.ok(cleaned.startsWith("before ") && cleaned.includes(`[removed: ${kind}]`) && cleaned.endsWith(" after"), cleaned);
  }
  const fine = [
    "noreply@anthropic.com",
    "49699333+dependabot[bot]@users.noreply.github.com",
    "git@github.com:tmathura/claude-runway.git",
    "tests@example.com",
    "runway@tmathura-runway and actions/checkout@v7.0.1",
    "the secret: removing the text does not make it safe",
    "`password=` and `api_key=` style values",
    'const secret = path.join(outside, "secret.md");',
    "/Users/<name> and C:\\Users\\<x> and /home/runner/work",
    "https://fossil-scm.org/home/doc/trunk/www/bugtheory.wiki",
    "run 43582747667 and +1 more",
    "task-force-one-two-three-four-five"
  ];
  for (const text of fine) {
    assert.deepEqual(findSensitive(text), [], text);
  }
  assert.deepEqual(findSensitive("line one\nthe Acme project", ["acme", ""]).map((find) => [find.kind, find.line, find.value]), [["private term", 2, "Acme"]]);
});

test("scan gives exit 0, 1 and 2, and never prints the value", () => {
  const dir = makeTempDir();
  const clean = path.join(dir, "clean.md");
  const dirty = path.join(dir, "dirty.md");
  const terms = path.join(makeTempDir(), "terms.txt"); // outside the folder that the command runs in
  fs.writeFileSync(clean, "Nothing here, only Acme.\n");
  fs.writeFileSync(dirty, `one\ntoken ${TOKEN}\n`);
  fs.writeFileSync(terms, "\nacme\n\n");
  const scan = (...args) => run(process.execPath, [SCRIPT, "scan", ...args], { cwd: dir, timeout: 30_000 });

  assert.equal(scan(clean).status, 0);
  const found = scan(clean, dirty);
  assert.equal(found.status, 1);
  assert.equal(found.stdout.trim(), `${dirty}:2: GitHub token`);
  assert.ok(!found.stdout.includes(TOKEN) && !found.stderr.includes(TOKEN));
  const withTerms = scan("--terms", terms, clean);
  assert.equal(withTerms.status, 1);
  assert.equal(withTerms.stdout.trim(), `${clean}:1: private term`);
  assert.equal(scan().status, 2);
  assert.equal(scan(path.join(dir, "missing.md")).status, 2);
  assert.equal(scan("--terms", path.join(dir, "missing.txt"), clean).status, 2);
  assert.equal(scan("--finds", terms, clean).status, 2);
  fs.writeFileSync(path.join(dir, "terms.txt"), "acme\n");
  assert.equal(scan("--terms", path.join(dir, "terms.txt"), clean).status, 2); // a list inside the repo
  assert.equal(run(process.execPath, [SCRIPT, "nothing"], { cwd: dir, timeout: 30_000 }).status, 2);
});

test("a private detail is replaced and listed once; a later value in the same place is new", () => {
  const root = makeRoot();
  const out = makeTempDir();
  const finds = path.join(out, "finds.json");
  const acknowledged = path.join(out, "acknowledged.json");
  const terms = path.join(out, "terms.txt");
  fs.writeFileSync(terms, "Acme Corp\n\n");
  const state = ONE();
  state.comments = [comment(1, { id: 7, body: `Ask ${EMAIL} at Acme Corp.` })];
  const first = runExport(root, state, { finds, terms });
  assert.equal(first.code, 0);
  const text = read(root, RAW_ISSUE);
  assert.match(text, /Ask \[removed: email address\] at \[removed: private term\]\./);
  const place = `${URL}/issues/1#issuecomment-7`;
  const listed = JSON.parse(fs.readFileSync(finds, "utf8"));
  assert.deepEqual(listed, [
    { kind: "email address", group: "private", place, sha256: sha256(EMAIL) },
    { kind: "private term", group: "private", place, sha256: sha256("Acme Corp") }
  ]);
  assert.ok(![first.log, fs.readFileSync(finds, "utf8"), ...Object.values(snapshot(root))].join("\n").includes(EMAIL));
  assert.deepEqual(check(root), []);

  // The owner was told: the finds are acknowledged, and a run with the same text lists nothing.
  fs.writeFileSync(acknowledged, JSON.stringify(listed));
  fs.rmSync(finds);
  assert.equal(runExport(root, state, { finds, acknowledged, terms }).code, 0);
  assert.ok(!fs.existsSync(finds));

  // Another address in the same comment gives the same replaced text, and is still a new find.
  state.comments[0].body = `Ask ${EMAIL_2} at Acme Corp.`;
  const before = read(root, RAW_ISSUE);
  assert.equal(runExport(root, state, { finds, acknowledged, terms }).code, 0);
  assert.equal(read(root, RAW_ISSUE), before);
  assert.deepEqual(JSON.parse(fs.readFileSync(finds, "utf8")), [{ kind: "email address", group: "private", place, sha256: sha256(EMAIL_2) }]);
});

test("a public secret stops the export until that exact value is acknowledged", () => {
  const root = makeRoot();
  const out = makeTempDir();
  const finds = path.join(out, "finds.json");
  const acknowledged = path.join(out, "acknowledged.json");
  const state = ONE();
  state.pulls[0].body = `${FULL_BODY}\n\nThe token was ${TOKEN}.`;
  const stopped = runExport(root, state, { finds });
  assert.equal(stopped.code, 4);
  assert.deepEqual(tree(root), []);
  const listed = JSON.parse(fs.readFileSync(finds, "utf8"));
  assert.deepEqual(listed, [{ kind: "GitHub token", group: "secret", place: `${URL}/pull/2`, sha256: sha256(TOKEN) }]);
  assert.ok(!stopped.log.includes(TOKEN) && !fs.readFileSync(finds, "utf8").includes(TOKEN));

  fs.writeFileSync(acknowledged, JSON.stringify(listed));
  assert.equal(runExport(root, state, { finds, acknowledged }).code, 0);
  assert.match(read(root, RAW_PULL), /The token was \[removed: GitHub token\]\./);
  assert.ok(!Object.values(snapshot(root)).join("\n").includes(TOKEN));
  const done = snapshot(root);

  for (const body of [
    `${FULL_BODY}\n\nThe token was ${TOKEN_2}.`, // another token in the same place
    `${FULL_BODY}\n\nThe token was ${TOKEN}. And ${TOKEN_2}.` // a second one of the same kind
  ]) {
    state.pulls[0].body = body;
    assert.equal(runExport(root, state, { finds, acknowledged }).code, 4);
    assert.deepEqual(snapshot(root), done);
  }
  state.pulls[0].body = `${FULL_BODY}\n\nThe token was ${TOKEN}.`;
  state.comments = [comment(1, { id: 8, body: `Also ${TOKEN}.` })]; // the same token in another place
  assert.equal(runExport(root, state, { finds, acknowledged }).code, 4);
});

test("option files inside the repo, or missing, give exit 2", () => {
  const root = makeRoot();
  const out = makeTempDir();
  for (const more of [
    { finds: path.join(root, "finds.json") },
    { acknowledged: path.join(root, "acknowledged.json") },
    { terms: path.join(root, "terms.txt") },
    { acknowledged: path.join(out, "missing.json") },
    { terms: path.join(out, "missing.txt") }
  ]) {
    assert.equal(runExport(root, ONE(), more).code, 2, JSON.stringify(Object.keys(more)));
    assert.deepEqual(tree(root), []);
  }
});

test("a finds file that cannot be written gives exit 2, no history file, and the place without the value", () => {
  const root = makeRoot();
  const out = makeTempDir();
  const finds = path.join(out, "finds.json");
  const state = ONE();
  state.issues[0].body = `Mail ${EMAIL}.`;
  const result = runExport(root, state, {
    finds,
    write: () => {
      throw new Error("disk full");
    }
  });
  assert.equal(result.code, 2);
  assert.match(result.log, new RegExp(`find: email address at ${URL}/issues/1`));
  assert.ok(!result.log.includes(EMAIL));
  assert.deepEqual(tree(root), []);
  assert.equal(runExport(root, state).code, 2); // no --finds file at all
  assert.deepEqual(tree(root), []);
});

test("a write that fails part of the way gives exit 2, and a second run completes the tree", () => {
  const clean = makeRoot();
  const state = { issues: [issue(1), issue(3)], pulls: [pull(2)] };
  assert.equal(runExport(clean, state).code, 0);

  const root = makeRoot();
  let writes = 0;
  const result = runExport(root, state, {
    write: (full, text) => {
      writes += 1;
      if (writes === 3) {
        throw new Error("disk full");
      }
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text);
    }
  });
  assert.equal(result.code, 2);
  assert.match(result.log, /^cannot write docs\/history\/.+: disk full$/m);
  assert.equal(tree(root).length, 2);
  assert.equal(runExport(root, state).code, 0);
  assert.deepEqual(snapshot(root), snapshot(clean));
});

// ---------------------------------------------------------------------------------------------
// The record of this repo

test("the history record of this repo is current, and #7 and #22 can be read with no network", () => {
  assert.deepEqual(check(ROOT), []);
  for (const number of ["007", "022"]) {
    const file = `docs/history/2026/11/ticket-${number}.md`;
    const { fields } = parseEntry(read(ROOT, file).replace(/\r\n/g, "\n"));
    for (const name of ["What changed", "Why", "What was checked"]) {
      assert.ok(!fields[name].includes(NOT_RECORDED), `${file}: ${name}`);
      for (const match of fields[name].matchAll(/((?:`## [^`]+`(?: and )?)+) in \[PR #\d+\]\(([^)]+)\)/g)) {
        const raw = path.posix.join(path.posix.dirname(file), match[2]);
        const found = parseTop(read(ROOT, raw).replace(/\r\n/g, "\n")).headings;
        for (const section of match[1].matchAll(/`## ([^`]+)`/g)) {
          assert.ok(found.includes(section[1]), `${raw} has no "## ${section[1]}"`);
        }
      }
    }
  }
});
