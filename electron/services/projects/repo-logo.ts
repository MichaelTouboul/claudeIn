import fs from "node:fs";
import path from "node:path";

/**
 * Deterministic (no-LLM) per-repo logo detection. Looks for a small set of
 * conventional logo/icon files in the repo root and a shallow list of common
 * asset directories — no recursive walk. The first match under the size cap is
 * read and returned as a base64 `data:` URL so the renderer (which cannot read
 * arbitrary FS paths) can render it directly. Anything larger than the cap, or
 * no match at all, yields `null` and the UI falls back to a generated avatar.
 */

/** Max file size to inline as a data URL (~256KB). Larger files are skipped. */
const MAX_LOGO_BYTES = 256 * 1024;

/** Directories searched (relative to the repo root), in priority order. */
const SEARCH_DIRS: readonly string[] = [
  "",
  "assets",
  "public",
  "static",
  "images",
  "img",
  "docs",
  ".github",
  path.join("src", "assets"),
  "resources",
];

/** Base filenames (sans extension) searched within each dir. */
const BASE_NAMES: readonly string[] = ["logo", "icon"];

/** Image extensions searched, in priority order. */
const EXTENSIONS: readonly string[] = ["svg", "png", "jpg", "jpeg", "webp"];

/** Extension → MIME type for the `data:` URL prefix. */
const MIME_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Wanted base names per dir; `favicon` only applies to the `public` dir. */
function wantedNames(dir: string): string[] {
  return dir === "public" ? [...BASE_NAMES, "favicon"] : [...BASE_NAMES];
}

/**
 * List a directory's files lower-cased once, returning a map of
 * `lowercasedName → actualName` so matching is case-insensitive but we still
 * read the real (correctly-cased) file. Returns an empty map when unreadable.
 */
function lowercasedListing(absDir: string): Map<string, string> {
  const map = new Map<string, string>();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return map;
  }
  for (const entry of entries) {
    if (entry.isFile()) map.set(entry.name.toLowerCase(), entry.name);
  }
  return map;
}

/** Build the ordered list of candidate absolute file paths for a repo root. */
function candidateFiles(repoRoot: string): string[] {
  const files: string[] = [];
  for (const dir of SEARCH_DIRS) {
    const absDir = dir === "" ? repoRoot : path.join(repoRoot, dir);
    const listing = lowercasedListing(absDir);
    if (listing.size === 0) continue;
    for (const name of wantedNames(dir)) {
      for (const ext of EXTENSIONS) {
        // favicon is only meaningful as svg/png per the heuristic.
        if (name === "favicon" && ext !== "svg" && ext !== "png") continue;
        const actual = listing.get(`${name}.${ext}`);
        if (actual) files.push(path.join(absDir, actual));
      }
    }
  }
  return files;
}

/** Read a file as a `data:` URL when it exists and is under the size cap. */
function readAsDataUrl(absPath: string): string | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size > MAX_LOGO_BYTES) return null;

  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;

  try {
    const base64 = fs.readFileSync(absPath).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Detect a logo for the repo at `repoRoot`. Returns a base64 `data:` URL for the
 * first matching file under the size cap, or `null` when none is found. Matching
 * is case-insensitive on the base name (`logo`/`icon`/`favicon`) but uses exact
 * extensions; only the shallow `SEARCH_DIRS` are inspected.
 */
export function detectRepoLogo(repoRoot: string): string | null {
  for (const candidate of candidateFiles(repoRoot)) {
    const dataUrl = readAsDataUrl(candidate);
    if (dataUrl) return dataUrl;
  }
  return null;
}
