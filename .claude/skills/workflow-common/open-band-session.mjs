// Open the owner's test session for step 3 of the release run ("Release run" in REFERENCE.md).
// Usage: node open-band-session.mjs [--print] <plugin folder>
// Exit 0: a new terminal window was asked for, with the test session. That is not proof that the
//   session runs: the output also gives the command to paste, for a window that did not stay open.
//   With --print: nothing is opened, and the output is only the command to paste.
// Exit 2: bad arguments (prints the usage line).
// Exit 3: no window, or no sign of one in time (prints why, and the command for the owner to
//   paste): not Windows, the folder is missing, a path that cmd cannot take, or a start that
//   failed or did not end in time. For a settings file that is wrong it prints no command, also
//   with --print: the command needs that file.
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

const USAGE = "usage: node open-band-session.mjs [--print] <plugin folder>";
const PROMPT = "Say OK.";
const MOD = "runway@tmathura-runway";
const SETTINGS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "band-session-settings.json");
// `start` shows a dialog when it cannot find the program, and cmd then waits for a click.
const START_LIMIT_MS = 10_000;

// cmd reads these in an argument, also inside an argument list: a path with one could run a command.
const CMD_UNSAFE = /[&|<>^%!"]/;

// Single quotes are literal in bash and in PowerShell. Only a quote inside the text differs:
// bash ends the string for it, PowerShell doubles it.
const command = (settingsFile, pluginDir, inner) =>
  `claude --settings '${settingsFile.replaceAll("'", inner)}' --plugin-dir '${pluginDir.replaceAll("'", inner)}' '${PROMPT}'`;

// The settings go as a file path, in the window and in the command to paste: no JSON quotes pass
// through any shell, and both use the same settings. One line serves both shells, unless a path
// holds a quote: then each shell gets its own line. The first prompt goes along, as in the window.
export function pasteCommand(settingsFile, pluginDir) {
  const bash = command(settingsFile, pluginDir, "'\\''");
  const powershell = command(settingsFile, pluginDir, "''");
  return bash === powershell ? bash : `bash:       ${bash}\nPowerShell: ${powershell}`;
}

export function startArgs(settingsFile, pluginDir) {
  return ["/c", "start", "", "claude", "--settings", settingsFile, "--plugin-dir", pluginDir, PROMPT];
}

// What Claude Code sets today for the session that runs this script (seen in such a session; a
// later version can add more, which would then go along). The test session must be the owner's
// own, not a child of that session, so these stay behind. Every other variable goes along, also
// the owner's own CLAUDE_ settings, such as the config folder or the provider.
const SESSION_ONLY = new Set([
  "CLAUDECODE",
  "CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_HOST_SHORT_TEMP_DIRS",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_EFFORT",
  "CLAUDE_JOB_DIR",
  "CLAUDE_PID",
  "CLAUDE_PLUGIN_DATA"
]);

export function sessionEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !SESSION_ONLY.has(name.toUpperCase())));
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
  limitMs = START_LIMIT_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout
}) {
  const isPrint = argv[0] === "--print";
  const rest = isPrint ? argv.slice(1) : argv;
  if (rest.length !== 1 || rest[0] === "" || rest[0].startsWith("--")) {
    return { code: 2, message: USAGE };
  }

  const pluginDir = path.resolve(rest[0]);
  // First of all: the command to paste needs the same file, so with a wrong file there is none.
  const noSettings = (why) => ({ code: 3, message: `no window was opened: ${why}\nrestore ${settingsFile} from git` });
  try {
    if (JSON.parse(readFile(settingsFile))?.enabledPlugins?.[MOD] !== false) {
      return noSettings(`the settings file does not turn ${MOD} off`);
    }
  } catch (error) {
    return noSettings(`the settings file cannot be read (${error.message})`);
  }

  if (isPrint) {
    return { code: 0, message: pasteCommand(settingsFile, pluginDir) };
  }

  const paste = `in a terminal of your own (PowerShell or bash):\n${pasteCommand(settingsFile, pluginDir)}`;
  const fallback = (why) => ({ code: 3, message: `no window was opened: ${why}\npaste this command ${paste}` });

  if (platform !== "win32") {
    return fallback(`this system is ${platform}, and the window is opened on Windows only`);
  }
  if (!isDirectory(pluginDir)) {
    return fallback("the plugin folder does not exist");
  }
  if (CMD_UNSAFE.test(pluginDir) || CMD_UNSAFE.test(settingsFile)) {
    return fallback("a path holds a character that cmd reads as a command");
  }

  return new Promise((resolve) => {
    let child;
    let timer;
    const end = (result) => {
      clearTimer(timer);
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
    timer = setTimer(() => {
      child.kill();
      // A slow start can still bring a window: do not say that there is none.
      end({
        code: 3,
        message: `the start did not end in ${limitMs / 1000} seconds, so a window may still open
if none does, paste this command ${paste}`
      });
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
