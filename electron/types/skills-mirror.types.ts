export const SkillScope = { User: "user", Project: "project" } as const;
export type SkillScope = (typeof SkillScope)[keyof typeof SkillScope];

export interface SkillSummary {
  name: string; // uniqueness key (frontmatter name || dir name)
  description: string;
  scope: SkillScope;
  filePath: string; // the SKILL.md path
  metadata?: Record<string, unknown>; // lightweight (no body/annex contents)
  lineCount: number;
  shadowed: boolean; // true when a project skill of the same name overrides it
}

export interface SkillsSnapshot {
  projectPath: string | null;
  skills: SkillSummary[]; // union of user + project, shadowing resolved/marked
}
