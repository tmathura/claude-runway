// Keep the history of each change in the repo ("History" in docs/development.md).
// Usage: node scripts/history.mjs <command>
//   export [--finds <path>] [--acknowledged <path>] [--terms <path>] [--export-base <ref>]
//          read GitHub, write the raw copies under docs/history/github/, then build
//   build  write the entries and the generated pages from the raw copies (no network)
//   check [--terms <path>]
//          fail when a page is stale, an entry is malformed, a link is dead or text is sensitive
//   scan [--terms <path>] <file>...
//          the sensitive-text check for any file
// Exit 0: done. Exit 1: `check` or `scan` found something. Exit 2: bad arguments, or a read or
// write failed (run the command again to finish a write that stopped). Exit 4: `export` found a
// secret that is public on GitHub and wrote no history file. Exit 5: `export --export-base`
// found a change that the command did not generate.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = "tmathura/claude-runway";
const OWNER = REPO.split("/")[0];
const HISTORY = "docs/history";
const RAW = `${HISTORY}/github`;
const DECISIONS = "docs/decisions";
const TYPE_LABELS = ["bug", "enhancement", "documentation"];

export const HEADER_MARK = "<!-- header: `npm run history` rewrites the lines down to the next marker -->";
export const FIELDS_MARK = "<!-- fields: `npm run history` fills a field only while it holds generated text -->";
export const NOT_RECORDED = "not recorded";
// Each entry field, and the sections of the PR body that hold it.
export const FIELDS = [
  ["What changed", ["Change"]],
  ["Why", ["Problem", "Change"]],
  ["Options dropped", ["Plan comparison"]],
  ["What was checked", ["Testing"]],
  ["Review result", ["Review rounds"]],
  ["Left open", ["State"]]
];

// ---------------------------------------------------------------------------------------------
// Sensitive text

// A secret stops an export, because it is already public. A private detail is only replaced.
export const PATTERNS = [
  // The whole block, so the key itself is replaced and its hash names this one key. A block with
  // no end line is taken to the end of the text: a key line can have any form (indented, quoted,
  // cut), so nothing after the first line is safe to keep.
  {
    kind: "private key",
    group: "secret",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:(?:(?!-----BEGIN )[\s\S])*?-----END [A-Z ]*PRIVATE KEY-----|[\s\S]*)/g
  },
  { kind: "Anthropic key", group: "secret", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { kind: "OpenAI key", group: "secret", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: "GitHub token", group: "secret", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/g },
  { kind: "AWS key id", group: "secret", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "Google key", group: "secret", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "Slack token", group: "secret", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "JWT", group: "secret", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { kind: "URL with a password", group: "secret", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/gi },
  {
    kind: "signed URL",
    group: "secret",
    re: /[?&](?:X-Amz-Signature|X-Amz-Credential|X-Goog-Signature|Signature|sig|token|jwt|access_token)=[A-Za-z0-9%._+/-]{16,}/g
  },
  // A value stops at a `[removed:` marker, so `Pwd=[removed: phone number]` in text that was
  // cleaned before is not read as a value. Any other `[` is part of the value.
  { kind: "cookie", group: "secret", re: /\b(?:Set-)?Cookie:\s*[^\s=;]+=(?:(?!\[removed:)[^\s;]){8,}/gi },
  {
    kind: "connection string",
    group: "secret",
    re: /\b(?:Password|Pwd|AccountKey|SharedAccessKey)=(?:(?!\[removed:)[^;\s"'`<>${}]){6,}/gi
  },
  {
    kind: "password or key value",
    group: "secret",
    re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)["']?\s*[=:]\s*["']?[^\s"'`<>${}[\]()|,;]{8,}/gi
  },
  { kind: "email address", group: "private", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { kind: "phone number", group: "private", re: /(?<![\w+])\+\d[\d ().-]{7,}\d/g },
  {
    kind: "home folder path",
    group: "private",
    re: /(?<![\w.])(?:[A-Za-z]:[\\/]|\/[a-z]\/|\/)(?:Users|home)[\\/][^\\/\s"'`<>:|*?()[\]{},;]+/g
  }
];

const ALLOWED_EMAIL = /@(?:users\.noreply\.github\.com|github\.com|example\.(?:com|org|net))$|^noreply@anthropic\.com$/i;
const GENERIC_HOME = /[\\/](?:runner|runneradmin|you|user|username|name|me|public|default|shared)$/i;

function allowed(kind, value) {
  // A value that is only a bracket placeholder, as in docs: `Password=[your-password]`, or a
  // Markdown link `[key](url)`. A value with more text than that is still a find.
  if ((kind === "connection string" || kind === "cookie") && /=\[[^\]]*\](?:\([^)]*\))?$/.test(value)) {
    return true;
  }
  if (kind === "email address") {
    return ALLOWED_EMAIL.test(value);
  }
  if (kind === "phone number") {
    const digits = value.replace(/\D/g, "").length;
    return digits < 9 || digits > 15;
  }
  if (kind === "home folder path") {
    return GENERIC_HOME.test(value);
  }
  if (kind === "password or key value") {
    // Prose ("the secret: something") and code (`secret = path.join(...)`) are common. After a
    // colon, and after an equals sign with spaces and no quote, only a value that looks like a
    // key counts.
    const match = /(\s*)([=:])\s*(["']?)([^\s"']+)$/.exec(value);
    const keyLike = match[4].length >= 12 && /\d/.test(match[4]) && /[A-Za-z]/.test(match[4]);
    const config = match[2] === "=" && (match[3] !== "" || match[1] === "");
    return !config && !keyLike;
  }
  return false;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// The finds in a text, in the order of the text. Finds that overlap become one find.
export function findSensitive(text, terms = []) {
  const finds = [];
  for (const { kind, group, re } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      if (!allowed(kind, match[0])) {
        finds.push({ kind, group, index: match.index, value: match[0] });
      }
    }
  }
  // An empty word would match at every position, with no end. The search runs on the text
  // itself: a lower-case copy can have another length, so its indexes would be wrong.
  for (const term of terms.filter((word) => word.trim() !== "")) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
    for (const match of text.matchAll(re)) {
      finds.push({ kind: "private term", group: "private", index: match.index, value: match[0] });
    }
  }
  // Finds that overlap become one find over the whole span. It is a secret when one of them is,
  // so a private word can never hide a secret, and no part of either stays in the text.
  finds.sort((a, b) => a.index - b.index || b.value.length - a.value.length);
  const kept = [];
  for (const find of finds) {
    const last = kept[kept.length - 1];
    if (last && find.index < last.index + last.value.length) {
      const end = Math.max(last.index + last.value.length, find.index + find.value.length);
      if (find.group === "secret" && last.group !== "secret") {
        last.kind = find.kind;
        last.group = "secret";
      }
      last.value = text.slice(last.index, end);
    } else {
      kept.push({ ...find, line: text.slice(0, find.index).split("\n").length });
    }
  }
  return kept;
}

export function redact(text, finds) {
  let out = "";
  let at = 0;
  for (const find of finds) {
    out += `${text.slice(at, find.index)}[removed: ${find.kind}]`;
    at = find.index + find.value.length;
  }
  return out + text.slice(at);
}

export function readTerms(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

// ---------------------------------------------------------------------------------------------
// Small helpers

const pad = (n) => String(n).padStart(3, "0");
const month = (iso) => `${iso.slice(0, 4)}/${iso.slice(5, 7)}`;
const day = (iso) => iso.slice(0, 10);
const lf = (text) => (text ?? "").replace(/\r\n?/g, "\n");
// A long run of encoded characters (a bot's hidden state) is left out: nobody can read it, so
// nobody can check it for sensitive text before it is public. This runs after the sensitive
// check, so a long token is still found as a secret first.
const leaveOutEncoded = (text) =>
  text.replace(/[A-Za-z0-9+/=_-]{1000,}/g, (run) => `[left out: ${run.length} characters of encoded text]`);
const posix = (p) => p.split(path.sep).join("/");
const safeTag = (tag) => tag.replace(/[^\w.+-]/g, "-");

function link(fromFile, toPath, text) {
  const rel = posix(path.posix.relative(path.posix.dirname(fromFile), toPath));
  return `[${text}](${rel})`;
}

// The `##` headings of a Markdown text, outside code fences.
export function headings(text) {
  const found = [];
  let fence = false;
  for (const line of lf(text).split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
    } else if (!fence) {
      const match = /^## +(.+?)\s*$/.exec(line);
      if (match) {
        found.push(match[1]);
      }
    }
  }
  return found;
}

// The top block: `key: <JSON value>` lines between two `---` lines.
export function renderTop(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

export function parseTop(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") {
    throw new Error("the file does not start with a top block");
  }
  const end = lines.indexOf("---", 1);
  if (end === -1) {
    throw new Error("the top block has no end line");
  }
  const values = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([a-z_]+): (.*)$/.exec(line);
    if (!match) {
      throw new Error(`the top block line ${JSON.stringify(line)} is not \`key: value\``);
    }
    try {
      values[match[1]] = JSON.parse(match[2]);
    } catch {
      throw new Error(`the value of \`${match[1]}\` in the top block is not JSON`);
    }
  }
  if (typeof values.kind !== "string") {
    throw new Error("the top block has no `kind`");
  }
  return values;
}

// What names one item, whatever path its file has.
const itemId = (top) => `${top.kind}|${top.number ?? top.tag ?? top.version}`;

function setGone(text, gone) {
  const lines = text.split("\n");
  const end = lines.indexOf("---", 1);
  const kept = lines.slice(1, end).filter((line) => line !== "gone: true");
  if (gone) {
    kept.push("gone: true");
  }
  return ["---", ...kept, ...lines.slice(end)].join("\n");
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => posix(path.join(entry.parentPath, entry.name)))
    .sort();
}

class Failure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------------------------
// Read GitHub

const THREADS_QUERY = `query($owner:String!,$repo:String!,$n:Int!){ repository(owner:$owner,name:$repo){ pullRequest(number:$n){
  reviewThreads(first:100){ pageInfo{ hasNextPage } nodes{ isResolved isOutdated path line
    comments(first:100){ pageInfo{ hasNextPage } nodes{ author{ login } createdAt url body state } } } } } } }`;

function isExportPull(pull, files) {
  const match = /^export\/(\d+)-history$/.exec(pull.head);
  return (
    match !== null &&
    pull.title === `[#${match[1]}] Export the history of #${match[1]}` &&
    files.every((file) => file.startsWith(`${HISTORY}/`) || file === `${DECISIONS}/README.md`)
  );
}

// Everything that only GitHub holds, as plain objects. `gh` and `git` take an argument list and
// return the output text, or throw.
export function readGitHub({ gh, git }) {
  const json = (args, what) => {
    let out;
    try {
      out = gh(args);
    } catch (error) {
      throw Object.assign(new Failure(2, `gh failed (${what}): ${String(error.stderr || error.message).trim()}`), {
        notFound: /HTTP 404/.test(String(error.stderr || error.message))
      });
    }
    try {
      return JSON.parse(out);
    } catch {
      throw new Failure(2, `gh gave text that is not JSON (${what})`);
    }
  };
  const pages = (apiPath) => json(["api", "--paginate", "--slurp", `repos/${REPO}/${apiPath}`], apiPath).flat();
  const gitText = (args, what) => {
    try {
      return git(args);
    } catch (error) {
      throw new Failure(2, `git failed (${what}): ${String(error.stderr || error.message).trim()}`);
    }
  };

  gitText(["fetch", "origin", "main"], "fetch origin main");
  const comments = new Map();
  for (const comment of pages("issues/comments?per_page=100")) {
    const number = Number(comment.issue_url.split("/").pop());
    const list = comments.get(number) ?? [];
    list.push({
      author: comment.user?.login ?? "ghost",
      created_at: comment.created_at,
      url: comment.html_url,
      body: lf(comment.body)
    });
    comments.set(number, list);
  }
  const common = (item) => ({
    number: item.number,
    title: item.title,
    labels: item.labels.map((label) => label.name).sort(),
    author: item.user?.login ?? "ghost",
    created_at: item.created_at,
    closed_at: item.closed_at,
    url: item.html_url,
    body: lf(item.body),
    comments: comments.get(item.number) ?? []
  });

  const issues = pages("issues?state=all&per_page=100")
    .filter((item) => !item.pull_request)
    .map((item) => ({ ...common(item), state: item.state, state_reason: item.state_reason ?? null }));

  const version = (ref) => {
    const text = gitText(["show", `${ref}:package.json`], `show ${ref}:package.json`);
    try {
      return JSON.parse(text).version ?? null;
    } catch {
      throw new Failure(2, `package.json at ${ref} is not JSON`);
    }
  };
  const pulls = [];
  for (const item of pages("pulls?state=all&per_page=100")) {
    const pull = {
      ...common(item),
      state: item.merged_at ? "merged" : item.state,
      draft: item.draft,
      merged_at: item.merged_at,
      merge_commit: item.merged_at ? item.merge_commit_sha : null,
      head: item.head.ref,
      base: item.base.ref
    };
    if (pull.head.startsWith("export/")) {
      const files = pages(`pulls/${pull.number}/files?per_page=100`).map((file) => file.filename);
      if (isExportPull(pull, files)) {
        continue;
      }
    }
    // A pending review is a draft that only its author can see. It is not public, so it is left out.
    const sent = pages(`pulls/${pull.number}/reviews?per_page=100`).filter((review) => review.state !== "PENDING");
    pull.reviews = sent.map((review) => ({
      author: review.user?.login ?? "ghost",
      state: review.state,
      submitted_at: review.submitted_at,
      commit: review.commit_id,
      url: review.html_url,
      body: lf(review.body)
    }));
    const data = json(
      ["api", "graphql", "-F", `owner=${OWNER}`, "-F", `repo=${REPO.split("/")[1]}`, "-F", `n=${pull.number}`, "-f", `query=${THREADS_QUERY}`],
      `review threads of #${pull.number}`
    );
    const threads = data?.data?.repository?.pullRequest?.reviewThreads;
    if (!threads) {
      throw new Failure(2, `gh gave no review threads for #${pull.number}`);
    }
    // shortcut: one page of 100 threads and of 100 comments in a thread; add paging when a PR reaches it.
    if (threads.pageInfo.hasNextPage || threads.nodes.some((thread) => thread.comments.pageInfo.hasNextPage)) {
      throw new Failure(2, `#${pull.number} has more review threads or thread comments than one page holds`);
    }
    // A pending comment belongs to a review that was not sent. It is left out, and so is a
    // thread that holds nothing else.
    pull.threads = threads.nodes
      .map((thread) => ({
        path: thread.path,
        line: thread.line,
        resolved: thread.isResolved,
        outdated: thread.isOutdated,
        comments: thread.comments.nodes
          .filter((comment) => comment.state !== "PENDING")
          .map((comment) => ({
            author: comment.author?.login ?? "ghost",
            created_at: comment.createdAt,
            url: comment.url,
            body: lf(comment.body)
          }))
      }))
      .filter((thread) => thread.comments.length > 0);
    pull.version_set = null;
    // Only `main` is fetched. A PR that merged into another branch has no commit here to read.
    if (pull.merge_commit && pull.base === "main") {
      const after = version(pull.merge_commit);
      pull.version_set = after !== version(`${pull.merge_commit}^`) ? after : null;
    }
    pulls.push(pull);
  }

  const releases = pages("releases?per_page=100").map((item) => {
    let tagCommit = null;
    if (!item.draft) {
      try {
        const ref = json(["api", `repos/${REPO}/git/ref/tags/${item.tag_name}`], `tag ${item.tag_name}`);
        tagCommit =
          ref.object.type === "tag"
            ? json(["api", `repos/${REPO}/git/tags/${ref.object.sha}`], `tag object ${item.tag_name}`).object.sha
            : ref.object.sha;
      } catch (error) {
        if (!error.notFound) {
          throw error;
        }
      }
    }
    return {
      tag: item.tag_name,
      name: item.name ?? "",
      draft: item.draft,
      prerelease: item.prerelease,
      author: item.author?.login ?? "ghost",
      created_at: item.created_at,
      published_at: item.published_at,
      target: item.target_commitish,
      tag_commit: tagCommit,
      url: item.html_url,
      body: lf(item.body)
    };
  });
  return { issues, pulls, releases };
}

// ---------------------------------------------------------------------------------------------
// Render the raw copies

const RAW_NOTE = "Raw copy from GitHub. Do not edit: `npm run history -- export` rewrites this file.";

function part(label, who, when, url, cleanText) {
  const text = cleanText.trim();
  return `***\n\n**${label}** by \`${who}\`, ${when}${url ? `, ${url}` : ""}\n\n${text === "" ? "_(empty)_" : text}\n`;
}

// The files of one export: path -> text. `clean(text, place)` replaces sensitive text.
export function renderRaw(data, clean, refused = []) {
  const files = new Map();
  // Two items must never share a file, also not on a disk that ignores the case of letters.
  const taken = new Map();
  const put = (file, text) => {
    const key = file.toLowerCase();
    if (taken.has(key)) {
      throw new Failure(2, `two items give the same file (${taken.get(key)} and ${file}); no history file was written`);
    }
    taken.set(key, file);
    files.set(file, text);
  };
  const runDates = new Map();
  for (const issue of data.issues) {
    const file = `${RAW}/${month(issue.created_at)}/issue-${pad(issue.number)}.md`;
    const title = clean(issue.title, issue.url);
    const body = clean(issue.body, issue.url);
    const top = renderTop({
      kind: "issue",
      number: issue.number,
      title,
      state: issue.state,
      state_reason: issue.state_reason,
      labels: issue.labels.map((name) => clean(name, issue.url)),
      author: clean(issue.author, issue.url),
      created_at: issue.created_at,
      closed_at: issue.closed_at,
      url: issue.url,
      headings: headings(body)
    });
    const parts = [
      part("Body", clean(issue.author, issue.url), issue.created_at, issue.url, body),
      ...issue.comments.map((c) => part("Comment", clean(c.author, c.url), c.created_at, c.url, clean(c.body, c.url)))
    ];
    put(file, `${top}\n# Issue #${issue.number}: ${title}\n\n${RAW_NOTE}\n\n${parts.join("\n")}`);
  }

  for (const pull of data.pulls) {
    const file = `${RAW}/${month(pull.created_at)}/pull-${pad(pull.number)}.md`;
    const title = clean(pull.title, pull.url);
    const body = clean(pull.body, pull.url);
    const runs = releaseRuns(pull);
    const top = renderTop({
      kind: "pull",
      number: pull.number,
      title,
      state: pull.state,
      draft: pull.draft,
      labels: pull.labels.map((name) => clean(name, pull.url)),
      author: clean(pull.author, pull.url),
      created_at: pull.created_at,
      closed_at: pull.closed_at,
      merged_at: pull.merged_at,
      merge_commit: pull.merge_commit,
      head: clean(pull.head, pull.url),
      base: clean(pull.base, pull.url),
      url: pull.url,
      headings: headings(body),
      version_set: pull.version_set,
      release_runs: runs.map((run) => run.version)
    });
    const parts = [
      part("Body", clean(pull.author, pull.url), pull.created_at, pull.url, body),
      ...pull.comments.map((c) => part("Comment", clean(c.author, c.url), c.created_at, c.url, clean(c.body, c.url))),
      ...pull.reviews.map((r) =>
        part(`Review (${r.state}, on commit \`${r.commit}\`)`, clean(r.author, r.url), r.submitted_at ?? "no date", r.url, clean(r.body, r.url))
      ),
      ...pull.threads.flatMap((thread) => {
        const where = `\`${clean(thread.path, thread.comments[0].url)}\`${thread.line ? ` line ${thread.line}` : ""}`;
        const state = `${thread.resolved ? "resolved" : "not resolved"}${thread.outdated ? ", outdated" : ""}`;
        return thread.comments.map((c, index) =>
          part(index === 0 ? `Review thread on ${where} (${state})` : "Reply in the thread", clean(c.author, c.url), c.created_at, c.url, clean(c.body, c.url))
        );
      })
    ];
    put(file, `${top}\n# PR #${pull.number}: ${title}\n\n${RAW_NOTE}\n\n${parts.join("\n")}`);

    for (const run of runs) {
      const runFile = `${HISTORY}/${month(run.created_at)}/release-run-${safeTag(run.version)}.md`;
      const ticket = /^\[#(\d+)\]/.exec(pull.title);
      const runTop = renderTop({
        kind: "release-run",
        version: run.version,
        pr: pull.number,
        ticket: ticket ? Number(ticket[1]) : null,
        merge_commit: pull.merge_commit,
        date: run.created_at,
        url: run.url
      });
      const table = clean(run.body.split("\n").slice(1).join("\n"), run.url).trim();
      // One version has one release run entry. If two PRs set the same version (a revert, then
      // the change again), the newest table is the result of that version.
      const earlier = [...runDates].find(([, other]) => other.version.toLowerCase() === run.version.toLowerCase());
      if (earlier) {
        if (earlier[1].date >= run.created_at) {
          continue;
        }
        files.delete(earlier[0]);
        taken.delete(earlier[0].toLowerCase());
        runDates.delete(earlier[0]);
      }
      runDates.set(runFile, { version: run.version, date: run.created_at });
      put(
        runFile,
        `${runTop}\n# Release run ${run.version}\n\nThe result of the release run for ${link(runFile, file, `PR #${pull.number}`)}, ` +
          `copied from its table comment on GitHub (${run.url}). Do not edit: \`npm run history -- export\` rewrites this file.\n\n${table}\n`
      );
    }
  }

  for (const release of data.releases) {
    // The place of a find in a release does not use the release URL, because that URL holds the tag.
    const place = `https://github.com/${REPO}/releases (the release that was created at ${release.created_at})`;
    // The tag names the release, its file and its URL, so it cannot be replaced in the copy. A
    // tag with sensitive text stops the export: the owner renames the tag, or changes the list.
    const tag = release.tag;
    if (clean(tag, place) !== tag) {
      refused.push(place);
      continue;
    }
    const file = `${RAW}/${month(release.created_at)}/release-${safeTag(tag)}.md`;
    const name = clean(release.name, place);
    const top = renderTop({
      kind: "release",
      tag,
      name,
      draft: release.draft,
      prerelease: release.prerelease,
      author: clean(release.author, place),
      created_at: release.created_at,
      published_at: release.published_at,
      target: clean(release.target, place),
      tag_commit: release.tag_commit,
      url: release.url
    });
    // Two tags can give one file: by letter case, or by a character that a file name cannot hold.
    put(
      file,
      `${top}\n# Release ${tag}${name && name !== tag ? `: ${name}` : ""}\n\n${RAW_NOTE}\n\n` +
        part("Notes", clean(release.author, place), release.published_at ?? release.created_at, release.url, clean(release.body, place))
    );
  }
  return files;
}

// The newest release run table on a merged PR, for the version that this PR set. Only the
// owner's comments count. A table for another version, or on a PR that set no version, is no
// release run of this PR.
function releaseRuns(pull) {
  if (pull.state !== "merged" || !pull.version_set) {
    return [];
  }
  const byVersion = new Map();
  for (const comment of pull.comments) {
    const match = /^Release run (v\S+)$/.exec(comment.body.split("\n")[0].trimEnd());
    if (match && comment.author === OWNER && match[1] === `v${pull.version_set}`) {
      const earlier = byVersion.get(match[1]);
      if (!earlier || earlier.created_at < comment.created_at) {
        byVersion.set(match[1], { ...comment, version: match[1] });
      }
    }
  }
  return [...byVersion.values()];
}

// ---------------------------------------------------------------------------------------------
// Build the entries and the generated pages

const KNOWN_NAMES = [
  /^(?:README|current-state|open|gaps)\.md$/,
  /^\d{4}\/\d{2}\/(?:README|ticket-\d{3,}|pr-\d{3,}|release-run-[\w.+-]+)\.md$/,
  /^github\/\d{4}\/\d{2}\/(?:README|issue-\d{3,}|pull-\d{3,}|release-[\w.+-]+)\.md$/
];
const ENTRY_NAME = /^\d{4}\/\d{2}\/(?:ticket|pr)-\d{3,}\.md$/;
const GENERATED_FIELD = /^See (?:`## [^`]+`(?: and `## [^`]+`)? in|the text of) \[PR #\d+\]\([^)\s]*\)\.$/;

export const isGenerated = (text) => text === NOT_RECORDED || GENERATED_FIELD.test(text);

// The parts of an entry file. Throws when a marker or a field is missing or out of order.
export function parseEntry(text) {
  const lines = text.split("\n");
  const header = lines.indexOf(HEADER_MARK);
  const fields = lines.indexOf(FIELDS_MARK);
  if (header === -1 || fields === -1 || fields < header) {
    throw new Error("a marker line is missing");
  }
  const rest = lines.slice(fields + 1);
  const starts = rest.map((line, index) => (/^## /.test(line) ? index : -1)).filter((index) => index !== -1);
  const names = starts.map((index) => rest[index].slice(3).trim());
  const wanted = FIELDS.map(([name]) => name);
  if (names.join("|") !== wanted.join("|")) {
    throw new Error(`the fields are not ${wanted.map((name) => `"${name}"`).join(", ")} in this order`);
  }
  const values = {};
  starts.forEach((start, index) => {
    values[names[index]] = rest.slice(start + 1, starts[index + 1] ?? rest.length).join("\n").trim();
  });
  return { notes: rest.slice(0, starts[0]).join("\n").trim(), fields: values };
}

// The number of the PR that an entry is for, from its header.
function entryPull(text) {
  const match = /^- PR: \[#(\d+)\]/m.exec(text);
  return match ? Number(match[1]) : null;
}

function generatedField(sections, pull, pullFile, entryFile, wholeText) {
  const present = sections.filter((name) => pull.headings.includes(name));
  const target = link(entryFile, pullFile, `PR #${pull.number}`);
  if (present.length > 0) {
    return `See ${present.map((name) => `\`## ${name}\``).join(" and ")} in ${target}.`;
  }
  return wholeText ? `See the text of ${target}.` : NOT_RECORDED;
}

function planningFolder(root, number) {
  for (const folder of [".specify/specs", ".specify/bugs"]) {
    const dir = path.join(root, folder);
    if (fs.existsSync(dir)) {
      const name = fs.readdirSync(dir).sort().find((entry) => entry.startsWith(`${pad(number)}-`));
      if (name) {
        return `${folder}/${name}/`;
      }
    }
  }
  return null;
}

// What `build` writes: `files` (path -> text), `remove` (generated pages that have no content
// any more) and `errors` (files that `build` cannot read).
export function computeBuild(root) {
  const errors = [];
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const tops = (dir, names) => {
    const found = [];
    for (const file of listFiles(path.join(root, dir)).map((full) => posix(path.relative(root, full)))) {
      if (names.test(path.posix.basename(file))) {
        try {
          found.push({ file, ...parseTop(read(file)) });
        } catch (error) {
          errors.push(`${file}: ${error.message}`);
        }
      }
    }
    return found;
  };
  const raw = tops(RAW, /^(?:issue|pull|release)-.*\.md$/);
  const issues = raw.filter((item) => item.kind === "issue");
  const pulls = raw.filter((item) => item.kind === "pull");
  const releases = raw.filter((item) => item.kind === "release");
  const runs = tops(HISTORY, /^release-run-.*\.md$/).filter((item) => item.kind === "release-run");

  const files = new Map();
  const entries = [];
  const movedEntries = [];
  const entryByPull = new Map();
  for (const full of listFiles(path.join(root, HISTORY))) {
    const file = posix(path.relative(root, full));
    if (ENTRY_NAME.test(file.slice(HISTORY.length + 1))) {
      const pr = entryPull(read(file));
      if (pr !== null) {
        entryByPull.set(pr, [...(entryByPull.get(pr) ?? []), file]);
      }
    }
  }
  // An entry says that a change is on `main`. A PR that merged into another branch has its raw
  // copy and no entry: its change reaches `main` only with the PR of that branch.
  const merged = pulls
    .filter((pull) => pull.state === "merged" && pull.base === "main")
    .sort((a, b) => (a.merged_at < b.merged_at ? -1 : 1));
  const taken = new Set();
  for (const pull of merged) {
    const match = /^\[#(\d+)\]/.exec(pull.title);
    const ticket = match && !taken.has(Number(match[1])) ? Number(match[1]) : null;
    if (ticket !== null) {
      taken.add(ticket);
    }
    const issue = match ? issues.find((item) => item.number === Number(match[1])) : null;
    const file = `${HISTORY}/${month(pull.merged_at)}/${ticket !== null ? `ticket-${pad(ticket)}` : `pr-${pad(pull.number)}`}.md`;

    let state = "merged, not a release";
    if (pull.version_set) {
      const tag = `v${pull.version_set}`;
      const release = releases.find((item) => item.tag === tag && !item.draft && !item.gone && item.tag_commit === pull.merge_commit);
      const run = runs.find((item) => item.version === tag && item.pr === pull.number && !item.gone);
      const runText = run ? link(file, run.file, "release run") : null;
      state = release
        ? `released as ${tag} (${link(file, release.file, "release")}, ${runText ?? "no release run table on the PR"})`
        : `merged with version ${pull.version_set}, not released${runText ? ` (${runText})` : ""}`;
    }
    let planning = "none";
    let issueLine = "none (a PR with no ticket)";
    if (match) {
      const number = Number(match[1]);
      const folder = planningFolder(root, number);
      planning = folder
        ? link(file, folder, `\`${folder}\``)
        : issue?.headings.includes("Plan comparison")
          ? `the \`## Plan comparison\` of ${link(file, issue.file, `issue #${number}`)}`
          : "none in the repo";
      const label = issue?.labels.find((name) => TYPE_LABELS.includes(name));
      issueLine = issue
        ? `${link(file, issue.file, `#${number}`)}, ${label ? `label \`${label}\`` : "no type label"}`
        : `#${number} (no raw copy)`;
    }
    // A later PR of the same ticket has its own entry, under its own number and title.
    const title =
      ticket !== null ? `#${ticket} ${issue?.title ?? pull.title.replace(/^\[#\d+\]\s*/, "")}` : `PR #${pull.number} ${pull.title}`;
    const header = [
      `- Issue: ${issueLine}`,
      `- PR: ${link(file, pull.file, `#${pull.number}`)}, merged ${day(pull.merged_at)}`,
      `- Commit on \`main\`: \`${pull.merge_commit}\``,
      `- State: ${state}`,
      `- Planning notes: ${planning}`
    ];

    // The entry of this PR can be at another path: its path comes from the PR title, and a title
    // can be edited after the merge. Its notes and fields move with it, and the old file goes.
    // The PR that the file at the target path names: a number, null (no PR line), or undefined (no file).
    const at = fs.existsSync(path.join(root, file)) ? entryPull(read(file)) : undefined;
    const paths = entryByPull.get(pull.number) ?? [];
    // Two files for this PR, and neither is at the target path: the command cannot know which
    // one holds the text to keep, so a person must remove one.
    if (at !== pull.number && paths.length > 1) {
      errors.push(`${paths.join(" and ")}: both are an entry of PR #${pull.number}; keep one and delete the other`);
      continue;
    }
    const prior = at === pull.number ? file : (paths[0] ?? null);
    // A file at the target path that names another PR is not this entry: its text belongs to
    // that PR. A file with no PR line is read, so that its fault is reported and it is not
    // replaced in silence.
    if (at === null && prior !== null) {
      errors.push(`${file}: an entry with no PR line is in the way of the entry of PR #${pull.number}`);
      continue;
    }
    // A file that names a PR with no entry of its own in this build (not merged into `main`, or
    // no raw copy) will not move away, so its text would be lost.
    if (typeof at === "number" && at !== pull.number && !merged.some((other) => other.number === at)) {
      errors.push(`${file}: the entry of PR #${at} is in the way of the entry of PR #${pull.number}`);
      continue;
    }
    const source = prior ?? (at === null ? file : null);
    let old = { notes: "", fields: {} };
    if (source !== null) {
      try {
        old = parseEntry(read(source));
      } catch (error) {
        errors.push(`${source}: ${error.message}`);
        continue;
      }
    }
    // Each other file that names this PR goes: the old path of a move, also when an earlier run
    // stopped after it wrote the new path and before it removed the old one.
    movedEntries.push(...paths.filter((other) => other !== file));
    const fields = FIELDS.map(([name, sections], index) => {
      const fresh = generatedField(sections, pull, pull.file, file, !match && index < 2);
      const kept = old.fields[name];
      return [name, kept !== undefined && !isGenerated(kept) ? kept : fresh];
    });
    files.set(
      file,
      [
        `# ${title}`,
        "",
        HEADER_MARK,
        ...header,
        FIELDS_MARK,
        ...(old.notes ? [old.notes] : []),
        ...fields.flatMap(([name, text]) => ["", `## ${name}`, "", text]),
        ""
      ].join("\n")
    );
    entries.push({ file, title, pull, state, fields, date: pull.merged_at });
  }

  // The index of each month.
  const months = new Map();
  const inMonth = (key) => months.get(key) ?? months.set(key, { entries: [], runs: [], raw: [] }).get(key);
  entries.forEach((entry) => inMonth(month(entry.date)).entries.push(entry));
  runs.forEach((run) => inMonth(month(run.date)).runs.push(run));
  raw.forEach((item) => inMonth(item.file.slice(RAW.length + 1, RAW.length + 8)).raw.push(item));
  const plain = (text) => text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  for (const [key, group] of months) {
    const file = `${HISTORY}/${key}/README.md`;
    // By time; the full time stamp keeps #5 before #10 on one day.
    const lines = [
      ...group.entries.map((entry) => [
        entry.date,
        `- ${day(entry.date)}: ${link(file, entry.file, entry.title)}. Commit \`${entry.pull.merge_commit.slice(0, 7)}\`, ` +
          `PR #${entry.pull.number}, ${plain(entry.state)}.`
      ]),
      ...group.runs.map((run) => [run.date, `- ${day(run.date)}: ${link(file, run.file, `Release run ${run.version}`)}, PR #${run.pr}${run.gone ? ", no longer on GitHub" : ""}.`])
    ]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
      .map(([, line]) => line);
    if (lines.length > 0) {
      files.set(
        file,
        `# History of ${key.replace("/", "-")}\n\nBuilt by \`npm run history\`. Do not edit.\n\n${lines.join("\n")}\n` +
          // A month can hold a merge or a release run and no item that was created in it.
          (group.raw.length > 0 ? `\nThe raw copies of this month: ${link(file, `${RAW}/${key}/README.md`, "list")}.\n` : "")
      );
    }
    if (group.raw.length > 0) {
      const rawFile = `${RAW}/${key}/README.md`;
      const rawLines = group.raw.map((item) => `- ${link(rawFile, item.file, rawTitle(item))}, ${rawState(item)}`);
      files.set(rawFile, `# Raw copies of ${key.replace("/", "-")}\n\nBuilt by \`npm run history\`. Do not edit.\n\n${rawLines.join("\n")}\n`);
    }
  }

  // Decision records.
  const decisions = [];
  const numbers = new Map();
  for (const full of listFiles(path.join(root, DECISIONS))) {
    const name = path.posix.basename(full);
    const match = /^(\d{4})-.+\.md$/.exec(name);
    if (match) {
      const text = read(`${DECISIONS}/${name}`);
      const status = /^- Status: (.+)$/m.exec(text)?.[1] ?? "no status line";
      decisions.push({
        name,
        title: /^# (.+)$/m.exec(text)?.[1] ?? name,
        status: plain(status),
        date: /^- Date: (.+)$/m.exec(text)?.[1] ?? "no date line"
      });
      numbers.set(match[1], [...(numbers.get(match[1]) ?? []), name]);
    }
  }
  for (const [number, names] of numbers) {
    if (names.length > 1) {
      errors.push(`${DECISIONS}: ${names.join(" and ")} have the same number ${number}`);
    }
  }
  files.set(
    `${DECISIONS}/README.md`,
    "# Decision records\n\nBuilt by `npm run history`. Do not edit. The rules for a record are in " +
      `${link(`${DECISIONS}/README.md`, "docs/development.md", "docs/development.md")} ("History").\n\n` +
      `${decisions.map((d) => `- [${d.title}](${d.name}): ${d.status}, ${d.date}`).join("\n")}\n`
  );

  // The gap list.
  const gapsFile = `${HISTORY}/gaps.md`;
  const gaps = entries.flatMap((entry) =>
    entry.fields
      .filter(([, text]) => text.includes(NOT_RECORDED))
      .map(([name]) => `- ${link(gapsFile, entry.file, entry.title)}: ${name}`)
  );
  files.set(
    gapsFile,
    "# Gaps\n\nBuilt by `npm run history`. Do not edit. Each line is a field of an entry that says `not recorded`: " +
      `no source gives the fact yet.\n\n${gaps.length > 0 ? gaps.join("\n") : "No gaps."}\n`
  );

  // The open list and the current state.
  const live = (item) => !item.gone;
  const openIssues = issues.filter((item) => live(item) && item.state === "open").sort((a, b) => a.number - b.number);
  const openPulls = pulls.filter((item) => live(item) && item.state === "open").sort((a, b) => a.number - b.number);
  const openLine = (from, item) =>
    `- ${link(from, item.file, `#${item.number} ${item.title}`)}` +
    `${item.labels.length > 0 ? ` (${item.labels.map((name) => `\`${name}\``).join(", ")})` : ""}` +
    `${item.labels.includes("question") ? ": waits for the owner" : ""}`;
  const openFile = `${HISTORY}/open.md`;
  const openList = (from, items) => (items.length > 0 ? items.map((item) => openLine(from, item)).join("\n") : "None.");
  files.set(
    openFile,
    "# Open issues and PRs\n\nBuilt by `npm run history`. Do not edit. The state is that of the last export.\n\n" +
      `## Issues\n\n${openList(openFile, openIssues)}\n\n## PRs\n\n${openList(openFile, openPulls)}\n`
  );

  const stateFile = `${HISTORY}/current-state.md`;
  // The newest event that the raw copies hold. GitHub's own "updated" time is not used: it also
  // changes when an export PR refers to the issue, so each export would change the page again.
  const stamp =
    [...raw, ...runs]
      .flatMap((item) => [item.created_at, item.closed_at, item.merged_at, item.published_at, item.date])
      .filter(Boolean)
      .sort()
      .pop() ?? "";
  const lastRelease = releases
    .filter((item) => live(item) && !item.draft)
    .sort((a, b) => (a.published_at < b.published_at ? -1 : 1))
    .pop();
  const first = (items) =>
    `${openList(stateFile, items.slice(0, 15))}${items.length > 15 ? `\n- and ${items.length - 15} more: ${link(stateFile, openFile, "the full list")}` : ""}`;
  const recent = [...entries].reverse().slice(0, 5);
  files.set(
    stateFile,
    [
      "# Current state",
      "",
      "Built by `npm run history`. Do not edit. Read this page first, then check the files it links to: notes get old.",
      "",
      `- Newest event in the raw copies: ${stamp === "" ? "no export yet" : stamp}`,
      `- Last release: ${lastRelease ? `${link(stateFile, lastRelease.file, lastRelease.tag)}, published ${day(lastRelease.published_at)}` : "none"}`,
      `- Decision records: ${decisions.length} (${link(stateFile, `${DECISIONS}/README.md`, "list")})`,
      `- Gaps in the record: ${gaps.length} (${link(stateFile, gapsFile, "list")})`,
      `- All entries by month: ${link(stateFile, `${HISTORY}/README.md`, "index")}`,
      "",
      "## Last merged changes",
      "",
      recent.length > 0
        ? recent.map((entry) => `- ${day(entry.date)}: ${link(stateFile, entry.file, entry.title)}, ${plain(entry.state)}`).join("\n")
        : "None.",
      "",
      `## Open issues (${openIssues.length})`,
      "",
      first(openIssues),
      "",
      `## Open PRs (${openPulls.length})`,
      "",
      first(openPulls),
      ""
    ].join("\n")
  );

  const indexFile = `${HISTORY}/README.md`;
  const monthLines = [...months.keys()].sort().map((key) => {
    const group = months.get(key);
    const entryPart =
      group.entries.length + group.runs.length > 0
        ? `${link(indexFile, `${HISTORY}/${key}/README.md`, key.replace("/", "-"))}: ${group.entries.length} merged changes, ${group.runs.filter((run) => !run.gone).length} release runs`
        : `${key.replace("/", "-")}: no merged change`;
    return `- ${entryPart}${group.raw.length > 0 ? `; ${link(indexFile, `${RAW}/${key}/README.md`, `${group.raw.length} raw copies`)}` : ""}`;
  });
  files.set(
    indexFile,
    [
      "# History",
      "",
      "Built by `npm run history`. Do not edit. What this folder holds and who writes it: " +
        `${link(indexFile, "docs/development.md", "docs/development.md")} ("History").`,
      "",
      `- ${link(indexFile, stateFile, "Current state")}: where the work stands now.`,
      `- ${link(indexFile, openFile, "Open issues and PRs")}.`,
      `- ${link(indexFile, gapsFile, "Gaps")}: facts that no source gives yet.`,
      `- ${link(indexFile, `${DECISIONS}/README.md`, "Decision records")}.`,
      "",
      "## Months",
      "",
      monthLines.length > 0 ? monthLines.join("\n") : "None.",
      ""
    ].join("\n")
  );

  const remove = listFiles(path.join(root, HISTORY))
    .map((full) => posix(path.relative(root, full)))
    .filter((file) => !files.has(file) && (path.posix.basename(file) === "README.md" || movedEntries.includes(file)));
  return { files, remove, errors, entries };
}

function rawTitle(item) {
  if (item.kind === "issue") {
    return `Issue #${item.number}: ${item.title}`;
  }
  return item.kind === "pull" ? `PR #${item.number}: ${item.title}` : `Release ${item.tag}`;
}

function rawState(item) {
  if (item.gone) {
    return "no longer on GitHub";
  }
  return item.kind === "release" ? (item.draft ? "draft" : "published") : item.state;
}

// Two steps: first each changed file is written in full beside its target, then all of them
// take their names. So a write that fails leaves every old file as it was. That matters when
// entries change places: one entry's new text must not replace another entry's old text
// before that one is safe too.
//
// Between the two steps a marker file says that every pending file is complete. From then on
// the pending files are the only copy of some new text, so they are never deleted: when a
// rename fails, or the process stops, the next run finds the marker and finishes the renames.
const MARKER = `${HISTORY}/.all-pending-files-are-complete`;

function writeAll(root, files, write, rename = fs.renameSync, remove = []) {
  const pending = [];
  try {
    for (const [file, text] of files) {
      const full = path.join(root, file);
      if (!fs.existsSync(full) || fs.readFileSync(full, "utf8") !== text) {
        try {
          write(`${full}.pending`, text);
        } catch (error) {
          throw new Failure(2, `cannot write ${file}: ${error.message}`);
        }
        pending.push(full);
      }
    }
  } catch (error) {
    for (const full of pending) {
      fs.rmSync(`${full}.pending`, { force: true });
    }
    throw error;
  }
  if (pending.length === 0 && remove.length === 0) {
    return;
  }
  // The marker also holds the old paths to delete, so a later run of any command can finish.
  const marker = path.join(root, MARKER);
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, JSON.stringify(remove));
  } catch (error) {
    for (const full of pending) {
      fs.rmSync(`${full}.pending`, { force: true });
    }
    throw new Failure(2, `cannot write ${MARKER}: ${error.message}`);
  }
  finishPending(root, pending, rename);
}

// Give each complete pending file its name, delete the old paths that the marker lists, then
// remove the marker.
function finishPending(root, targets, rename = fs.renameSync) {
  for (const full of targets) {
    try {
      rename(`${full}.pending`, full);
    } catch (error) {
      throw new Failure(2, `cannot write ${posix(path.relative(root, full))}: ${error.message}. Run the command again to finish.`);
    }
  }
  const marker = path.join(root, MARKER);
  let remove = [];
  try {
    remove = JSON.parse(fs.readFileSync(marker, "utf8"));
  } catch {
    remove = [];
  }
  for (const file of Array.isArray(remove) ? remove : []) {
    // Only a file of the history folder, whatever the marker says.
    if (typeof file === "string" && file.startsWith(`${HISTORY}/`) && !file.includes("..")) {
      try {
        fs.rmSync(path.join(root, file), { force: true });
      } catch (error) {
        throw new Failure(2, `cannot delete ${file}: ${error.message}. Run the command again to finish.`);
      }
    }
  }
  fs.rmSync(marker, { force: true });
}

// The text goes to a file next to the target, which then takes the target's name. A write that
// stops half-way leaves the old file whole: an entry can hold text that no export can make again.
export function defaultWrite(full, text, writeFile = fs.writeFileSync) {
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const partial = `${full}.partial`;
  try {
    writeFile(partial, text);
    fs.renameSync(partial, full);
  } catch (error) {
    fs.rmSync(partial, { force: true });
    throw error;
  }
}

// What an earlier run left when it stopped. A `.partial` file is half-written: it goes. With the
// marker, every `.pending` file is complete and the renames are finished here. Without the
// marker the set of `.pending` files is not complete, so they go and the old files stay.
// Only the command writes in `docs/history/`. In `docs/decisions/` it writes `README.md` alone,
// so a person's own draft with such a name is left there.
function dropLeftovers(root, rename = fs.renameSync) {
  const left = [
    ...listFiles(path.join(root, HISTORY)),
    ...listFiles(path.join(root, DECISIONS)).filter((name) => /\/README\.md\.(?:partial|pending|pending\.partial)$/.test(name))
  ];
  for (const full of left.filter((name) => name.endsWith(".partial"))) {
    fs.rmSync(full, { force: true });
  }
  const pending = left.filter((name) => name.endsWith(".pending"));
  if (fs.existsSync(path.join(root, MARKER))) {
    finishPending(root, pending.map((name) => name.slice(0, -".pending".length)), rename);
  } else {
    for (const full of pending) {
      fs.rmSync(full, { force: true });
    }
  }
}

export function build(root, { write = defaultWrite, rename = fs.renameSync } = {}) {
  dropLeftovers(root, rename);
  const result = computeBuild(root);
  if (result.errors.length > 0) {
    throw new Failure(2, result.errors.join("\n"));
  }
  writeAll(root, result.files, write, rename, result.remove);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Check

function deadLinks(root, file, text) {
  const dead = [];
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (target !== "" && !/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      const full = path.join(root, path.posix.dirname(file), target);
      if (!fs.existsSync(full)) {
        dead.push(`${file}: the link to ${match[1]} points to no file`);
      }
    }
  }
  return dead;
}

// The problems that `check` reports. `gitShow(ref, file)` gives a file's text at a ref, or null;
// `changedPaths(ref)` gives the paths that differ from the ref.
export function check(root, { terms = [], exportBase = null, gitShow = null, changedPaths = null } = {}) {
  const { files, remove, errors } = computeBuild(root);
  const problems = [...errors];
  const onDisk = (file) => {
    const full = path.join(root, file);
    return fs.existsSync(full) ? fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n") : null;
  };
  for (const [file, text] of files) {
    const now = onDisk(file);
    if (now === null) {
      problems.push(`${file}: missing; run \`npm run history -- build\``);
    } else if (now !== text) {
      problems.push(`${file}: stale; run \`npm run history -- build\``);
    }
  }
  for (const file of remove) {
    problems.push(`${file}: a file that \`build\` would remove; run \`npm run history -- build\``);
  }
  const historyFiles = listFiles(path.join(root, HISTORY)).map((full) => posix(path.relative(root, full)));
  const decisionFiles = listFiles(path.join(root, DECISIONS)).map((full) => posix(path.relative(root, full)));
  for (const file of historyFiles) {
    const name = file.slice(HISTORY.length + 1);
    if (!KNOWN_NAMES.some((re) => re.test(name))) {
      problems.push(`${file}: a file name that the history folder does not use`);
    }
  }
  for (const file of [...historyFiles, ...decisionFiles]) {
    const text = onDisk(file);
    const name = file.slice(HISTORY.length + 1);
    const copied = file.startsWith(`${RAW}/`) && !file.endsWith("/README.md");
    const run = /\/release-run-[^/]+$/.test(file);
    if (!copied && !run) {
      problems.push(...deadLinks(root, file, text));
    }
    if (file.startsWith(`${HISTORY}/`) && ENTRY_NAME.test(name) && !files.has(file) && !remove.includes(file)) {
      problems.push(`${file}: an entry with no merged PR in the raw copies`);
    }
    for (const find of findSensitive(text, terms)) {
      problems.push(`${file}:${find.line}: ${find.kind}`);
    }
  }

  if (exportBase !== null) {
    // A raw copy is named by its top block, an entry by the PR in its header.
    const idOf = (text) => {
      try {
        const top = parseTop(text.replace(/\r\n/g, "\n"));
        return itemId(top);
      } catch {
        const pr = entryPull(text);
        return pr === null ? null : `entry|${pr}`;
      }
    };
    const idsOnDisk = new Set(historyFiles.map((file) => idOf(onDisk(file))).filter(Boolean));
    // The base text of each entry whose file changed, by its PR. An entry can move to a path
    // that another entry held, so the compare below goes by the PR, not by the path.
    const baseEntries = new Map();
    for (const file of changedPaths(exportBase)) {
      if (!file.startsWith(`${HISTORY}/`) && file !== `${DECISIONS}/README.md`) {
        problems.push(`${file}: changed, but an export changes only ${HISTORY}/ and ${DECISIONS}/README.md`);
        continue;
      }
      // The base text is needed for a file that is gone and for an entry; a new raw copy has none.
      const isEntry = ENTRY_NAME.test(file.slice(HISTORY.length + 1));
      const gone = onDisk(file) === null;
      const before = path.posix.basename(file) === "README.md" || (!gone && !isEntry) ? null : gitShow(exportBase, file);
      const id = before === null ? null : idOf(before);
      if (id?.startsWith("entry|")) {
        baseEntries.set(id, before);
      }
      // An export deletes a file only when its item moved to another path.
      if (before !== null && gone && (id === null || !idsOnDisk.has(id))) {
        problems.push(`${file}: deleted, but an export deletes only the old path of an item that moved`);
      } else if (before !== null && !gone && id?.startsWith("entry|") && !idsOnDisk.has(id)) {
        // The file is still there, but it now holds the entry of another PR.
        problems.push(`${file}: the entry of PR #${id.slice(6)} is gone, and its file holds another entry`);
      }
    }
    for (const file of historyFiles.filter((name) => ENTRY_NAME.test(name.slice(HISTORY.length + 1)))) {
      let head;
      try {
        head = parseEntry(onDisk(file));
      } catch {
        continue; // already in `errors`
      }
      // The base text of the same PR: from a changed path, or from this path when it did not move.
      const id = idOf(onDisk(file));
      let baseText = baseEntries.get(id) ?? null;
      if (baseText === null) {
        const same = gitShow(exportBase, file);
        baseText = same !== null && idOf(same) === id ? same : null;
      }
      let base = null;
      try {
        base = baseText === null ? null : parseEntry(baseText.replace(/\r\n/g, "\n"));
      } catch {
        base = null;
      }
      if (head.notes !== (base?.notes ?? "")) {
        problems.push(`${file}: the note lines changed by hand`);
      }
      for (const [name] of FIELDS) {
        const before = base?.fields[name];
        const byHand = !isGenerated(head.fields[name]) || (before !== undefined && !isGenerated(before));
        // A field that a person completed must stay as it is: an export may not add, change or remove one.
        if (byHand && head.fields[name] !== before) {
          problems.push(`${file}: the field "${name}" changed by hand`);
        }
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// Export

// True when the path is inside the repo and git does not ignore it.
function inRepo(root, file, git) {
  const rel = path.relative(root, path.resolve(file));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return false;
  }
  try {
    git(["check-ignore", "-q", posix(rel)]);
    return false;
  } catch {
    return true;
  }
}

// What `check` needs to compare the checkout with a ref. The compare is with the commit where
// the branch left the ref, not with the tip of the ref: a file that `main` got after that is no
// change of this branch.
function baseTools(git, ref) {
  let start;
  try {
    start = git(["merge-base", ref, "HEAD"]).trim();
  } catch (error) {
    throw new Failure(2, `git failed (merge-base ${ref} HEAD): ${String(error.stderr || error.message).trim()}`);
  }
  return {
    exportBase: start,
    gitShow: (at, file) => {
      try {
        return git(["show", `${at}:${file}`]);
      } catch {
        return null;
      }
    },
    changedPaths: (at) =>
      // No rename detection: a file that moved must show as its old path and its new path.
      [...git(["diff", "--name-only", "--no-renames", at]).split("\n"), ...git(["ls-files", "--others", "--exclude-standard"]).split("\n")].filter(
        (line) => line !== ""
      )
  };
}

// Returns the exit code. `log` gets each message.
export function exportHistory({
  root,
  gh,
  git,
  finds: findsPath = null,
  acknowledged: acknowledgedPath = null,
  terms: termsPath = null,
  exportBase = null,
  write = defaultWrite,
  rename = fs.renameSync,
  log = console.error
}) {
  try {
    for (const [name, file] of [["--finds", findsPath], ["--acknowledged", acknowledgedPath], ["--terms", termsPath]]) {
      if (file !== null && inRepo(root, file, git)) {
        throw new Failure(2, `${name} must name a file outside the repo, or one that git ignores`);
      }
    }
    let terms = [];
    let seen = new Set();
    try {
      terms = termsPath === null ? [] : readTerms(termsPath);
      if (acknowledgedPath !== null) {
        const list = JSON.parse(fs.readFileSync(acknowledgedPath, "utf8"));
        seen = new Set(list.map((find) => `${find.kind}|${find.place}|${find.sha256}`));
      }
    } catch (error) {
      throw new Failure(2, `cannot read the --terms or --acknowledged file: ${error.message}`);
    }

    const data = readGitHub({ gh, git });
    const fresh = [];
    let blocked = false;
    const clean = (text, place) => {
      const found = findSensitive(text ?? "", terms);
      for (const find of found) {
        const hash = sha256(find.value);
        const key = `${find.kind}|${place}|${hash}`;
        if (!seen.has(key)) {
          // The run table of a PR is read twice (the PR file and the release run entry).
          seen.add(key);
          fresh.push({ kind: find.kind, group: find.group, place, sha256: hash });
          blocked ||= find.group === "secret";
        }
      }
      return leaveOutEncoded(redact(text ?? "", found));
    };
    // The same replacement for text that an earlier export wrote: it lists no find, because
    // that text was checked when it was written. It applies a word that came to the list later.
    const scrub = (text) => leaveOutEncoded(redact(text, findSensitive(text, terms)));
    const refused = [];
    const files = renderRaw(data, clean, refused);

    if (fresh.length > 0) {
      const text = `${JSON.stringify(fresh, null, 2)}\n`;
      try {
        if (findsPath === null) {
          throw new Error("no --finds file was given");
        }
        write(path.resolve(findsPath), text);
        const count = (group) => fresh.filter((find) => find.group === group).length;
        log(`${fresh.length} new sensitive finds (${count("secret")} secret, ${count("private")} private): see the --finds file.`);
      } catch (error) {
        for (const find of fresh) {
          log(`find: ${find.kind} (${find.group}) at ${find.place}`);
        }
        // A public secret keeps its own exit code, so the workflow still stops and tells the owner.
        if (!blocked) {
          throw new Failure(2, `cannot write the finds file: ${error.message}. No history file was written.`);
        }
        log(`cannot write the finds file: ${error.message}`);
      }
    }
    if (blocked) {
      throw new Failure(4, "A secret is public on GitHub. No history file was written. Tell the owner now.");
    }

    dropLeftovers(root, rename);
    // Files on disk that this run did not write: a moved item is deleted, a missing one is kept.
    const ids = new Map();
    for (const [file, text] of files) {
      const top = parseTop(text);
      ids.set(itemId(top), file);
    }
    const kept = [];
    const moved = [];
    const candidates = [
      ...listFiles(path.join(root, RAW)).filter((full) => /\/(?:issue|pull|release)-[^/]+$/.test(full)),
      ...listFiles(path.join(root, HISTORY)).filter((full) => /\/release-run-[^/]+$/.test(full))
    ].map((full) => posix(path.relative(root, full)));
    const written = new Map([...files.keys()].map((file) => [file.toLowerCase(), file]));
    for (const file of candidates) {
      if (files.has(file)) {
        continue;
      }
      // Another spelling of a path that this run writes (only the case of letters differs).
      // On a disk that ignores case it is the same file, which this run writes: leave it. On a
      // disk that keeps case it is an old file that a clone on Windows could not hold beside
      // the new one: it goes.
      const alias = written.get(file.toLowerCase());
      if (alias !== undefined) {
        if (!fs.existsSync(path.join(root, alias))) {
          moved.push(file);
        }
        continue;
      }
      const text = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
      let top;
      try {
        top = parseTop(text);
      } catch (error) {
        throw new Failure(2, `${file}: ${error.message}`);
      }
      if (ids.has(itemId(top))) {
        moved.push(file);
        continue;
      }
      // A kept release whose tag holds a word that is on the list now: as for a live release.
      if (top.kind === "release" && scrub(top.tag) !== top.tag) {
        refused.push(`the kept copy of the release that was created at ${top.created_at}`);
        continue;
      }
      files.set(file, setGone(scrub(text), true));
      kept.push(file);
    }
    if (refused.length > 0) {
      refused.forEach((place) => log(`a release tag holds sensitive text: ${place}`));
      throw new Failure(
        2,
        "A release tag holds sensitive text, and a tag cannot be replaced in the copy. No history file was written. " +
          "The owner renames the tag on GitHub, or takes the word from the list."
      );
    }
    // The old path of a moved item goes only after every new file has its name.
    writeAll(root, files, write, rename, moved);
    build(root, { write, rename });

    if (exportBase !== null) {
      const base = baseTools(git, exportBase);
      const problems = [];
      for (const file of kept) {
        const before = base.gitShow(base.exportBase, file);
        // A private word that was added to the list since the base is replaced in both texts.
        if (before === null || setGone(scrub(before.replace(/\r\n/g, "\n")), false) !== setGone(files.get(file), false)) {
          problems.push(`${file}: GitHub no longer has this item, and the file differs from ${exportBase}`);
        }
      }
      problems.push(...check(root, { terms, ...base }));
      if (problems.length > 0) {
        problems.forEach((problem) => log(problem));
        throw new Failure(5, "The branch holds a change that the export did not generate.");
      }
    }
    return 0;
  } catch (error) {
    if (!(error instanceof Failure)) {
      throw error;
    }
    log(error.message);
    return error.code;
  }
}

// ---------------------------------------------------------------------------------------------
// Command line

function run(command) {
  return (args) =>
    execFileSync(command, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function main(argv) {
  const [command, ...rest] = argv;
  const options = {};
  const names = [];
  for (let index = 0; index < rest.length; index += 1) {
    const match = /^--(finds|acknowledged|terms|export-base)$/.exec(rest[index]);
    if (match) {
      index += 1;
      if (rest[index] === undefined) {
        return usage();
      }
      options[match[1]] = rest[index];
    } else if (rest[index].startsWith("--")) {
      return usage();
    } else {
      names.push(rest[index]);
    }
  }
  const root = process.cwd();
  const git = run("git");
  const termsOf = () => {
    if (options.terms === undefined) {
      return [];
    }
    if (inRepo(root, options.terms, git)) {
      throw new Failure(2, "--terms must name a file outside the repo, or one that git ignores");
    }
    try {
      return readTerms(options.terms);
    } catch (error) {
      throw new Failure(2, `cannot read the --terms file: ${error.message}`);
    }
  };
  try {
    if (command === "export" && names.length === 0) {
      return exportHistory({
        root,
        gh: run("gh"),
        git,
        finds: options.finds ?? null,
        acknowledged: options.acknowledged ?? null,
        terms: options.terms ?? null,
        exportBase: options["export-base"] ?? null
      });
    }
    if (command === "build" && rest.length === 0) {
      build(root);
      return 0;
    }
    if (command === "check" && names.length === 0 && Object.keys(options).every((key) => key === "terms")) {
      const problems = check(root, { terms: termsOf() });
      problems.forEach((problem) => console.error(problem));
      return problems.length > 0 ? 1 : 0;
    }
    if (command === "scan" && names.length > 0 && Object.keys(options).every((key) => key === "terms")) {
      const terms = termsOf();
      let found = 0;
      for (const name of names) {
        let text;
        try {
          text = fs.readFileSync(name, "utf8");
        } catch (error) {
          throw new Failure(2, `cannot read ${name}: ${error.message}`);
        }
        for (const find of findSensitive(text, terms)) {
          console.log(`${name}:${find.line}: ${find.kind}`);
          found += 1;
        }
      }
      return found > 0 ? 1 : 0;
    }
    return usage();
  } catch (error) {
    if (!(error instanceof Failure)) {
      throw error;
    }
    console.error(error.message);
    return error.code;
  }
}

function usage() {
  console.error(
    "usage: node scripts/history.mjs export [--finds <path>] [--acknowledged <path>] [--terms <path>] [--export-base <ref>]\n" +
      "       node scripts/history.mjs build\n" +
      "       node scripts/history.mjs check [--terms <path>]\n" +
      "       node scripts/history.mjs scan [--terms <path>] <file>..."
  );
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
