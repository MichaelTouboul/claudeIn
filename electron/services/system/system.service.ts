import { shell } from "electron";
import fs from "fs";
import os from "os";
import path from "path";

export function getHomeDir(): string {
  return os.homedir();
}

/**
 * Open a file/folder with the OS default application. Returns the empty string
 * on success, or a non-empty error message when the path can't be opened
 * (missing file, invalid path, no associated app) — the renderer surfaces it.
 */
export async function openPath(target: string): Promise<string> {
  if (!target) return "No path provided.";
  if (!fs.existsSync(target)) return `File not found: ${target}`;
  return shell.openPath(target);
}

/** Semver used when the app's package.json cannot be located/parsed. */
export const FALLBACK_VERSION = "0.0.0";

/** Read the `version` field of a package.json file; `0.0.0` if missing/invalid. */
export function readVersionFromPackageJson(file: string): string {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

/**
 * Candidate locations of the app's package.json, in priority order. The bundled
 * main process runs from `out/main`, so we also walk up from `__dirname`; in
 * dev/tests the repo root is `process.cwd()`.
 */
function packageJsonCandidates(): string[] {
  const candidates = [path.join(process.cwd(), "package.json")];
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    candidates.push(path.join(dir, "package.json"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return candidates;
}

/**
 * The absolute path of the app's package.json actually used to source the
 * version — the first candidate that exists AND yields a real (non-fallback)
 * version. `null` when none qualifies. The version watcher (`version.watch.ts`)
 * watches exactly this file so dev, bundled app, and tests stay in lockstep.
 */
export function getPackageJsonPath(): string | null {
  for (const file of packageJsonCandidates()) {
    if (!fs.existsSync(file)) continue;
    if (readVersionFromPackageJson(file) !== FALLBACK_VERSION) return file;
  }
  return null;
}

/**
 * The current app version, sourced from package.json's `version`. Read from the
 * file (not `app.getVersion()`) so it works identically in the main process,
 * the bundled app, and node tests — no Electron coupling.
 */
export function getAppVersion(): string {
  const file = getPackageJsonPath();
  return file ? readVersionFromPackageJson(file) : FALLBACK_VERSION;
}
