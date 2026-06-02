export const MemorySource = {
  UserClaudeMd: "user-claude-md",
  ProjectClaudeMd: "project-claude-md",
  NestedClaudeMd: "nested-claude-md",
  AutoMemory: "auto-memory",
} as const;
export type MemorySource = (typeof MemorySource)[keyof typeof MemorySource];

export type MemoryScope = "user" | "project";

export interface MemoryEntry {
  source: MemorySource;
  path: string;
  scope: MemoryScope;
  size: number; // bytes
  firstLine: string; // first non-empty line, trimmed/capped — quick title/preview
  hasImports: boolean; // contains an `@path` import line (presence only)
}

export interface MemorySnapshot {
  projectPath: string | null;
  entries: MemoryEntry[]; // ordered: user → project → nested → auto-memory; stable
}
