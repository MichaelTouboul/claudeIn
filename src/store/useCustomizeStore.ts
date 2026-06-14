import { create } from "zustand";

import type { McpServerEntry } from "@/lib/types";

/**
 * The two Customize-page sections. Single source of truth for which nav item is
 * active and which content the right pane renders. Modeled as an `as const` enum
 * so a section→content `Record` maps each value to its pane (no fallback chain).
 */
export const CustomizeSection = {
  Skills: "skills",
  Connectors: "connectors",
} as const;
export type CustomizeSection = (typeof CustomizeSection)[keyof typeof CustomizeSection];

/**
 * Page-scoped selection state for the Customize page. Read by two independent
 * subtrees (the sidebar that lists servers + nav, and the content pane that
 * renders the detail), changes often (every nav/list click), and must persist
 * across child re-mounts → zustand, per the src/CLAUDE.md state decision tree.
 *
 * `repoScope` is the active favorite-repo path (project scope), or null when no
 * repo is selected (Personal/user scope only). `selectedServer` is the MCP
 * server whose detail is open in the Connectors pane, or null for the hero.
 */
type CustomizeState = {
  section: CustomizeSection;
  setSection: (section: CustomizeSection) => void;
  repoScope: string | null;
  setRepoScope: (repoPath: string | null) => void;
  selectedServer: McpServerEntry | null;
  selectServer: (server: McpServerEntry | null) => void;
  reset: () => void;
};

const INITIAL = {
  section: CustomizeSection.Connectors,
  repoScope: null,
  selectedServer: null,
} as const;

export const useCustomizeStore = create<CustomizeState>((set) => ({
  ...INITIAL,
  setSection: (section) => set({ section, selectedServer: null }),
  // Switching scope clears the open detail — a server only exists within its scope.
  setRepoScope: (repoPath) => set({ repoScope: repoPath, selectedServer: null }),
  selectServer: (server) => set({ selectedServer: server }),
  reset: () => set({ ...INITIAL }),
}));
