import fs from "fs";
import os from "os";
import path from "path";

export function getHomeDir(): string {
  return os.homedir();
}

/** Semver used when the app's package.json cannot be located/parsed. */
const FALLBACK_VERSION = "0.0.0";

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
 * The current app version, sourced from package.json's `version`. Read from the
 * file (not `app.getVersion()`) so it works identically in the main process,
 * the bundled app, and node tests — no Electron coupling.
 */
export function getAppVersion(): string {
  for (const file of packageJsonCandidates()) {
    if (!fs.existsSync(file)) continue;
    const version = readVersionFromPackageJson(file);
    if (version !== FALLBACK_VERSION) return version;
  }
  return FALLBACK_VERSION;
}
