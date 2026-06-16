import fs from "fs";
import path from "path";

import { broadcast } from "../core/broadcast";
import { FALLBACK_VERSION, getAppVersion, getPackageJsonPath } from "./system.service";

/**
 * Self-detected version bumps. Every `land.sh` landing rewrites `package.json`'s
 * `version`; this watcher tails that exact file (the one `getAppVersion()` reads,
 * so dev/bundled/tests behave identically) and broadcasts `version_changed` the
 * moment the value differs from the last-seen version — no signal from land.sh /
 * the dev-loop required.
 *
 * Mirrors `improve-inbox.service`'s watcher shape: a single re-entrant `fs.watch`,
 * a re-read on every event, a diff-guard so a same-version write never
 * re-broadcasts, and a try/catch that never throws (watching is best-effort).
 * We watch the package.json's *directory* and filter by filename — more reliable
 * on macOS than watching the file inode directly (editors/`land.sh` replace it).
 */

const CHANGE_EVENT = "version_changed";

let watcher: fs.FSWatcher | null = null;
let lastSeen: string | null = null;

/** Re-read the version; broadcast only when it actually changed (diff guard). */
function emitIfChanged(): void {
  const version = getAppVersion();
  // A write isn't atomic (`land.sh` truncates then writes); a watch event can
  // fire mid-write when the file is empty/partial → fallback. Treat that as a
  // transient, not a real bump, so we never emit a spurious "0.0.0".
  if (version === FALLBACK_VERSION) return;
  if (version === lastSeen) return; // no-op write / unrelated dir event → skip
  lastSeen = version;
  broadcast({ type: CHANGE_EVENT, version });
}

/**
 * Watch the app's package.json for version bumps and broadcast `version_changed`
 * on each genuine change. Re-entrant: a second call replaces any existing watch.
 * Never throws — if the file can't be located or watched, it silently no-ops.
 */
export async function watchAppVersion(): Promise<void> {
  unwatchAppVersion();
  lastSeen = getAppVersion(); // seed so the initial state never broadcasts

  const file = getPackageJsonPath();
  if (!file) return;

  const dir = path.dirname(file);
  const base = path.basename(file);
  try {
    watcher = fs.watch(dir, (_event, filename) => {
      if (filename && filename !== base) return;
      emitIfChanged();
    });
  } catch {
    // Watching can fail (perms, transient); skip rather than throw.
    watcher = null;
  }
}

/** Stop watching the app's package.json. */
export function unwatchAppVersion(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
