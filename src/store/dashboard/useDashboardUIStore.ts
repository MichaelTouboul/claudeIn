import { create } from "zustand";

import type { AgentScope, AgentSummary, SkillSummary  } from "@/lib/types";

/**
 * The sidebar is a two-mode panel toggled by a SegmentedControl. The active mode
 * lives in the store (not local state) because the sidebar can unmount (project
 * switch / resize teardown) and the choice must survive.
 */
export const SidebarView = {
  Sessions: "sessions",
  Library: "library",
} as const;
export type SidebarView = (typeof SidebarView)[keyof typeof SidebarView];

/** The four library categories the Library mode drills into. */
export const LibraryCategory = {
  Agents: "agents",
  Skills: "skills",
  Hooks: "hooks",
  Mcp: "mcp",
} as const;
export type LibraryCategory =
  (typeof LibraryCategory)[keyof typeof LibraryCategory];

type DashboardUIState = {
  selectedAgent: AgentSummary | null;
  selectedSkill: SkillSummary | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: AgentScope;
  // Sidebar switch: which mode is showing, and (in Library mode) which category
  // is drilled into (null = the category list). Persisted across sidebar unmount.
  sidebarView: SidebarView;
  libraryCategory: LibraryCategory | null;

  selectAgent: (a: AgentSummary) => void;
  togglePanel: (panel: string) => void;
  // Idempotently reveal a sidebar panel (vs `togglePanel`). Used by the
  // `/agents` and `/skills` view slash commands to open the screen without
  // accidentally closing an already-open panel.
  openPanel: (panel: string) => void;
  setScopeTab: (tab: AgentScope) => void;
  setSelectedAgent: (a: AgentSummary | null) => void;
  backToProject: () => void;
  // Switch the sidebar mode. Leaving Library resets the drilled-in category so
  // returning to Library always lands on the category list, not a stale drill.
  setSidebarView: (view: SidebarView) => void;
  setLibraryCategory: (category: LibraryCategory | null) => void;
};

export const useDashboardUIStore = create<DashboardUIState>((set) => ({
  selectedAgent: null,
  selectedSkill: null,
  selectedSessionId: null,
  openPanels: new Set(),
  scopeTab: "project",
  sidebarView: "sessions",
  libraryCategory: null,

  selectAgent: (a) => set({ selectedAgent: a, selectedSkill: null }),
  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.openPanels);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return { openPanels: next };
    }),
  openPanel: (panel) =>
    set((s) => {
      if (s.openPanels.has(panel)) return s;
      const next = new Set(s.openPanels);
      next.add(panel);
      return { openPanels: next };
    }),
  setScopeTab: (tab) => set({ scopeTab: tab }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  backToProject: () => set({ selectedAgent: null, selectedSkill: null }),
  setSidebarView: (view) =>
    set(view === "library" ? { sidebarView: view } : { sidebarView: view, libraryCategory: null }),
  setLibraryCategory: (libraryCategory) => set({ libraryCategory }),
}));
