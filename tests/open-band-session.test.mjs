import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  openBandSession,
  pasteCommand,
  sessionEnv,
  startArgs
} from "../.claude/skills/workflow-common/open-band-session.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMON = path.join(ROOT, ".claude", "skills", "workflow-common");
const SCRIPT = path.join(COMMON, "open-band-session.mjs");
const REAL_SETTINGS = path.join(COMMON, "band-session-settings.json");
const SETTINGS = '{"enabledPlugins":{"runway@tmathura-runway":false}}';
const SETTINGS_FILE = "C:\\repo\\band-session-settings.json";

// No test opens a window: the launcher is a stand-in that says how the start ended.
function launcher(end = () => {}) {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.kill = () => {
      child.killed = true;
    };
    calls.at(-1).child = child;
    queueMicrotask(() => end(child));
    return child;
  };
  return { calls, spawn };
}

const windows = (extra = {}) => ({
  platform: "win32",
  isDirectory: () => true,
  readFile: () => SETTINGS,
  settingsFile: SETTINGS_FILE,
  env: {},
  ...extra
});

for (const [name, argv] of [
  ["no argument", []],
  ["an empty argument", [""]],
  ["two arguments", ["a", "b"]]
]) {
  test(`open-band-session rejects ${name}`, () => {
    const result = spawnSync(process.execPath, [SCRIPT, ...argv], { encoding: "utf8", timeout: 10_000, windowsHide: true });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /^usage: node open-band-session\.mjs <plugin folder>/);
  });
}

test("the settings file in the repo turns the installed mod off", () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(REAL_SETTINGS, "utf8")), JSON.parse(SETTINGS));
});

test("the start gets the settings as a file, the folder and the fixed first prompt, as an argument list", () => {
  assert.deepEqual(startArgs("C:\\repo\\settings.json", "C:\\my repo\\plugins\\runway"), [
    "/c", "start", "", "claude", "--settings", "C:\\repo\\settings.json", "--plugin-dir", "C:\\my repo\\plugins\\runway", "Say OK."
  ]);
});

test("the test session does not get the variables of the session that starts it", () => {
  assert.deepEqual(
    sessionEnv({
      PATH: "p",
      ANTHROPIC_MODEL: "m",
      CLAUDE_CONFIG_DIR: "c",
      CLAUDECODE: "1",
      CLAUDE_CODE_SESSION_ID: "s",
      CLAUDE_CODE_MESSAGING_TOKEN: "t",
      CLAUDE_EFFORT: "e",
      claude_pid: "9"
    }),
    { PATH: "p", ANTHROPIC_MODEL: "m", CLAUDE_CONFIG_DIR: "c" }
  );
});

test("a start that works gives exit 0, shows the window, leaves the session's variables behind and does not wait", async () => {
  const { calls, spawn } = launcher((child) => child.emit("exit", 0, null));
  const dir = path.resolve("my repo", "plugins", "runway");
  const result = await openBandSession({ argv: [dir], spawn, ...windows({ env: { PATH: "p", CLAUDE_CODE_SESSION_ID: "s" } }) });
  assert.equal(result.code, 0, result.message);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "cmd.exe");
  assert.deepEqual(calls[0].args, startArgs(SETTINGS_FILE, dir));
  // `start` would pass a hidden state on to the new window.
  assert.deepEqual(calls[0].options, { detached: true, stdio: "ignore", windowsHide: false, env: { PATH: "p" } });
  // Exit 0 of `start` is no proof that the session stayed open: the command to paste goes along.
  assert.match(result.message, /if no window is open, or it closed at once/);
  assert.ok(result.message.endsWith(pasteCommand(SETTINGS_FILE, dir)), result.message);
});

for (const [name, end, why] of [
  ["a spawn error", (child) => child.emit("error", new Error("spawn cmd.exe ENOENT")), /the start failed \(spawn cmd\.exe ENOENT\)/],
  ["an exit code that is not 0", (child) => child.emit("exit", 1, null), /the start ended with exit code 1/],
  ["a signal", (child) => child.emit("exit", null, "SIGTERM"), /the start ended with signal SIGTERM/]
]) {
  test(`a start that ends with ${name} gives exit 3 and the command to paste`, async () => {
    const dir = path.resolve("plugins", "runway");
    const result = await openBandSession({ argv: [dir], spawn: launcher(end).spawn, ...windows() });
    assert.equal(result.code, 3);
    assert.match(result.message, why);
    assert.ok(result.message.endsWith(pasteCommand(SETTINGS_FILE, dir)), result.message);
  });
}

test("a start that does not end, as with a dialog of Windows, is stopped and gives exit 3", async () => {
  const { calls, spawn } = launcher();
  const dir = path.resolve("plugins", "runway");
  const result = await openBandSession({ argv: [dir], spawn, ...windows({ limitMs: 20 }) });
  assert.equal(result.code, 3);
  assert.match(result.message, /the start did not end in 0\.02 seconds/);
  assert.equal(calls[0].child.killed, true);
  assert.ok(result.message.endsWith(pasteCommand(SETTINGS_FILE, dir)), result.message);
});

test("a spawn that throws gives exit 3 and the command to paste", async () => {
  const dir = path.resolve("plugins", "runway");
  const spawn = () => {
    throw new Error("no cmd");
  };
  const result = await openBandSession({ argv: [dir], spawn, ...windows() });
  assert.equal(result.code, 3);
  assert.ok(result.message.endsWith(pasteCommand(SETTINGS_FILE, dir)), result.message);
});

for (const [name, extra, why] of [
  ["another system", { platform: "linux" }, /this system is linux/],
  ["a folder that does not exist, or a file", { isDirectory: () => false }, /the plugin folder does not exist/],
  ["a settings file that is missing", { readFile: () => { throw new Error("ENOENT"); } }, /the settings file cannot be read \(ENOENT\)/],
  ["a settings file that is not JSON", { readFile: () => "not json" }, /the settings file cannot be read/],
  ["a settings file that leaves the installed mod on", { readFile: () => "{}" }, /does not turn runway@tmathura-runway off/],
  ["a settings file path that cmd cannot take", { settingsFile: "C:\\a&b\\settings.json" }, /a character that cmd reads/]
]) {
  test(`${name} starts nothing, and gives exit 3 with the command to paste`, async () => {
    const { calls, spawn } = launcher((child) => child.emit("exit", 0, null));
    const dir = path.resolve("plugins", "runway");
    const result = await openBandSession({ argv: [dir], spawn, ...windows(extra) });
    assert.equal(result.code, 3);
    assert.match(result.message, why);
    assert.equal(calls.length, 0);
    assert.ok(result.message.includes(`--plugin-dir '${dir}'`), result.message);
  });
}

for (const bad of ["a&b", "100%done", "a|b", "a^b", "a!b"]) {
  test(`a folder named ${bad} is refused, and the command to paste keeps its exact path`, async () => {
    const { calls, spawn } = launcher((child) => child.emit("exit", 0, null));
    const dir = path.resolve(bad, "plugins", "runway");
    const result = await openBandSession({ argv: [dir], spawn, ...windows() });
    assert.equal(result.code, 3);
    assert.equal(calls.length, 0);
    assert.ok(result.message.includes(`--plugin-dir '${dir}'`), result.message);
  });
}

test("the command to paste has the settings as a file, and is safe for a path with $, a backtick, a space and a quote", () => {
  assert.equal(
    pasteCommand("/repo/band-session-settings.json", "/home/me/it's $HOME `id`/plugins/runway"),
    "claude --settings '/repo/band-session-settings.json' --plugin-dir '/home/me/it'\\''s $HOME `id`/plugins/runway'"
  );
});

test("the script itself exits 3 for a folder that does not exist, on every system", () => {
  const missing = path.join(ROOT, "no-such-folder", "plugins", "runway");
  const result = spawnSync(process.execPath, [SCRIPT, missing], { encoding: "utf8", timeout: 10_000, windowsHide: true });
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /no window was opened/);
  assert.ok(result.stdout.includes(`--settings '${REAL_SETTINGS}' --plugin-dir '${missing}'`), result.stdout);
});
