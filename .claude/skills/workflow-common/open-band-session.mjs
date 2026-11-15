// Open the owner's test session for step 3 of the release run ("Release run" in REFERENCE.md).
// Usage: node open-band-session.mjs <plugin folder>
// Exit 0: a new terminal window was started with the test session. It is not waited for.
// Exit 2: bad arguments (prints the usage line).
// Exit 3: no window was started (prints why, and the command for the owner to paste): not Windows,
//   the folder is missing, the settings file cannot be read, a path that cmd cannot take, or a
//   start that failed.
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
const SETTINGS_JSON = '{"enabledPlugins":{"runway@tmathura-runway":false}}';
const SETTINGS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "band-session-settings.json");

// cmd reads these in an argument, also inside an argument list: a path with one could run a command.
const CMD_UNSAFE = /[&|<>^%!"]/;

// Single quotes for bash: nothing inside them is expanded.
const quote = (text) => `'${text.replaceAll("'", "'\\''")}'`;

export function pasteCommand(pluginDir) {
  return `claude --settings ${quote(SETTINGS_JSON)} --plugin-dir ${quote(pluginDir)}`;
}

// The settings go as a file path, so that no JSON quotes pass through cmd.
export function startArgs(settingsFile, pluginDir) {
  return ["/c", "start", "", "claude", "--settings", settingsFile, "--plugin-dir", pluginDir, PROMPT];
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
  settingsFile = SETTINGS_FILE
}) {
  if (argv.length !== 1 || argv[0] === "") {
    return { code: 2, message: USAGE };
  }

  const pluginDir = path.resolve(argv[0]);
  const fallback = (why) => ({
    code: 3,
    message: `no window was opened: ${why}\npaste this command in a terminal of your own:\n${pasteCommand(pluginDir)}`
  });

  if (platform !== "win32") {
    return fallback(`this system is ${platform}, and the window is opened on Windows only`);
  }
  if (!isDirectory(pluginDir)) {
    return fallback("the plugin folder does not exist");
  }
  try {
    JSON.parse(readFile(settingsFile));
  } catch (error) {
    return fallback(`the settings file cannot be read (${error.message})`);
  }
  if (CMD_UNSAFE.test(pluginDir) || CMD_UNSAFE.test(settingsFile)) {
    return fallback("a path holds a character that cmd reads as a command");
  }

  return new Promise((resolve) => {
    let child;
    try {
      // Not windowsHide: `start` would pass the hidden state on to the new window.
      child = spawn("cmd.exe", startArgs(settingsFile, pluginDir), { detached: true, stdio: "ignore", windowsHide: false });
    } catch (error) {
      resolve(fallback(`the start failed (${error.message})`));
      return;
    }
    child.once("error", (error) => resolve(fallback(`the start failed (${error.message})`)));
    // `start` does not wait for the session: this is the exit of cmd, right after the window opens.
    child.once("exit", (code, signal) =>
      resolve(
        code === 0
          ? { code: 0, message: `opened a new window with the test session for ${pluginDir}` }
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
