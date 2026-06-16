import fs from "node:fs";
import path from "node:path";

/**
 * Deterministic (no-LLM) primary-language detection for a repo root. Cheap by
 * construction: a single bounded `readdirSync` of the root, NO deep walk.
 *
 * Strategy, in order:
 *   1. Manifest files first — a `tsconfig.json`/`package.json`, `pyproject.toml`,
 *      `go.mod`, … pins the language with high confidence.
 *   2. Otherwise fall back to the most common known source-file extension at the
 *      repo root (ties broken by the first-seen language).
 *   3. `null` when nothing is detectable (empty repo, only docs, bad path).
 *
 * The returned string is a display language name matching the design mock's
 * `LANG_DOT` idiom (e.g. "TypeScript", "Python", "Go").
 */

/**
 * Manifest filename → language, checked in this priority order. `tsconfig.json`
 * precedes `package.json` so a TS project is recognized as TypeScript, not JS.
 */
const MANIFEST_LANGUAGE: ReadonlyArray<readonly [string, string]> = [
  ["tsconfig.json", "TypeScript"],
  ["package.json", "JavaScript"],
  ["pyproject.toml", "Python"],
  ["setup.py", "Python"],
  ["requirements.txt", "Python"],
  ["go.mod", "Go"],
  ["Cargo.toml", "Rust"],
  ["pom.xml", "Java"],
  ["build.gradle", "Java"],
  ["build.gradle.kts", "Kotlin"],
  ["Gemfile", "Ruby"],
  ["composer.json", "PHP"],
];

/** Source-file extension → language, for the fallback most-common-extension pass. */
const EXTENSION_LANGUAGE: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".cs": "C#",
  ".swift": "Swift",
};

/** Read the repo root entries, or `null` when the path is missing/unreadable. */
function readRoot(repoPath: string): fs.Dirent[] | null {
  try {
    return fs.readdirSync(repoPath, { withFileTypes: true });
  } catch {
    return null;
  }
}

/** Match a manifest file present at the root, in priority order. */
function languageFromManifest(fileNames: Set<string>): string | null {
  for (const [manifest, language] of MANIFEST_LANGUAGE) {
    if (fileNames.has(manifest)) return language;
  }
  return null;
}

/** Most common known source extension among the root files (insertion-order ties). */
function languageFromExtensions(entries: fs.Dirent[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const language = EXTENSION_LANGUAGE[path.extname(entry.name).toLowerCase()];
    if (language === undefined) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [language, count] of counts) {
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Detect the repo's primary language from its root listing: manifest files first,
 * then the most common source extension, else `null`.
 */
export function detectRepoLanguage(repoPath: string): string | null {
  const entries = readRoot(repoPath);
  if (entries === null) return null;

  const fileNames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
  return languageFromManifest(fileNames) ?? languageFromExtensions(entries);
}
