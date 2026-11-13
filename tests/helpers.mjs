// From tmathura/copilot-plugin-cc, which changed it from codex-plugin-cc (Apache-2.0): run() never
// uses a shell; test repositories run no background git maintenance. Changed here: only the
// helpers that this repo's tests use.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function makeTempDir(prefix = "claude-runway-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    input: options.input,
    shell: false,
    timeout: options.timeout,
    windowsHide: true
  });
}

export function initGitRepo(cwd) {
  run("git", ["init", "-b", "main"], { cwd });
  run("git", ["config", "user.name", "Runway Tests"], { cwd });
  run("git", ["config", "user.email", "tests@example.com"], { cwd });
  run("git", ["config", "commit.gpgsign", "false"], { cwd });
  run("git", ["config", "tag.gpgsign", "false"], { cwd });
  // A commit can start background maintenance, which writes in .git while a test reads it.
  run("git", ["config", "maintenance.auto", "false"], { cwd });
  run("git", ["config", "gc.auto", "0"], { cwd });
}

export function git(repo, ...args) {
  const result = run("git", args, { cwd: repo });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
