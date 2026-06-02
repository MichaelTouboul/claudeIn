/**
 * Pure summarization helpers for the memory mirror.
 *
 * No filesystem, no Electron imports — unit-testable in isolation (mirrors the
 * `agents.union.ts` / `settings.merge.ts` split). The mirror service reads only
 * enough of a CLAUDE.md / memory file to compute these two derived fields, so it
 * never loads heavy content into the snapshot.
 */

/** Cap for the `firstLine` preview so a single huge line can't bloat a snapshot. */
const FIRST_LINE_CAP = 200;

/**
 * First non-empty line of the text, trimmed and capped to `FIRST_LINE_CAP`
 * chars. Empty string when the text has no non-empty line.
 */
export function firstNonEmptyLine(text: string): string {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) return trimmed.slice(0, FIRST_LINE_CAP);
  }
  return "";
}

/**
 * Whether the text contains a CLAUDE.md `@import` line: a line whose first
 * non-whitespace token starts with `@` followed by a path char (presence only —
 * resolution/expansion is out of scope for v1). An `@` mid-sentence (e.g. an
 * email) does not count; the import directive must lead the line.
 */
export function detectImports(text: string): boolean {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (/^@[^\s]/.test(trimmed)) return true;
  }
  return false;
}
