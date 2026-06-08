/** A single line's role in a unified diff. */
export const LineKind = { Add: 'add', Del: 'del', Context: 'context' } as const;
export type LineKind = (typeof LineKind)[keyof typeof LineKind];

/** One rendered line of a unified diff. */
export type DiffLine = {
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
