import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { initGitRepo, makeTempDir, run } from "./helpers.mjs";
import {
  FIELDS_MARK,
  NOT_RECORDED,
  OWN_KEYS,
  REPO,
  build,
  check,
  defaultWrite,
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
      if (state.noThreads) {
        return JSON.stringify({ data: { repository: { pullRequest: null } } });
      }
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
      return paged(match[2] === "files" ? (list ?? []).map((file) => (typeof file === "string" ? { filename: file } : file)) : list ?? []);
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
    if (args[0] === "merge-base") {
      return "branch-start\n";
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
        if (state.badPackage) {
          return "not json";
        }
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
  // The message names the line by its number, and never repeats its text.
  assert.throws(
    () => parseTop(`---\nkind: "issue"\nToken ${TOKEN}\n---\n`),
    (error) => /^line 3 of the top block is not `key: value`$/.test(error.message) && !error.message.includes(TOKEN)
  );
});

test("a title with Markdown link text makes no link in the built pages", () => {
  const root = makeRoot();
  const title = "Fix [label](missing.md) rendering";
  const state = {
    // A label can hold the same text: a type label goes into an entry, each label into open.md.
    issues: [
      issue(1, { title, labels: [{ name: "bug" }, { name: "a](missing.md)" }] }),
      issue(5, { title, state: "open", closed_at: null, labels: [{ name: "a](missing.md)" }] })
    ],
    pulls: [pull(2), pull(3, { title: `Show ${title}` })]
  };
  assert.equal(runExport(root, state).code, 0);
  assert.deepEqual(check(root), []);
  assert.match(read(root, "docs/history/open.md"), /Fix \[label\]\\\(missing\.md\) rendering\]\(/);
});

test("a problem that check returns never holds sensitive text of a file", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  fs.mkdirSync(path.join(root, "docs/decisions"), { recursive: true });
  const record = "docs/decisions/0001-x.md";
  fs.writeFileSync(path.join(root, record), "# 0001. X\n\nSee [a](missing.md) and\n[b](/Users/janedoe/notes.md).\n");
  const problems = check(root).filter((problem) => problem.startsWith(`${record}: `));
  assert.ok(problems.includes(`${record}: the link to missing.md points to no file`));
  assert.ok(problems.some((problem) => /the link to .*\[removed: home folder path\].* points to no file$/.test(problem)), problems.join("\n"));
  assert.ok(!problems.join("\n").includes("janedoe"));
});

test("more read and write failures give exit 2 and leave the files as they were", () => {
  // A package.json that is no JSON, and an answer with no review threads.
  for (const [more, message] of [
    [{ badPackage: true }, /package\.json at a+ is not JSON/],
    [{ noThreads: true }, /gh gave no review threads for #2/]
  ]) {
    const root = makeRoot();
    const result = runExport(root, { ...ONE(), ...more });
    assert.equal(result.code, 2);
    assert.match(result.log, message);
    assert.deepEqual(tree(root), []);
  }

  // A kept copy on disk with a broken top block.
  const root = makeRoot();
  const state = { issues: [issue(1), issue(5)], pulls: [pull(2)] };
  assert.equal(runExport(root, state).code, 0);
  const kept = "docs/history/github/2026/11/issue-005.md";
  fs.writeFileSync(path.join(root, kept), read(root, kept).replace('kind: "issue"', "kind: issue"));
  const before = snapshot(root);
  const broken = runExport(root, { ...state, issues: [issue(1)] });
  assert.equal(broken.code, 2);
  assert.match(broken.log, /issue-005\.md: the value of `kind` in the top block is not JSON/);
  assert.deepEqual(snapshot(root), before);
  fs.rmSync(path.join(root, kept));

  // The marker file cannot be written: every pending file goes, and no old file changes.
  const whole = snapshot(root);
  const noMarker = runExport(root, { ...state, issues: [issue(1, { title: "A new title" })] }, {
    write: (full, text) => {
      if (full.endsWith(".all-pending-files-are-complete")) {
        throw new Error("disk full");
      }
      defaultWrite(full, text);
    }
  });
  assert.equal(noMarker.code, 2);
  assert.match(noMarker.log, /cannot write docs\/history\/\.all-pending-files-are-complete: disk full/);
  assert.deepEqual(snapshot(root), whole);

  // A marker that holds no list.
  fs.writeFileSync(path.join(root, "docs/history/.all-pending-files-are-complete"), "{}");
  const noList = runExport(root, state);
  assert.equal(noList.code, 2);
  assert.match(noList.log, /cannot read docs\/history\/\.all-pending-files-are-complete: it holds no list/);
});

test("a release whose tag starts with run- is a release copy, not a release run entry", () => {
  const root = makeRoot();
  assert.equal(runExport(root, { ...ONE(), releases: [release("run/1", { id: 61, body: "Notes of 61." })] }).code, 0);
  const copy = "docs/history/github/2026/11/release-run-1.md";
  assert.equal(parseTop(read(root, copy)).kind, "release");
  assert.deepEqual(check(root), []);
  // The release is deleted, and another release would take its file name: the kept copy stays.
  const clash = runExport(root, { ...ONE(), releases: [release("run-1", { id: 62 })] });
  assert.equal(clash.code, 2);
  assert.match(read(root, copy), /Notes of 61\./);
  // Deleted with no other release: the copy is kept and marked gone, once.
  assert.equal(runExport(root, ONE()).code, 0);
  assert.equal(parseTop(read(root, copy)).gone, true);
  assert.deepEqual(check(root), []);
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
    [exportPull(), [...generated, "scripts/history.mjs"], true],
    // A file that was moved into the history folder from outside it.
    [exportPull(), [...generated, { filename: "docs/history/notes.md", previous_filename: "CLAUDE.md" }], true]
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
      comment(1, { id: 3, body: "Release run v0.9.9\n\nnot on a PR" }),
      comment(2, { id: 5, body: "Release run v0.3.0\n\na version that this PR did not set" })
    ]
  };
  assert.equal(runExport(root, state).code, 0);
  assert.ok(!exists(root, "docs/history/2026/11/release-run-v0.3.0.md"));
  const runFile = "docs/history/2026/11/release-run-v0.2.0.md";
  const top = parseTop(read(root, runFile));
  assert.deepEqual([top.kind, top.version, top.pr, top.ticket, top.merge_commit], ["release-run", "v0.2.0", 2, 1, SHA("a")]);
  assert.match(read(root, runFile), /\| 1 \| pass \|/);
  assert.ok(!read(root, runFile).includes("fake"));
  assert.ok(!exists(root, "docs/history/2026/11/release-run-v0.9.9.md"));
  assert.match(read(root, ENTRY), /not released \(\[release run\]\(release-run-v0\.2\.0\.md\)\)/);
  assert.match(read(root, "docs/history/2026/11/README.md"), /\[Release run v0\.2\.0\]\(release-run-v0\.2\.0\.md\), PR #2\./);

  state.comments.push(comment(2, { id: 4, created_at: "2026-12-01T08:00:00Z", body: "Release run v0.2.0\n\n| 1 | fail |" }));
  // A newer table in a later month replaces the text. The file stays in the month of the
  // merge of its PR, so a link to it from another entry or a decision record stays good.
  assert.equal(runExport(root, state).code, 0);
  assert.match(read(root, runFile), /\| 1 \| fail \|/);
  assert.equal(parseTop(read(root, runFile)).date, "2026-12-01T08:00:00Z");
  assert.ok(!exists(root, "docs/history/2026/12/release-run-v0.2.0.md"));
  assert.match(read(root, ENTRY), /\(\[release run\]\(release-run-v0\.2\.0\.md\)\)/);
  fs.writeFileSync(path.join(root, ENTRY), setField(read(root, ENTRY), "Left open", "See [the run](release-run-v0.2.0.md)."));
  assert.deepEqual(check(root), []);

  // The table comment is deleted on GitHub: the entry file stays, marked gone, and no longer counts.
  state.comments = [];
  assert.equal(runExport(root, state).code, 0);
  assert.equal(parseTop(read(root, runFile)).gone, true);
  assert.match(read(root, ENTRY), /- State: merged with version 0\.2\.0, not released$/m);
  assert.match(read(root, "docs/history/2026/11/README.md"), /Release run v0\.2\.0\]\([^)]+\), PR #2, no longer on GitHub\./);
  assert.deepEqual(check(root), []); // the hand-written link to the run file still holds
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
  // The newest event, not GitHub's "updated" time (2026-11-09 in the open PR of this fixture).
  assert.match(current, /- Newest event in the raw copies: 2026-11-03T13:00:00Z/);
  assert.ok(!Object.values(snapshot(root)).join("\n").includes("updated_at"));
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

  // A secret in the kept copy that no earlier export found (a pattern that is new): it is
  // listed with the file as its place, the export stops, and no file changes. The secret is in
  // a value of the top block. A kept file with a broken top block that is read before it (exit
  // 2 alone) does not hide it, and the text of that broken file is checked too.
  const marked = read(root, file);
  fs.writeFileSync(path.join(root, file), marked.replace(/^title: .*$/m, `title: ${JSON.stringify(`Issue ${TOKEN}`)}`));
  const broken = "docs/history/github/2026/10/issue-004.md";
  fs.writeFileSync(path.join(root, broken), `---\nkind: "issue"\nno value\n---\nToken ${TOKEN}\n`);
  // A second broken file: one run names every file to repair.
  const second = "docs/history/github/2026/10/issue-003.md";
  fs.writeFileSync(path.join(root, second), '---\nkind: "issue"\nno value\n---\n');
  const finds = path.join(makeTempDir(), "finds.json");
  const withSecret = snapshot(root);
  const stopped = runExport(root, gone, { finds });
  assert.equal(stopped.code, 4);
  assert.ok(!stopped.log.includes(TOKEN));
  assert.ok(stopped.log.includes(`${broken}: line 3 of the top block`) && stopped.log.includes(`${second}: line 3 of the top block`));
  assert.deepEqual(
    JSON.parse(fs.readFileSync(finds, "utf8")).map((find) => [find.kind, find.place]).sort(),
    [["GitHub token", `the kept copy ${broken}`], ["GitHub token", `the kept copy ${file}`]]
  );
  assert.deepEqual(snapshot(root), withSecret);
  fs.rmSync(path.join(root, broken));
  fs.rmSync(path.join(root, second));
  fs.writeFileSync(path.join(root, file), marked);

  // The item comes back: the mark goes away.
  assert.equal(runExport(root, state).code, 0);
  assert.equal(read(root, file), before);
});

test("a find on GitHub and a find in a kept copy in one run: the second message gives the total", () => {
  const out = makeTempDir();
  const terms = path.join(out, "terms.txt");
  const finds = path.join(out, "finds.json");
  const root = makeRoot();
  const state = { issues: [issue(1), issue(5, { body: "About Acme." })], pulls: [pull(2)] };
  assert.equal(runExport(root, state).code, 0);
  fs.writeFileSync(terms, "acme\n");
  const result = runExport(root, { ...state, issues: [issue(1, { body: "Acme again." })] }, { finds, terms });
  assert.equal(result.code, 0, result.log);
  assert.match(result.log, /^1 new sensitive finds \(0 secret, 1 private\)/m);
  assert.match(result.log, /^2 new sensitive finds in all, with the kept copies \(0 secret, 2 private\)/m);
  assert.equal(JSON.parse(fs.readFileSync(finds, "utf8")).length, 2);
});

test("a month folder that lost its last entry loses its index", () => {
  const root = makeRoot();
  const state = ONE();
  assert.equal(runExport(root, state).code, 0);
  const stale = "docs/history/2026/09/README.md";
  fs.mkdirSync(path.dirname(path.join(root, stale)), { recursive: true });
  fs.writeFileSync(path.join(root, stale), "# old\n");
  assert.ok(check(root).some((problem) => problem.startsWith(`${stale}: a file that \`build\` would remove`)));
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
  fs.writeFileSync(path.join(root, "docs/history/2026/11/ticket-044.md"), read(root, ENTRY).replace("- PR: [#2]", "- PR: [#77]"));
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
    ["private key", join("-----BEGIN RSA ", "PRIVATE KEY-----\nMIIEow\n", "-----END RSA ", "PRIVATE KEY-----")],
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
  assert.match(result.log, new RegExp(`find: email address \\(private\\) at ${URL}/issues/1`));
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
  assert.deepEqual(tree(root), []); // no target file is touched before every new file is written
  assert.equal(runExport(root, state).code, 0);
  assert.deepEqual(snapshot(root), snapshot(clean));
});

// ---------------------------------------------------------------------------------------------
// Cases from the review rounds

test("a merge or a release run in a month with no new item gives an index with no dead link", () => {
  const root = makeRoot();
  const state = {
    issues: [issue(1)],
    pulls: [pull(2, { merged_at: "2026-12-01T09:00:00Z", closed_at: "2026-12-01T09:00:00Z" })],
    versions: { [SHA("a")]: "0.2.0" },
    comments: [comment(2, { id: 1, created_at: "2027-01-02T09:00:00Z", body: "Release run v0.2.0\n\n| 1 | pass |" })]
  };
  assert.equal(runExport(root, state).code, 0);
  assert.ok(exists(root, "docs/history/2026/12/ticket-001.md"));
  assert.ok(!read(root, "docs/history/2026/12/README.md").includes("raw copies of this month"));
  // The run table was posted in January; its entry is in the month of the merge.
  assert.ok(exists(root, "docs/history/2026/12/release-run-v0.2.0.md") && !exists(root, "docs/history/2027"));
  assert.ok(!exists(root, "docs/history/github/2026/12/README.md"));
  // November holds the raw copies and no merge, so it has only the raw index.
  assert.ok(exists(root, "docs/history/github/2026/11/README.md") && !exists(root, "docs/history/2026/11/README.md"));
  assert.match(read(root, "docs/history/README.md"), /- 2026-11: no merged change; \[2 raw copies\]/);
  assert.deepEqual(check(root), []);
});

test("--export-base compares with the start of the branch, and a hand-written field of the base must stay", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls[0].body = "## Problem\n\nP.";
  assert.equal(runExport(root, state).code, 0);
  const generated = read(root, ENTRY);
  const withFact = setField(generated, "Left open", "A fact with its source.");
  const seen = [];
  const problems = check(root, {
    exportBase: "branch-start",
    changedPaths: (ref) => (seen.push(ref), []),
    gitShow: (ref, file) => (seen.push(ref), file === ENTRY ? withFact : null)
  });
  assert.deepEqual(problems, [`${ENTRY}: the field "Left open" changed by hand`]); // the export removed the fact
  assert.deepEqual([...new Set(seen)], ["branch-start"]);

  // The command asks git where the branch left the ref, and compares with that commit.
  const result = runExport(root, { ...state, base: { [ENTRY]: generated } }, { exportBase: "origin/main" });
  assert.equal(result.code, 0);
  assert.ok(result.calls.includes("git merge-base origin/main HEAD"));
  assert.ok(result.calls.includes("git diff --name-only --no-renames branch-start"));
  assert.ok(!result.calls.some((call) => call.includes("--no-renames origin/main")));
  const failed = runExport(root, { ...state, fail: (tool, args) => tool === "git" && args[0] === "merge-base" }, { exportBase: "origin/main" });
  assert.equal(failed.code, 2);
});

test("a public secret gives exit 4 also when the finds file cannot be written", () => {
  for (const more of [{}, { finds: path.join(makeTempDir(), "finds.json"), write: () => { throw new Error("disk full"); } }]) {
    const root = makeRoot();
    const state = ONE();
    state.issues[0].body = `The token was ${TOKEN}.`;
    const result = runExport(root, state, more);
    assert.equal(result.code, 4);
    assert.match(result.log, new RegExp(`find: GitHub token \\(secret\\) at ${URL}/issues/1`));
    assert.ok(!result.log.includes(TOKEN));
    assert.deepEqual(tree(root), []);
  }
});

test("a private word that overlaps a secret does not hide it, and a letter that grows in lower case does not move a find", () => {
  const value = ["corp-pass", "word=", "hunter2hunter2"].join("");
  const finds = findSensitive(`see ${value} now`, ["corp-pass"]);
  assert.deepEqual(finds.map((find) => [find.kind, find.group]), [["connection string", "secret"]]);
  // The two finds become one over the whole span, so no part of the private word stays either.
  assert.equal(redact(`see ${value} now`, finds), "see [removed: connection string] now");

  // A value that holds `[` is still found as a whole.
  for (const withBracket of [["Server=x;Pass", "word=ab[c]Sup3rSecret99;"], ["Pw", "d=[Sup3r]SecretValue"], ["Coo", "kie: sid=ab[cdefghijklmnop"]]) {
    const line = withBracket.join("");
    const found = findSensitive(line);
    assert.equal(found.length, 1, line);
    assert.ok(!redact(line, found).includes("Sup3r") && !redact(line, found).includes("cdefgh"), line);
  }
  // Text that an earlier pass replaced is not read as the value of a secret.
  for (const cleaned of ["Pwd=[removed: phone number]", "Pwd=x[removed: private term]", "password=[removed: private term]", "Cookie: id=[removed: private term]"]) {
    assert.deepEqual(findSensitive(cleaned), [], cleaned);
  }

  const text = "İİİ then Acme here";
  assert.equal(redact(text, findSensitive(text, ["acme"])), "İİİ then [removed: private term] here");
});

test("a pending review is left out, and a PR that merged into another branch needs no local commit", () => {
  const root = makeRoot();
  const review = (state, body) => ({ user: { login: "tmathura" }, state, submitted_at: state === "PENDING" ? null : "2026-11-03T09:30:00Z", commit_id: SHA("b"), html_url: `${URL}/pull/2#r`, body });
  const state = {
    ...ONE(),
    reviews: { 2: [review("PENDING", "An unsent draft."), review("COMMENTED", "A sent review.")] }
  };
  state.pulls.push(pull(4, { ticket: 3, base: { ref: "feature/1-change" }, merge_commit_sha: SHA("d") }));
  const result = runExport(root, state);
  assert.equal(result.code, 0);
  assert.ok(read(root, RAW_PULL).includes("A sent review.") && !read(root, RAW_PULL).includes("An unsent draft."));
  assert.ok(!result.calls.some((call) => call.includes(SHA("d"))));
  assert.equal(parseTop(read(root, "docs/history/github/2026/11/pull-004.md")).version_set, null);
  // It has a raw copy and no entry, because its change is not on `main`.
  assert.deepEqual(tree(root).filter((file) => /\/(ticket|pr)-\d+\.md$/.test(file)), [ENTRY]);
  assert.ok(!read(root, "docs/history/current-state.md").includes("#3 "));
  assert.deepEqual(check(root), []);
});

test("a ticket whose first PR merged into a feature branch gets its entry from the PR into main", () => {
  const root = makeRoot();
  const state = {
    issues: [issue(1)],
    pulls: [
      pull(2, { base: { ref: "feature/9-big" }, merge_commit_sha: SHA("d") }),
      pull(5, { ticket: 1, merged_at: "2026-11-06T10:00:00Z", merge_commit_sha: SHA("e") })
    ]
  };
  assert.equal(runExport(root, state).code, 0);
  assert.match(read(root, ENTRY), /- PR: \[#5\]/);
  assert.match(read(root, ENTRY), new RegExp(`- Commit on \`main\`: \`${SHA("e")}\``));
  assert.ok(!exists(root, "docs/history/2026/11/pr-002.md") && !exists(root, "docs/history/2026/11/pr-005.md"));
});

test("a pending inline comment is left out, and a thread with nothing else too", () => {
  const root = makeRoot();
  const node = (body, state) => ({ author: { login: "tmathura" }, createdAt: "2026-11-03T09:00:00Z", url: `${URL}/pull/2#d`, body, state });
  const comments = (...nodes) => ({ pageInfo: { hasNextPage: false }, nodes });
  const state = {
    ...ONE(),
    threads: {
      2: [
        thread({ path: "sent.ts", comments: comments(node("A sent comment.", "SUBMITTED"), node("An unsent reply.", "PENDING")) }),
        thread({ path: "draft.ts", comments: comments(node("An unsent first comment.", "PENDING")) })
      ]
    }
  };
  assert.equal(runExport(root, state).code, 0);
  const text = read(root, RAW_PULL);
  assert.ok(text.includes("A sent comment.") && !text.includes("unsent") && !text.includes("draft.ts"));
});

test("a private key is replaced as a whole, and another key in the same place is a new find", () => {
  const key = (body) => ["-----BEGIN OPENSSH ", "PRIVATE KEY-----\n", body, "\n-----END OPENSSH ", "PRIVATE KEY-----"].join("");
  const one = key("AAAAB3NzaC1yc2EAAAADAQABAAABAQ\nC7vbqajDhA");
  const text = `before\n${one}\nafter`;
  assert.equal(redact(text, findSensitive(text)), "before\n[removed: private key]\nafter");
  // No end line: everything from the first line to the end of the text goes. A key line can
  // be indented, quoted or cut, so no text after the first line is safe to keep.
  for (const body of ["AAAAB3NzaC1yc2EA".repeat(4), "    AAAAB3NzaC1yc2EAAAADAQ", "> AAAAB3Nza\n> C7vbqajDhA", "Proc-Type: 4,ENCRYPTED\n\nAAAAB3"]) {
    const open = `x ${one.split("\n")[0]}\n${body}\n\nMore text follows.`;
    assert.equal(redact(open, findSensitive(open)), "x [removed: private key]", body);
  }
  // A value that only stands next to a marker is still a secret.
  const next = ["Pw", "d=Sup3rSecretValue", "[removed:x"].join("");
  assert.deepEqual(findSensitive(next).map((find) => find.kind), ["connection string"]);

  const root = makeRoot();
  const out = makeTempDir();
  const finds = path.join(out, "finds.json");
  const acknowledged = path.join(out, "acknowledged.json");
  const state = ONE();
  state.issues[0].body = text;
  assert.equal(runExport(root, state, { finds }).code, 4);
  fs.copyFileSync(finds, acknowledged);
  assert.equal(runExport(root, state, { finds, acknowledged }).code, 0);
  assert.ok(!read(root, RAW_ISSUE).includes("AAAAB3"));
  state.issues[0].body = `before\n${key("BBBBB3NzaC1yc2EAAAADAQABAAABAQ")}\nafter`;
  assert.equal(runExport(root, state, { finds, acknowledged }).code, 4);
});

test("a release that GitHub no longer has is not a release, and a run table counts only for its own PR", () => {
  const root = makeRoot();
  const state = { ...ONE(), versions: { [SHA("a")]: "0.2.0" }, releases: [release("v0.2.0")], tags: { "v0.2.0": SHA("a") } };
  state.pulls.push(pull(8, { ticket: 7, merge_commit_sha: SHA("e"), merged_at: "2026-11-04T10:00:00Z" }));
  state.comments = [comment(8, { id: 1, body: "Release run v0.2.0\n\n| 1 | pass |" })]; // on another PR
  assert.equal(runExport(root, state).code, 0);
  assert.match(read(root, ENTRY), /- State: released as v0\.2\.0 \(\[release\]\([^)]+\), no release run table on the PR\)/);
  assert.equal(runExport(root, { ...state, releases: [] }).code, 0);
  assert.match(read(root, ENTRY), /- State: merged with version 0\.2\.0, not released$/m);
  assert.match(read(root, "docs/history/current-state.md"), /- Last release: none/);
  assert.deepEqual(check(root), []);
});

test("sensitive text in a label, a branch name or a thread path is found too", () => {
  const out = makeTempDir();
  const finds = path.join(out, "finds.json");
  const terms = path.join(out, "terms.txt");
  fs.writeFileSync(terms, "acme\n");
  const root = makeRoot();
  const state = ONE();
  state.issues[0].labels = [{ name: "customer-acme" }];
  state.pulls[0].head = { ref: "feature/1-acme-fix" };
  state.threads = { 2: [thread({ path: "src/acme/a.ts" })] };
  assert.equal(runExport(root, state, { finds, terms }).code, 0);
  assert.ok(!Object.values(snapshot(root)).join("\n").toLowerCase().includes("acme"));
  assert.deepEqual(parseTop(read(root, RAW_ISSUE)).labels, ["customer-[removed: private term]"]);
  assert.deepEqual(JSON.parse(fs.readFileSync(finds, "utf8")).map((find) => find.place).sort(), [`${URL}/issues/1`, `${URL}/pull/2`, `${URL}/pull/2#discussion_r1`]);
  assert.deepEqual(check(root, { terms: ["acme"] }), []);

  // A private word in a release tag: the tag names the release, its file and its URL, so it
  // cannot be replaced. The export stops and writes nothing; the message does not hold the tag.
  const third = makeRoot();
  const refused = runExport(third, { ...ONE(), releases: [release("v1.0-acme")] }, { finds, terms });
  assert.equal(refused.code, 2);
  assert.match(refused.log, /a release tag holds sensitive text: .*the release that was created at 2026-11-03T13:00:00Z/);
  assert.ok(!refused.log.toLowerCase().includes("acme"));
  assert.ok(!refused.calls.some((call) => call.toLowerCase().includes("acme"))); // the tag is not looked up
  // A tag with a character that has a meaning in a URL is encoded in the lookup, and a
  // release with no tag does not stop the export with a crash.
  const odd = runExport(makeRoot(), { ...ONE(), releases: [release("v1#rc", { id: 41 }), release("v2", { id: 42, tag_name: null, draft: true })] });
  assert.ok(odd.calls.some((call) => call.endsWith("git/ref/tags/v1%23rc")));
  assert.equal(odd.code, 2);
  // With a public secret in the same export, the secret wins over the release with no tag.
  const tagless = { ...ONE(), releases: [release("v2", { id: 42, tag_name: null, draft: true })] };
  tagless.issues[0].body = `The token was ${TOKEN}.`;
  assert.equal(runExport(makeRoot(), tagless, { finds: path.join(makeTempDir(), "finds.json") }).code, 4);
  assert.match(odd.log, /release 42 has no tag/);
  assert.ok(!fs.readFileSync(finds, "utf8").toLowerCase().includes("acme")); // the place does not hold the tag
  assert.deepEqual(tree(third), []);
  // A release that targets a branch whose name holds the word: that value is replaced.
  assert.equal(runExport(third, { ...ONE(), releases: [release("v1.1", { target_commitish: "feature/acme-work", draft: true })] }, { finds, terms }).code, 0);
  assert.ok(!Object.values(snapshot(third)).join("\n").toLowerCase().includes("acme"));

  // Two tags that differ only in the case of letters are one file on Windows.
  const fifth = makeRoot();
  assert.equal(runExport(fifth, { ...ONE(), releases: [release("v1.0-RC1"), release("v1.0-rc1")] }).code, 2);
  assert.deepEqual(tree(fifth), []);

  // A Windows home path in a label: found before it is written as JSON with doubled backslashes.
  const sixth = makeRoot();
  const home = ["C:", "Users", "janedoe", "x"].join("\\");
  const labelled = ONE();
  labelled.issues[0].labels = [{ name: home }];
  assert.equal(runExport(sixth, labelled, { finds, terms }).code, 0);
  assert.ok(!Object.values(snapshot(sixth)).join("\n").includes("janedoe"));

  const second = makeRoot();
  state.issues[0].labels = [{ name: TOKEN }];
  assert.equal(runExport(second, state, { finds, terms }).code, 4);
  assert.deepEqual(tree(second), []);
});

test("a second merged PR of one ticket gets its own entry under its own number and title", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls.push(pull(6, { ticket: 1, title: "[#1] Fix the first change", merged_at: "2026-11-05T10:00:00Z", merge_commit_sha: SHA("c") }));
  assert.equal(runExport(root, state).code, 0);
  assert.match(read(root, ENTRY), /^# #1 Issue 1\n/);
  const second = read(root, "docs/history/2026/11/pr-006.md");
  assert.match(second, /^# PR #6 \[#1\] Fix the first change\n/);
  assert.match(second, /- Issue: \[#1\]\(/);
  assert.deepEqual(check(root), []);

  // The same ticket number written with a zero in front is still the same ticket.
  const padded = makeRoot();
  const twice = ONE();
  twice.pulls.push(pull(6, { ticket: 1, title: "[#01] Fix the first change", merged_at: "2026-11-05T10:00:00Z", merge_commit_sha: SHA("c") }));
  assert.equal(runExport(padded, twice).code, 0);
  assert.match(read(padded, ENTRY), /- PR: \[#2\]/);
  assert.ok(exists(padded, "docs/history/2026/11/pr-006.md"));
  assert.deepEqual(check(padded), []);
});

test("--export-base finds a history file that was deleted, unless its item moved", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  const before = read(root, RAW_ISSUE);
  const run = (changed) => check(root, { exportBase: "branch-start", changedPaths: () => changed, gitShow: (ref, file) => (file === RAW_ISSUE ? before : null) });
  const message = `${RAW_ISSUE}: deleted, but an export deletes only the old path of an item that moved`;
  fs.rmSync(path.join(root, RAW_ISSUE));
  assert.ok(run([RAW_ISSUE]).includes(message));
  // The same item at another path: the old path may go.
  const moved = "docs/history/github/2026/10/issue-001.md";
  fs.mkdirSync(path.dirname(path.join(root, moved)), { recursive: true });
  fs.writeFileSync(path.join(root, moved), before);
  assert.ok(!run([RAW_ISSUE, moved]).includes(message));
});

test("a write that stops half-way leaves the old entry whole, and a second run completes the work", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls[0].body = "## Problem\n\nP.";
  assert.equal(runExport(root, state).code, 0);
  const withFact = setField(read(root, ENTRY), "Left open", "A fact that no export can make again.");
  fs.writeFileSync(path.join(root, ENTRY), withFact);

  // The header changes (a release), so the entry is written again; that write is cut short.
  const next = { ...state, versions: { [SHA("a")]: "0.2.0" } };
  const cut = (file, text) => {
    fs.writeFileSync(file, text.slice(0, 20));
    throw new Error("disk full");
  };
  const result = runExport(root, next, {
    write: (full, text) => defaultWrite(full, text, full.includes("ticket-001.md") ? cut : fs.writeFileSync)
  });
  assert.equal(result.code, 2);
  assert.equal(read(root, ENTRY), withFact);
  assert.ok(!tree(root).some((file) => /.(partial|pending)$/.test(file)));

  assert.equal(runExport(root, next).code, 0);
  assert.equal(parseEntry(read(root, ENTRY)).fields["Left open"], "A fact that no export can make again.");
  assert.match(read(root, ENTRY), /- State: merged with version 0\.2\.0, not released/);
  assert.deepEqual(check(root), []);
});

test("a long token is found as a secret before long encoded text is left out", () => {
  const root = makeRoot();
  const state = ONE();
  const jwt = ["ey", "JhbGciOiJIUzI1NiJ9", ".ey", "Jz".repeat(600), ".abcdefghijklmnop"].join("");
  state.issues[0].body = `The token: ${jwt}`;
  const result = runExport(root, state, { finds: path.join(makeTempDir(), "finds.json") });
  assert.equal(result.code, 4);
  assert.deepEqual(tree(root), []);
});

test("an entry moves with its hand-written text when the title of its PR is edited after the merge", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls[0].body = "## Problem\n\nP.";
  assert.equal(runExport(root, state).code, 0);
  const base = setField(read(root, ENTRY), "Left open", "A fact with its source.");
  fs.writeFileSync(path.join(root, ENTRY), base);

  state.pulls[0].title = "Change 1, with no ticket number";
  const moved = "docs/history/2026/11/pr-002.md";
  const result = runExport(root, { ...state, base: { [ENTRY]: base }, changed: [ENTRY, moved] }, { exportBase: "origin/main" });
  assert.equal(result.code, 0, result.log);
  assert.ok(!exists(root, ENTRY));
  assert.equal(parseEntry(read(root, moved)).fields["Left open"], "A fact with its source.");
  assert.match(read(root, moved), /^# PR #2 Change 1, with no ticket number\n/);
  assert.deepEqual(check(root), []);
});

test("a move to a free path that stops at the rename is finished by the next run, and the old path goes", () => {
  const root = makeRoot();
  const state = ONE();
  assert.equal(runExport(root, state).code, 0);
  fs.writeFileSync(path.join(root, ENTRY), setField(read(root, ENTRY), "Left open", "A fact of PR 2."));
  state.pulls[0].title = "[#7] Change for another ticket";
  const target = "docs/history/2026/11/ticket-007.md";
  const stopped = runExport(root, state, {
    rename: (from, to) => {
      if (to.endsWith("ticket-007.md")) {
        throw new Error("the file is locked");
      }
      fs.renameSync(from, to);
    }
  });
  assert.equal(stopped.code, 2);
  assert.ok(exists(root, ENTRY) && exists(root, `${target}.pending`));
  assert.equal(runExport(root, state).code, 0);
  assert.equal(parseEntry(read(root, target)).fields["Left open"], "A fact of PR 2.");
  assert.ok(!exists(root, ENTRY));
  assert.deepEqual(check(root), []);
});

test("a private word that is added to the list later is also replaced in a kept copy", () => {
  const out = makeTempDir();
  const terms = path.join(out, "terms.txt");
  const finds = path.join(out, "finds.json");
  const root = makeRoot();
  const state = { issues: [issue(1), issue(5, { body: "About Acme." })], pulls: [pull(2)] };
  assert.equal(runExport(root, state).code, 0);
  const kept = "docs/history/github/2026/11/issue-005.md";
  const before = read(root, kept);

  // Issue 5 is gone from GitHub, and the word is now on the list. The export runs two times,
  // as the export PR steps do: first plain, then with the proof against the base.
  fs.writeFileSync(terms, "acme\n");
  const next = { ...state, issues: [issue(1)], base: { [kept]: before, [ENTRY]: read(root, ENTRY) }, changed: [kept] };
  assert.equal(runExport(root, next, { finds, terms }).code, 0);
  // The find in the kept copy is listed, with the file as its place.
  assert.deepEqual(
    JSON.parse(fs.readFileSync(finds, "utf8")).map((find) => [find.kind, find.place]),
    [["private term", `the kept copy ${kept}`]]
  );
  const result = runExport(root, next, { finds, terms, exportBase: "origin/main" });
  assert.equal(result.code, 0, result.log);
  assert.match(read(root, kept), /About \[removed: private term\]\./);
  assert.equal(parseTop(read(root, kept)).gone, true);
  assert.ok(!Object.values(snapshot(root)).join("\n").toLowerCase().includes("acme"));
  assert.deepEqual(check(root, { terms: ["acme"] }), []);

  // A listed word that is also a key name of the top block: the block stays whole, and the
  // word goes only from the text.
  fs.writeFileSync(terms, "number\nstate\n");
  assert.equal(runExport(root, { ...next, issues: [issue(1, { body: "## Problem\n\nText." })], pulls: [pull(2, { body: "No number here." })] }, { finds, terms }).code, 0);
  const top = parseTop(read(root, kept));
  assert.deepEqual([top.kind, top.number, top.state, top.gone], ["issue", 5, "closed", true]);
  assert.deepEqual(check(root), []);
  assert.deepEqual(check(root, { terms: ["number"] }), []); // a key name is no find

  // A listed word that equals a number or a flag of the top block is no find either, but a
  // secret that a pattern finds by its name is still found in a block between two `---` lines.
  const inCopies = (words) => check(root, { terms: words }).filter((problem) => problem.includes("/github/") && !problem.includes("README"));
  assert.deepEqual(inCopies(["true"]), []); // `gone: true` is a flag
  assert.ok(inCopies(["closed"]).some((problem) => problem.startsWith(`${kept}:`))); // `state: "closed"` is text
  fs.mkdirSync(path.join(root, "docs/decisions"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/decisions/0001-x.md"), ["---", ["pass", "word: Hunter2abc123xyz"].join(""), "---", "# 0001. X", ""].join("\n"));
  assert.ok(check(root).includes("docs/decisions/0001-x.md:2: password or key value"));
  // A block that a person wrote is scanned as one text: a key name, a number, and a value on
  // the next line can all hold a find.
  fs.writeFileSync(
    path.join(root, "docs/decisions/0001-x.md"),
    ["---", "acme: true", "customer: 12345", ["api_", "key:"].join(""), ["  sk_live_", "abc123def456"].join(""), "---", "# 0001. X", ""].join("\n")
  );
  assert.deepEqual(
    check(root, { terms: ["acme", "12345"] }).filter((problem) => problem.startsWith("docs/decisions/0001-x.md")),
    ["docs/decisions/0001-x.md:2: private term", "docs/decisions/0001-x.md:3: private term", "docs/decisions/0001-x.md:4: password or key value"]
  );
  fs.rmSync(path.join(root, "docs/decisions/0001-x.md"));
  build(root);
  // A block that this script wrote is read as the export wrote it: each value decoded and on
  // its own, with one find for one place.
  const home = ["C:", "Users", "janedoe", "notes.txt"].join("\\");
  const own = "docs/history/github/2026/11/issue-077.md";
  fs.writeFileSync(
    path.join(root, own),
    renderTop({ kind: "issue", number: 77, title: `a\nb see ${home}`, labels: ["good first", "issue"], author: "acme" }) + "\nText with Acme.\n"
  );
  assert.deepEqual(
    check(root, { terms: ["acme", "first issue", "kind", "77"] }).filter((problem) => problem.startsWith(`${own}:`)),
    [`${own}:4: home folder path`, `${own}:6: private term`, `${own}:9: private term`]
  );
  fs.rmSync(path.join(root, own));
  build(root);

  // A kept copy that was cut right after its top block, with no line break: one top block stays.
  const cut = read(root, kept).split("\n---\n")[0] + "\n---";
  fs.writeFileSync(path.join(root, kept), cut);
  assert.equal(runExport(root, next, { finds, terms }).code, 0);
  assert.equal(read(root, kept).match(/^kind: /gm).length, 1);
  assert.equal(parseTop(read(root, kept)).number, 5);
  assert.equal(runExport(root, next, { finds }).code, 0); // and a run with no list still works
});

test("a release tag that changes only in letter case leaves one copy, and a kept release with a listed word in its tag stops the export", () => {
  const root = makeRoot();
  const state = { ...ONE(), releases: [release("v1.0-RC1", { id: 7 })] };
  assert.equal(runExport(root, state).code, 0);
  assert.equal(runExport(root, { ...state, releases: [release("v1.0-rc1", { id: 7 })] }).code, 0);
  // One file on every kind of disk: the new copy, under one spelling.
  const copies = tree(root).filter((file) => /release-v1\.0-rc1\.md$/i.test(file));
  assert.equal(copies.length, 1);
  assert.equal(parseTop(read(root, copies[0])).tag, "v1.0-rc1");
  assert.deepEqual(check(root), []);

  // A release is deleted on GitHub, and another tag that gives the same file name comes: the
  // kept copy is not replaced.
  const clash = makeRoot();
  assert.equal(runExport(clash, { ...ONE(), releases: [release("v1/rc1", { id: 1, body: "The old notes." })] }).code, 0);
  const copy = "docs/history/github/2026/11/release-v1-rc1.md";
  const oldCopy = read(clash, copy);
  const clashed = runExport(clash, { ...ONE(), releases: [release("v1-rc1", { id: 2 })] });
  assert.equal(clashed.code, 2);
  assert.match(clashed.log, /release-v1-rc1\.md holds the copy of another release with the same file name/);
  assert.equal(read(clash, copy), oldCopy);
  // The same release under a renamed tag (the same number): its copy is updated.
  assert.equal(runExport(clash, { ...ONE(), releases: [release("v1-rc1", { id: 1, body: "The old notes." })] }).code, 0);
  assert.equal(parseTop(read(clash, copy)).tag, "v1-rc1");
  // Another release whose tag differs only in letter case from a kept copy: it stops too.
  const cased = makeRoot();
  assert.equal(runExport(cased, { ...ONE(), releases: [release("V1", { id: 3 })] }).code, 0);
  assert.equal(runExport(cased, { ...ONE(), releases: [release("v1", { id: 4 })] }).code, 2);
  assert.equal(parseTop(read(cased, "docs/history/github/2026/11/release-v1.md")).tag, "V1");

  // A public secret and two releases with one file name in the same export: the secret wins.
  const both = makeRoot();
  const withSecret = { ...ONE(), releases: [release("v1/rc1", { id: 5 }), release("v1-rc1", { id: 6 })] };
  withSecret.issues[0].body = `The token was ${TOKEN}.`;
  const bothFinds = path.join(makeTempDir(), "finds.json");
  assert.equal(runExport(both, withSecret, { finds: bothFinds }).code, 4);
  assert.equal(JSON.parse(fs.readFileSync(bothFinds, "utf8"))[0].kind, "GitHub token");
  assert.deepEqual(tree(both), []);

  // A secret in the notes of a release whose tag is refused, and in a release that comes
  // after two releases with one file name: found in both cases.
  const termsFile = path.join(makeTempDir(), "terms.txt");
  fs.writeFileSync(termsFile, "acme\n");
  for (const releases of [
    [release("v1.0-acme", { id: 8, body: `Token ${TOKEN}` })],
    [release("v1/rc1", { id: 5 }), release("v1-rc1", { id: 6 }), release("v2", { id: 9, body: `Token ${TOKEN}` })]
  ]) {
    const hidden = makeRoot();
    const hiddenFinds = path.join(makeTempDir(), "finds.json");
    assert.equal(runExport(hidden, { ...ONE(), releases }, { finds: hiddenFinds, terms: termsFile }).code, 4);
    assert.ok(JSON.parse(fs.readFileSync(hiddenFinds, "utf8")).some((find) => find.kind === "GitHub token"));
  }

  // A tag that is a token: it is not looked up, no message holds it, and the export ends with exit 4.
  const tokenTag = makeRoot();
  const tagFinds = path.join(makeTempDir(), "finds.json");
  const asTag = runExport(
    tokenTag,
    { ...ONE(), releases: [release(TOKEN, { id: 31 })], fail: (tool, args) => tool === "gh" && args.at(-1).includes("git/ref/tags") },
    { finds: tagFinds }
  );
  assert.equal(asTag.code, 4);
  assert.ok(!asTag.calls.some((call) => call.includes(TOKEN)));
  assert.ok(!asTag.log.includes(TOKEN) && !fs.readFileSync(tagFinds, "utf8").includes(TOKEN));
  // A failed lookup of a plain tag names the release by its number, and its error text is cleaned.
  const failing = fakes({ ...ONE(), releases: [release("v9", { id: 32 })] });
  const lines = [];
  const code = exportHistory({
    root: tokenTag,
    git: failing.git,
    gh: (args) => {
      if (args.at(-1).includes("git/ref/tags")) {
        throw Object.assign(new Error("failed"), { stderr: `gh: HTTP 500 for a request with ${TOKEN}` });
      }
      return failing.gh(args);
    },
    log: (line) => lines.push(line)
  });
  assert.equal(code, 2);
  assert.match(lines.join("\n"), /gh failed \(the tag of release 32\): gh: HTTP 500 for a request with \[removed: GitHub token\]/);

  // A tag rename that changes the file name: the copy moves, by GitHub's number of the release.
  const renamed = makeRoot();
  assert.equal(runExport(renamed, { ...ONE(), releases: [release("v1.0-rc1", { id: 11 })] }).code, 0);
  assert.equal(runExport(renamed, { ...ONE(), releases: [release("v1.0.0", { id: 11 })] }).code, 0);
  assert.deepEqual(tree(renamed).filter((file) => /\/release-/.test(file)), ["docs/history/github/2026/11/release-v1.0.0.md"]);
  // The proof for an export PR: a release copy of the base that another release replaced at
  // the same path is reported.
  const replaced = makeRoot();
  assert.equal(runExport(replaced, { ...ONE(), releases: [release("v1", { id: 51 })] }).code, 0);
  const copyOf51 = read(replaced, "docs/history/github/2026/11/release-v1.md");
  fs.rmSync(path.join(replaced, "docs/history/github/2026/11/release-v1.md"));
  assert.equal(runExport(replaced, { ...ONE(), releases: [release("v1", { id: 52 })] }).code, 0);
  const proof = check(replaced, {
    exportBase: "branch-start",
    changedPaths: () => ["docs/history/github/2026/11/release-v1.md"],
    gitShow: (ref, file) => (file.endsWith("release-v1.md") ? copyOf51 : null)
  });
  assert.ok(proof.includes("docs/history/github/2026/11/release-v1.md: the copy of the item in branch-start is gone, and its file holds another item"));

  // A tag is renamed and a new release takes its old name; and two releases swap their tags.
  const reused = makeRoot();
  assert.equal(runExport(reused, { ...ONE(), releases: [release("v1", { id: 21, body: "Notes of 21." })] }).code, 0);
  assert.equal(runExport(reused, { ...ONE(), releases: [release("v1-old", { id: 21, body: "Notes of 21." }), release("v1", { id: 22, body: "Notes of 22." })] }).code, 0);
  assert.match(read(reused, "docs/history/github/2026/11/release-v1-old.md"), /Notes of 21\./);
  assert.match(read(reused, "docs/history/github/2026/11/release-v1.md"), /Notes of 22\./);
  assert.equal(runExport(reused, { ...ONE(), releases: [release("v1", { id: 21, body: "Notes of 21." }), release("v1-old", { id: 22, body: "Notes of 22." })] }).code, 0);
  assert.match(read(reused, "docs/history/github/2026/11/release-v1.md"), /Notes of 21\./);
  assert.match(read(reused, "docs/history/github/2026/11/release-v1-old.md"), /Notes of 22\./);
  assert.deepEqual(check(reused), []);

  // A release is deleted, and another release with the same tag comes in a later month: the
  // kept copy stays.
  assert.equal(runExport(renamed, { ...ONE(), releases: [release("v1.0.0", { id: 12, created_at: "2026-12-05T10:00:00Z" })] }).code, 0);
  assert.equal(parseTop(read(renamed, "docs/history/github/2026/11/release-v1.0.0.md")).gone, true);
  assert.ok(exists(renamed, "docs/history/github/2026/12/release-v1.0.0.md"));
  assert.deepEqual(check(renamed), []);

  // A marker that names a path outside the history folder deletes nothing there.
  fs.writeFileSync(path.join(cased, "outside.txt"), "keep");
  fs.writeFileSync(path.join(cased, "docs/history/.all-pending-files-are-complete"), JSON.stringify(["docs/history/..\\..\\outside.txt", "docs/history/../../outside.txt"]));
  assert.equal(runExport(cased, { ...ONE(), releases: [release("V1", { id: 3 })] }).code, 0);
  assert.ok(exists(cased, "outside.txt"));
  fs.rmSync(path.join(cased, "outside.txt"));

  // The release is deleted on GitHub, and its tag holds a word that is on the list now.
  const out = makeTempDir();
  const terms = path.join(out, "terms.txt");
  fs.writeFileSync(terms, "acme\n");
  const other = makeRoot();
  assert.equal(runExport(other, { ...ONE(), releases: [release("v1.0-acme")] }).code, 0);
  const before = snapshot(other);
  const result = runExport(other, ONE(), { terms, finds: path.join(out, "finds.json") });
  assert.equal(result.code, 2);
  assert.match(result.log, /a release tag holds sensitive text: the kept copy of a release that GitHub no longer has, created at/);
  assert.ok(!result.log.toLowerCase().includes("acme"));
  assert.deepEqual(snapshot(other), before);

  // A secret in the notes of that kept release is still found: exit 4 wins over the refused
  // tag, and the place of the find does not give the tag.
  const keptRelease = "docs/history/github/2026/11/release-v1.0-acme.md";
  const keptText = read(other, keptRelease);
  // The same for a secret that is only in the tag value.
  for (const text of [`${keptText}Token ${TOKEN}\n`, keptText.replace(/^tag: .*$/m, `tag: ${JSON.stringify(TOKEN)}`)]) {
    fs.writeFileSync(path.join(other, keptRelease), text);
    const secretFinds = path.join(makeTempDir(), "finds.json");
    assert.equal(runExport(other, ONE(), { terms, finds: secretFinds }).code, 4);
    const listed = fs.readFileSync(secretFinds, "utf8");
    assert.ok(JSON.parse(listed).some((find) => find.kind === "GitHub token"));
    assert.ok(!listed.toLowerCase().includes("acme"));
  }
  // A copy with a broken top block: the secret in it is found, and the place and the log name
  // the file by its path, which is public in the repo, with no other text of the file.
  fs.writeFileSync(path.join(other, keptRelease), keptText.replace(/^tag: .*$/m, "Acme Corp").concat(`Token ${TOKEN}\n`));
  const brokenFinds = path.join(makeTempDir(), "finds.json");
  const brokenRun = runExport(other, ONE(), { terms, finds: brokenFinds });
  assert.equal(brokenRun.code, 4);
  assert.ok(JSON.parse(fs.readFileSync(brokenFinds, "utf8")).some((find) => find.kind === "GitHub token" && find.place === `the kept copy ${keptRelease}`));
  assert.ok(brokenRun.log.includes(`${keptRelease}: line `));
  assert.ok(!brokenRun.log.includes("Acme Corp") && !brokenRun.log.includes(TOKEN));
});

test("a bracket placeholder is no secret, and two files for one PR at other paths are an error", () => {
  for (const text of ["Server=x;Password=[your-password];", "Pwd=[PASSWORD]", "AccountKey=[key](http://x.example.com)", "Cookie: sid=[session-id]"]) {
    assert.deepEqual(findSensitive(text), [], text);
  }
  // A real value that only ends with a bracket, or that stands in brackets itself, is a find.
  for (const parts of [["Account", "Key=abcdEFGH1234abcd==[1]"], ["Coo", "kie: sid=abcd1234==[link](http://x.example.com)"], ["Pw", "d=[S3cretValue]"]]) {
    assert.equal(findSensitive(parts.join("")).length, 1, parts.join(""));
  }

  // A marker file that cannot be read: nothing is deleted on a guess.
  const damaged = makeRoot();
  assert.equal(runExport(damaged, ONE()).code, 0);
  fs.writeFileSync(path.join(damaged, "docs/history/.all-pending-files-are-complete"), "[\"docs/hist");
  const unread = runExport(damaged, ONE());
  assert.equal(unread.code, 2);
  assert.match(unread.log, /cannot read docs\/history\/\.all-pending-files-are-complete/);
  assert.ok(exists(damaged, ENTRY));
  fs.rmSync(path.join(damaged, "docs/history/.all-pending-files-are-complete"));

  // A kept release copy with no tag line gives a clear message.
  assert.equal(runExport(damaged, { ...ONE(), releases: [release("v1.0")] }).code, 0);
  const noTagFile = "docs/history/github/2026/11/release-v1.0.md";
  fs.writeFileSync(path.join(damaged, noTagFile), read(damaged, noTagFile).replace(/^tag: .*\n/m, ""));
  const noTag = runExport(damaged, ONE());
  assert.equal(noTag.code, 2);
  assert.match(noTag.log, /release-v1\.0\.md: the top block of a release has no `tag`/);

  const root = makeRoot();
  const state = ONE();
  assert.equal(runExport(root, state).code, 0);
  const copy = "docs/history/2026/11/ticket-044.md";
  fs.writeFileSync(path.join(root, copy), setField(read(root, ENTRY), "Left open", "Another text."));
  state.pulls[0].title = "[#7] Change for another ticket";
  const result = runExport(root, state);
  assert.equal(result.code, 2);
  assert.match(result.log, new RegExp(`${ENTRY} and ${copy}: both are an entry of PR #2; keep one and delete the other`));
  assert.ok(exists(root, ENTRY) && exists(root, copy));

  // A file at the target path that names a PR with no entry in this build is not replaced.
  const other = makeRoot();
  const one = ONE();
  assert.equal(runExport(other, one).code, 0);
  const stray = setField(read(other, ENTRY), "Left open", "Text of a PR that is not merged.").replace("- PR: [#2]", "- PR: [#77]");
  fs.writeFileSync(path.join(other, ENTRY), stray);
  const refused = runExport(other, one);
  assert.equal(refused.code, 2);
  assert.match(refused.log, new RegExp(`${ENTRY}: the entry of PR #77 is in the way of the entry of PR #2`));
  assert.equal(read(other, ENTRY), stray);
});

test("of two PRs that set the same version, the newest run table counts; two entries of one PR with other text stop the build", () => {
  const root = makeRoot();
  const state = {
    issues: [issue(1), issue(3)],
    pulls: [pull(2), pull(4, { merge_commit_sha: SHA("c"), merged_at: "2026-11-06T10:00:00Z" })],
    versions: { [SHA("a")]: "0.3.0", [SHA("c")]: "0.3.0", [`${SHA("c")}^`]: "0.2.9" },
    comments: [
      comment(2, { id: 1, created_at: "2026-11-04T08:00:00Z", body: "Release run v0.3.0\n\n| 1 | fail |" }),
      comment(4, { id: 2, created_at: "2026-11-07T08:00:00Z", body: "Release run v0.3.0\n\n| 1 | pass |" })
    ]
  };
  assert.equal(runExport(root, state).code, 0);
  const runEntry = read(root, "docs/history/2026/11/release-run-v0.3.0.md");
  assert.equal(parseTop(runEntry).pr, 4);
  assert.match(runEntry, /\| 1 \| pass \|/);
  assert.deepEqual(check(root), []);

  // A copy of the entry with the same hand-written text is removed (a move that stopped); a
  // copy with other text stops the build, and both files stay.
  const copy = "docs/history/2026/11/ticket-044.md";
  fs.writeFileSync(path.join(root, copy), read(root, ENTRY));
  build(root);
  assert.ok(!exists(root, copy));
  fs.writeFileSync(path.join(root, copy), setField(read(root, ENTRY), "Left open", "Other text."));
  assert.throws(() => build(root), /ticket-001\.md and .*ticket-044\.md: both are an entry of PR #2 with other text/);
  assert.ok(exists(root, copy) && exists(root, ENTRY));

  // An entry that lost its PR line is refused where it is: with no other file for its PR, and
  // when its PR would move to another path. Its text is never taken for a fresh entry.
  fs.rmSync(path.join(root, copy));
  const whole = read(root, ENTRY);
  fs.writeFileSync(path.join(root, ENTRY), setField(whole, "Left open", "A fact.").replace(/^- PR: .*\n/m, ""));
  const message = new RegExp(`${ENTRY}: an entry with no \`- PR: \\[#n\\]\` line`);
  assert.throws(() => build(root), message);
  const movedState = { ...state, pulls: [pull(2, { title: "Change 1, with no ticket number" }), state.pulls[1]] };
  const refusedMove = runExport(root, movedState);
  assert.equal(refusedMove.code, 2);
  assert.match(refusedMove.log, message);
  assert.ok(!exists(root, "docs/history/2026/11/pr-002.md"));
  assert.match(read(root, ENTRY), /A fact\./);
  fs.writeFileSync(path.join(root, ENTRY), whole);
  assert.equal(runExport(root, state).code, 0);
  fs.writeFileSync(path.join(root, copy), setField(read(root, ENTRY), "Left open", "Other text."));

  // A line inside a top block that is no `key: value` line is scanned with the word list too,
  // and the scan command reads a top block as check does.
  const note = path.join(makeTempDir(), "note.md");
  const home = ["C:", "Users", "janedoe", "x"].join("\\");
  // The file has Windows line ends, as a checkout on Windows can have.
  fs.writeFileSync(note, `---\nkind: "issue"\nAuthor: Acme\ntitle: ${JSON.stringify(`see ${home}`)}\n---\ntext\n`.replace(/\n/g, "\r\n"));
  const words = path.join(makeTempDir(), "terms.txt");
  fs.writeFileSync(words, "acme\nkind\n");
  const scanned = run(process.execPath, [SCRIPT, "scan", "--terms", words, note], { cwd: makeTempDir(), timeout: 30_000 });
  assert.equal(scanned.status, 1);
  assert.deepEqual(scanned.stdout.trim().split(/\r?\n/), [`${note}:3: private term`, `${note}:4: home folder path`]);

  // In a block that this script wrote, a line with another key was added by a person: it is
  // scanned whole, with its key name; a value that is an object is scanned too.
  const added = path.join(makeTempDir(), "added.md");
  fs.writeFileSync(
    added,
    [
      "---",
      'kind: "issue"',
      ["pass", 'word: "Hunter2abc123xyz"'].join(""),
      `title: ${JSON.stringify({ mail: EMAIL })}`,
      // The JSON form doubles each backslash, so the decoded text is scanned too.
      `note: ${JSON.stringify(home)}`,
      // An object under one of this script's keys: the name inside it is part of the find.
      `labels: ${JSON.stringify([{ [["pass", "word"].join("")]: "Hunter2abc123xyz" }])}`,
      "---",
      "text",
      ""
    ].join("\n")
  );
  const addedScan = run(process.execPath, [SCRIPT, "scan", added], { cwd: makeTempDir(), timeout: 30_000 });
  assert.equal(addedScan.status, 1);
  assert.deepEqual(addedScan.stdout.trim().split(/\r?\n/), [
    `${added}:3: password or key value`,
    `${added}:4: email address`,
    `${added}:5: home folder path`,
    `${added}:6: password or key value`
  ]);

  // Each key that the export writes in a top block is one of the script's own keys.
  for (const file of tree(root).filter((name) => read(root, name).startsWith("---\n"))) {
    Object.keys(parseTop(read(root, file))).forEach((key) => assert.ok(OWN_KEYS.has(key), `${file}: ${key}`));
  }

  // A release run entry outside a month folder is an error, not a new folder, and check names
  // the file once.
  const stray = "docs/history/release-run-v9.9.9.md";
  fs.writeFileSync(path.join(root, stray), read(root, "docs/history/2026/11/release-run-v0.3.0.md"));
  assert.deepEqual(
    check(root).filter((problem) => problem.startsWith(`${stray}:`)),
    [`${stray}: a release run entry that is not in a YYYY/MM folder of docs/history`]
  );
  fs.rmSync(path.join(root, stray));

  // A failed git call for the changed paths gives exit 2.
  fs.rmSync(path.join(root, copy));
  const failed = runExport(root, { ...state, fail: (tool, args) => tool === "git" && args[0] === "diff" }, { exportBase: "origin/main" });
  assert.equal(failed.code, 2);
  assert.match(failed.log, /git failed \(the changed paths for --export-base\)/);
});

test("an export that stops at a rename is finished by the build command, old paths too", () => {
  const root = makeRoot();
  const state = ONE();
  state.comments = [comment(2, { id: 1, body: "Release run v0.2.0\n\n| 1 | fail |" })];
  state.versions = { [SHA("a")]: "0.2.0" };
  assert.equal(runExport(root, state).code, 0);
  const oldRun = "docs/history/2026/11/release-run-v0.2.0.md";
  // A second PR, merged in another month, sets the same version again and has a newer table:
  // the run entry of the version moves. The rename of one PR copy fails.
  state.issues.push(issue(3));
  state.pulls.push(pull(4, { merge_commit_sha: SHA("c"), merged_at: "2026-12-02T10:00:00Z" }));
  state.versions = { [SHA("a")]: "0.2.0", [SHA("c")]: "0.2.0", [`${SHA("c")}^`]: "0.1.9" };
  state.comments.push(comment(4, { id: 2, created_at: "2026-12-03T08:00:00Z", body: "Release run v0.2.0\n\n| 1 | pass |" }));
  const stopped = runExport(root, state, {
    rename: (from, to) => {
      if (to.endsWith("pull-004.md")) {
        throw new Error("the file is locked");
      }
      fs.renameSync(from, to);
    }
  });
  assert.equal(stopped.code, 2);
  assert.ok(exists(root, oldRun));
  build(root);
  assert.ok(!exists(root, oldRun));
  assert.match(read(root, "docs/history/2026/12/release-run-v0.2.0.md"), /\| 1 \| pass \|/);
  assert.ok(!tree(root).some((file) => /\.pending$|all-pending/.test(file)));
  assert.deepEqual(check(root), []);

  // A half-written README leftover in docs/decisions is removed too.
  fs.writeFileSync(path.join(root, "docs/decisions/README.md.pending.partial"), "half");
  build(root);
  assert.ok(!exists(root, "docs/decisions/README.md.pending.partial"));
});

test("an entry that moves onto the path of another entry keeps its own text, and so does the other", () => {
  const root = makeRoot();
  const state = ONE();
  state.pulls.push(pull(5, { ticket: 1, title: "[#1] Second change", merged_at: "2026-11-05T10:00:00Z", merge_commit_sha: SHA("c") }));
  assert.equal(runExport(root, state).code, 0);
  const second = "docs/history/2026/11/pr-005.md";
  const moved = "docs/history/2026/11/pr-002.md";
  const baseFirst = setField(read(root, ENTRY), "Left open", "A fact of PR 2.");
  const baseSecond = setField(read(root, second), "Left open", "A fact of PR 5.");
  fs.writeFileSync(path.join(root, ENTRY), baseFirst);
  fs.writeFileSync(path.join(root, second), baseSecond);

  // PR #2 loses its ticket number: it moves to pr-002.md, and PR #5 takes ticket-001.md.
  state.pulls[0].title = "Change 1, with no ticket number";
  const result = runExport(
    root,
    { ...state, base: { [ENTRY]: baseFirst, [second]: baseSecond }, changed: [ENTRY, second, moved] },
    { exportBase: "origin/main" }
  );
  assert.equal(result.code, 0, result.log);
  assert.equal(parseEntry(read(root, moved)).fields["Left open"], "A fact of PR 2.");
  assert.equal(parseEntry(read(root, ENTRY)).fields["Left open"], "A fact of PR 5.");
  assert.match(read(root, ENTRY), /- PR: \[#5\]/);
  assert.ok(!exists(root, second));

  // A new PR that takes a path whose file names another PR does not get that PR's text.
  const other = makeRoot();
  const first = ONE();
  assert.equal(runExport(other, first).code, 0);
  fs.writeFileSync(path.join(other, ENTRY), setField(read(other, ENTRY), "Left open", "A fact of PR 2."));
  first.pulls[0].title = "[#7] Change for another ticket";
  first.pulls.push(pull(9, { ticket: 1, merged_at: "2026-11-06T10:00:00Z", merge_commit_sha: SHA("e") }));
  assert.equal(runExport(other, first).code, 0);
  assert.equal(parseEntry(read(other, "docs/history/2026/11/ticket-007.md")).fields["Left open"], "A fact of PR 2.");
  assert.notEqual(parseEntry(read(other, ENTRY)).fields["Left open"], "A fact of PR 2.");

  // The same swap with a write that fails between the two entries: both old files stay whole.
  const swap = makeRoot();
  const pair = ONE();
  pair.pulls.push(pull(5, { ticket: 3, title: "[#3] Second change", merged_at: "2026-11-05T10:00:00Z", merge_commit_sha: SHA("c") }));
  assert.equal(runExport(swap, pair).code, 0);
  const swapped = "docs/history/2026/11/ticket-003.md";
  fs.writeFileSync(path.join(swap, ENTRY), setField(read(swap, ENTRY), "Left open", "A fact of PR 2."));
  fs.writeFileSync(path.join(swap, swapped), setField(read(swap, swapped), "Left open", "A fact of PR 5."));
  const before = snapshot(swap);
  pair.pulls[0].title = "[#3] Change 1, now for ticket 3";
  pair.pulls[1].title = "[#1] Second change, now for ticket 1";
  let entryWrites = 0;
  const stopped = runExport(swap, pair, {
    write: (full, text) => {
      if (/ticket-00[13]\.md/.test(full) && (entryWrites += 1) === 2) {
        throw new Error("disk full");
      }
      defaultWrite(full, text);
    }
  });
  assert.equal(stopped.code, 2);
  assert.equal(read(swap, ENTRY), before[ENTRY]);
  assert.equal(read(swap, swapped), before[swapped]);
  assert.equal(runExport(swap, pair).code, 0);
  assert.equal(parseEntry(read(swap, swapped)).fields["Left open"], "A fact of PR 2.");
  assert.equal(parseEntry(read(swap, ENTRY)).fields["Left open"], "A fact of PR 5.");

  // The swap back, with a rename that fails after the first entry has its new text: the other
  // entry's new text stays beside its target, and the next run finishes the work.
  const swappedState = snapshot(swap);
  pair.pulls[0].title = "[#1] Change 1";
  pair.pulls[1].title = "[#3] Second change";
  let entryRenames = 0;
  const halfway = runExport(swap, pair, {
    rename: (from, to) => {
      if (/ticket-00[13]\.md$/.test(to) && (entryRenames += 1) === 2) {
        throw new Error("the file is locked");
      }
      fs.renameSync(from, to);
    }
  });
  assert.equal(halfway.code, 2);
  assert.match(halfway.log, /Run the command again to finish/);
  assert.ok(tree(swap).some((file) => file.endsWith(".pending")));
  assert.equal(runExport(swap, pair).code, 0);
  assert.equal(parseEntry(read(swap, ENTRY)).fields["Left open"], "A fact of PR 2.");
  assert.equal(parseEntry(read(swap, swapped)).fields["Left open"], "A fact of PR 5.");
  assert.ok(!tree(swap).some((file) => /\.pending$|all-pending/.test(file)));
  assert.deepEqual(check(swap), []);
  // Put the swapped state back for the checks below.
  pair.pulls[0].title = "[#3] Change 1, now for ticket 3";
  pair.pulls[1].title = "[#1] Second change, now for ticket 1";
  assert.equal(runExport(swap, pair).code, 0);
  assert.deepEqual(snapshot(swap), swappedState);

  // A file that is left from a run that was killed is removed by the next run. A person's own
  // draft in docs/decisions is not.
  fs.writeFileSync(path.join(swap, `${ENTRY}.pending`), "half");
  fs.writeFileSync(path.join(swap, `${RAW_ISSUE}.partial`), "---\nkind");
  fs.writeFileSync(path.join(swap, "docs/decisions/0009-draft.md.pending"), "# a draft\n");
  assert.equal(runExport(swap, pair).code, 0);
  assert.deepEqual(tree(swap).filter((file) => /\.(partial|pending)$/.test(file)), ["docs/decisions/0009-draft.md.pending"]);
  fs.rmSync(path.join(swap, "docs/decisions/0009-draft.md.pending"));

  // An entry of the base whose file now holds the entry of another PR is reported.
  const taken = check(swap, {
    exportBase: "branch-start",
    changedPaths: () => [ENTRY],
    gitShow: (ref, file) => (file === ENTRY ? before[ENTRY].replace("- PR: [#2]", "- PR: [#77]") : null)
  });
  assert.ok(taken.includes(`${ENTRY}: the entry of PR #77 is gone, and its file holds another entry`));

  // A file with no PR line at the path that a moving entry needs is not replaced in silence.
  const blocked = makeRoot();
  const one = ONE();
  assert.equal(runExport(blocked, one).code, 0);
  one.pulls[0].title = "Change 1, with no ticket number";
  const target = path.join(blocked, "docs/history/2026/11/pr-002.md");
  fs.writeFileSync(target, read(blocked, ENTRY).replace(/^- PR: .*\n/m, ""));
  const refused = runExport(blocked, one);
  assert.equal(refused.code, 2);
  assert.match(refused.log, /pr-002\.md: an entry with no `- PR: \[#n\]` line/);

  // A broken entry that would move is reported under the path where it is.
  const broken = makeRoot();
  const third = ONE();
  assert.equal(runExport(broken, third).code, 0);
  fs.writeFileSync(path.join(broken, ENTRY), read(broken, ENTRY).replace(FIELDS_MARK, ""));
  third.pulls[0].title = "Change 1, with no ticket number";
  const failed = runExport(broken, third);
  assert.equal(failed.code, 2);
  assert.match(failed.log, new RegExp(`^${ENTRY}: a marker line is missing$`, "m"));
});

test("the build and check commands work from the command line, and an option file that git ignores is allowed", () => {
  const root = makeRoot();
  assert.equal(runExport(root, ONE()).code, 0);
  initGitRepo(root);
  fs.writeFileSync(path.join(root, ".gitignore"), "local/\n");
  fs.mkdirSync(path.join(root, "local"));
  fs.writeFileSync(path.join(root, "local", "terms.txt"), "Issue 1\n");
  fs.writeFileSync(path.join(root, "terms.txt"), "Issue 1\n");
  const cli = (...args) => run(process.execPath, [SCRIPT, ...args], { cwd: root, timeout: 60_000 });

  assert.equal(cli("check").status, 0);
  assert.equal(cli("build").status, 0);
  const withTerms = cli("check", "--terms", path.join("local", "terms.txt"));
  assert.equal(withTerms.status, 1);
  assert.match(withTerms.stderr, /issue-001\.md:\d+: private term/);
  assert.equal(cli("check", "--terms", "terms.txt").status, 2); // inside the repo and not ignored

  fs.appendFileSync(path.join(root, "docs/history/open.md"), "extra\n");
  const stale = cli("check");
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /open\.md: stale/);
  assert.equal(cli("build").status, 0);
  assert.equal(cli("check").status, 0);
  assert.equal(cli("build", "extra").status, 2);
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
