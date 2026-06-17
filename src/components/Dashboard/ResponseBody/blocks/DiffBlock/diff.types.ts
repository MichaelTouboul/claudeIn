/** A single line's role in a unified diff. `Hunk` is the `@@ … @@` separator row. */
export const LineKind = { Add: 'add', Del: 'del', Context: 'context', Hunk: 'hunk' } as const;
export type LineKind = (typeof LineKind)[keyof typeof LineKind];

/** One rendered line of a unified diff. */
export type DiffLine = {
  /** Stable identity for React keys (sequential within a FileDiff). */
  id: string;
  kind: LineKind;
  /** Line number in the old file, or null for added lines. */
  oldNo: number | null;
  /** Line number in the new file, or null for deleted lines. */
  newNo: number | null;
  text: string;
};

/** A parsed file edit, ready to render as a unified diff. */
export type FileDiff = {
  filePath: string;
  lines: DiffLine[];
};
