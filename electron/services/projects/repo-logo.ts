import fs from "node:fs";
import path from "node:path";

/**
 * Deterministic (no-LLM) per-repo logo detection. Bounded by construction: a
 * fixed set of search roots × asset subdirs, one `readdirSync` per existing dir,
 * NO recursive walk. Real-world logos hide in nested app dirs (a CRA `frontend`,
 * a monorepo `clients/<name>`, a `docs/brand`), so the roots include those — but
 * only ONE level into `clients`/`apps`/`packages`. Among every match under the
 * size cap the best is chosen by (name-priority, ext-priority), with root/dir
 * order breaking ties, so a real `logo.svg` wins over a `favicon.ico` fallback.
 * The winner is inlined as a base64 `data:` URL (the renderer can't read the FS).
 * No match, or only oversized matches, yields `null` → generated-avatar fallback.
 */

/** Max file size to inline as a data URL (~256KB). Larger files are skipped. */
const MAX_LOGO_BYTES = 256 * 1024;

/**
 * Static search roots (relative to the repo root), in priority order: the root
 * itself plus the conventional nested app dirs. Child dirs of
 * `clients`/`apps`/`packages` are enumerated dynamically (one level) in
 * `searchRoots` below and appended after these.
 */
const STATIC_ROOTS: readonly string[] = [
  "",
  "frontend",
  "client",
  "web",
  "www",
  "site",
  "ui",
  "app",
  "src",
];

/** Monorepo container dirs whose immediate children are enumerated as roots. */
const MONOREPO_CONTAINERS: readonly string[] = ["clients", "apps", "packages"];

/** Asset subdirs (relative to each root) searched, in priority order. */
const ASSET_DIRS: readonly string[] = [
  "",
  "public",
  "static",
  "assets",
  "src",
  path.join("src", "assets"),
  "images",
  "img",
  "docs",
  path.join("docs", "brand"),
  ".github",
  "resources",
];

/** Filename base patterns (sans extension), highest priority first. */
const BASE_NAMES: readonly string[] = [
  "logo",
  "icon",
  "favicon",
  "apple-touch-icon",
  "android-chrome",
  "og-image",
  "og_image",
];

/** Image extensions, in preference order (svg > png > ico > webp > jpg > jpeg). */
const EXTENSIONS: readonly string[] = ["svg", "png", "ico", "webp", "jpg", "jpeg"];

/** Extension → MIME type for the `data:` URL prefix. */
const MIME_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** A matched candidate plus the priority indices used to rank it. */
type Candidate = {
  absPath: string;
  ext: string;
  namePriority: number;
  extPriority: number;
  rootPriority: number;
  dirPriority: number;
};

/** True when `rel` (relative to `repoRoot`) is an existing directory. */
function isDir(repoRoot: string, rel: string): boolean {
  try {
    return fs.statSync(path.join(repoRoot, rel)).isDirectory();
  } catch {
    return false;
  }
}

/** Immediate child dir names of `container` under the repo root (empty if none). */
function childDirs(repoRoot: string, container: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(path.join(repoRoot, container), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(container, e.name));
}

/**
 * Ordered, deduped list of existing search roots: the static roots that exist,
 * then one level of children under each monorepo container.
 */
function searchRoots(repoRoot: string): string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  const add = (rel: string): void => {
    if (seen.has(rel)) return;
    if (rel !== "" && !isDir(repoRoot, rel)) return;
    seen.add(rel);
    roots.push(rel);
  };
  for (const root of STATIC_ROOTS) add(root);
  for (const container of MONOREPO_CONTAINERS) {
    for (const child of childDirs(repoRoot, container)) add(child);
  }
  return roots;
}

/**
 * Every matching candidate within a single dir's `listing`. Each base name
 * matches the base optionally followed by `[-_.0-9]…` before the extension, with
 * a boundary so `logo` matches `logo`/`logo512`/`logo-concept` but NOT `logout`.
 */
function matchInListing(listing: Map<string, string>): Candidate[] {
  const out: Candidate[] = [];
  for (let namePriority = 0; namePriority < BASE_NAMES.length; namePriority += 1) {
    const base = BASE_NAMES[namePriority];
    for (let extPriority = 0; extPriority < EXTENSIONS.length; extPriority += 1) {
      const ext = EXTENSIONS[extPriority];
      const re = new RegExp(`^${base}([-_.0-9][^.]*)?\\.${ext}$`);
      for (const [lower, actual] of listing) {
        if (re.test(lower)) {
          out.push({ absPath: actual, ext, namePriority, extPriority, rootPriority: 0, dirPriority: 0 });
        }
      }
    }
  }
  return out;
}

/**
 * Lower-cased listing of `absDir` as `lowercasedName → actualName`, so matching
 * is case-insensitive but reads the real (correctly-cased) file. Empty when
 * unreadable.
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

/** Collect every matching candidate across all roots × asset dirs. */
function collectCandidates(repoRoot: string): Candidate[] {
  const candidates: Candidate[] = [];
  const roots = searchRoots(repoRoot);
  for (let rootPriority = 0; rootPriority < roots.length; rootPriority += 1) {
    const root = roots[rootPriority];
    for (let dirPriority = 0; dirPriority < ASSET_DIRS.length; dirPriority += 1) {
      const rel = path.join(root, ASSET_DIRS[dirPriority]);
      const absDir = rel === "" ? repoRoot : path.join(repoRoot, rel);
      const listing = lowercasedListing(absDir);
      if (listing.size === 0) continue;
      for (const match of matchInListing(listing)) {
        candidates.push({
          ...match,
          absPath: path.join(absDir, match.absPath),
          rootPriority,
          dirPriority,
        });
      }
    }
  }
  return candidates;
}

/** Sort key: name, then ext, then root, then dir — all ascending (lower = better). */
function betterThan(a: Candidate, b: Candidate): number {
  return (
    a.namePriority - b.namePriority ||
    a.extPriority - b.extPriority ||
    a.rootPriority - b.rootPriority ||
    a.dirPriority - b.dirPriority
  );
}

/** Read `absPath` as a `data:` URL when it exists and is under the size cap. */
function readAsDataUrl(absPath: string, ext: string): string | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size > MAX_LOGO_BYTES) return null;

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
 * best matching file under the size cap, or `null` when none qualifies. Best is
 * decided by (name-priority, ext-priority, root order, dir order); oversized
 * candidates are skipped so a smaller lower-priority match can still win.
 */
export function detectRepoLogo(repoRoot: string): string | null {
  const ranked = collectCandidates(repoRoot).sort(betterThan);
  for (const candidate of ranked) {
    const dataUrl = readAsDataUrl(candidate.absPath, candidate.ext);
    if (dataUrl) return dataUrl;
  }
  return null;
}
