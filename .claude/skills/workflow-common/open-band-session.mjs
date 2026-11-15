// Open the owner's test session for step 3 of the release run ("Release run" in REFERENCE.md).
// Usage: node open-band-session.mjs <plugin folder>
// Exit 0: a new terminal window was asked for, with the test session. That is not proof that the
//   session runs: the output also gives the command to paste, for a window that did not stay open.
// Exit 2: bad arguments (prints the usage line).
// Exit 3: no window was started (prints why, and the command for the owner to paste): not Windows,
//   the folder is missing, the settings file is wrong, a path that cmd cannot take, or a start
//   that failed or did not end in time.
//
// The session loads the mod from the folder and turns the installed mod of the same name off, so
// the band comes from that folder. Its first prompt is fixed, so that the band has values when the
// owner looks. This script never reads the session and never types in it: only the owner judges
// the band.
//
// Windows only: `cmd.exe /c start` gives the new process its own console window with the keyboard.
// A detached spawn alone gives a window that takes no input.
import fs from "node:fs";
import path from "node:path";
import { spawn as nodeSpawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const USAGE = "usage: node open-band-session.mjs <plugin folder>";
const PROMPT = "Say OK.";
const MOD = "runway@tmathura-runway";
const SETTINGS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "band-session-settings.json");
// `start` shows a dialog when it cannot find the program, and cmd then waits for a click.
const START_LIMIT_MS = 10_000;

// cmd reads these in an argument, also inside an argument list: a path with one could run a command.
const CMD_UNSAFE = /[&|<>^%!"]/;

// Single quotes are literal in bash and in PowerShell. A quote inside the text is written for bash.
const quote = (text) => `'${text.replaceAll("'", "'\\''")}'`;

// The settings go as a file path, in the window and in the command to paste: no JSON quotes pass
// through any shell, and both use the same settings.
export function pasteCommand(settingsFile, pluginDir) {
  return `claude --settings ${quote(settingsFile)} --plugin-dir ${quote(pluginDir)}`;
}

export function startArgs(settingsFile, pluginDir) {
  return ["/c", "start", "", "claude", "--settings", settingsFile, "--plugin-dir", pluginDir, PROMPT];
}

// The test session must be the owner's own, not a child of the session that runs this script: that
// session's CLAUDE variables (its id, its message socket and token) stay behind. CLAUDE_CONFIG_DIR
// is the owner's own setting and goes along.
export function sessionEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([name]) => !/^CLAUDE(CODE)?(_|$)/i.test(name) || name.toUpperCase() === "CLAUDE_CONFIG_DIR")
  );
}

function isFolder(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

export async function openBandSession({
  argv,
  platform = process.platform,
  spawn = nodeSpawn,
  isDirectory = isFolder,
  readFile = (file) => fs.readFileSync(file, "utf8"),
  settingsFile = SETTINGS_FILE,
  env = process.env,
  limitMs = START_LIMIT_MS
}) {
  if (argv.length !== 1 || argv[0] === "") {
    return { code: 2, message: USAGE };
  }

  const pluginDir = path.resolve(argv[0]);
  const paste = `in a terminal of your own (PowerShell or bash), and send one prompt:\n${pasteCommand(settingsFile, pluginDir)}`;
  const fallback = (why) => ({ code: 3, message: `no window was opened: ${why}\npaste this command ${paste}` });

  if (platform !== "win32") {
    return fallback(`this system is ${platform}, and the window is opened on Windows only`);
  }
  if (!isDirectory(pluginDir)) {
    return fallback("the plugin folder does not exist");
  }
  try {
    if (JSON.parse(readFile(settingsFile))?.enabledPlugins?.[MOD] !== false) {
      return fallback(`the settings file does not turn ${MOD} off`);
    }
  } catch (error) {
    return fallback(`the settings file cannot be read (${error.message})`);
  }
  if (CMD_UNSAFE.test(pluginDir) || CMD_UNSAFE.test(settingsFile)) {
    return fallback("a path holds a character that cmd reads as a command");
  }

  return new Promise((resolve) => {
    let child;
    let timer;
    const end = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
    try {
      // Not windowsHide: `start` would pass the hidden state on to the new window.
      child = spawn("cmd.exe", startArgs(settingsFile, pluginDir), {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
        env: sessionEnv(env)
      });
    } catch (error) {
      resolve(fallback(`the start failed (${error.message})`));
      return;
    }
    timer = setTimeout(() => {
      child.kill?.();
      end(fallback(`the start did not end in ${limitMs / 1000} seconds`));
    }, limitMs);
    child.once("error", (error) => end(fallback(`the start failed (${error.message})`)));
    // `start` does not wait for the session: this is the exit of cmd, right after it asked for the
    // window. A session that ends at once still gives 0 here, so the command to paste goes along.
    child.once("exit", (code, signal) =>
      end(
        code === 0
          ? {
              code: 0,
              message: `asked for a new window with the test session for ${pluginDir}\nif no window is open, or it closed at once, paste this command ${paste}`
            }
          : fallback(`the start ended with ${signal ? `signal ${signal}` : `exit code ${code}`}`)
      )
    );
  });
}

const entry = process.argv[1];
if (entry && fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const result = await openBandSession({ argv: process.argv.slice(2) });
  (result.code === 2 ? console.error : console.log)(result.message);
  process.exit(result.code);
}
