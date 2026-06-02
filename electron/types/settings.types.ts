export const SettingsSource = {
  Managed: 'managed',
  User: 'user',
  UserLocal: 'userLocal',
  Project: 'project',
  ProjectLocal: 'projectLocal',
} as const;
export type SettingsSource = (typeof SettingsSource)[keyof typeof SettingsSource];

export interface SettingsLayer {
  source: SettingsSource;
  path: string;
  exists: boolean;
  data: Record<string, unknown> | null; // null if absent OR JSON invalid
  error?: string;                        // parse error message, if any
}

export interface SettingsSnapshot {
  projectPath: string | null;
  layers: SettingsLayer[];                      // ordered by precedence (low → high)
  effective: Record<string, unknown>;           // merged result
  provenance: Record<string, SettingsSource[]>; // top-level key → contributing sources
}
