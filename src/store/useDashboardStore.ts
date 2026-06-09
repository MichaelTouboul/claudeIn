import { create } from "zustand";

import type { AgentSummary } from "@/types/agents-mirror.types";
import type { HookConfig, Project } from "@/types/dashboard.types";
import type { McpServerEntry } from "@/types/mcp-mirror.types";
import type { SkillSummary } from "@/types/skills-mirror.types";

type DashboardState = {
  project: Project | null;
  agents: AgentSummary[];
  skills: SkillSummary[];
  mcp: McpServerEntry[];
  hooks: HookConfig[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
  deleteAgent: (agentName: string) => Promise<void>;
};

// Load-id guard: a newer load() supersedes an in-flight older one so a slow
// getDashboard/getMirror response can never clobber a fresher scope.
let currentLoadId = 0;

// Live-wiring lifecycle (module-scoped, single owner). The store owns the
// mirror watch + the onAgentsChanged/onSkillsChanged subscriptions; these hold
// the teardown handles + the scope we're currently subscribed to so a snapshot
// for a stale/other scope can be ignored and the previous scope torn down on a
// project switch / before re-subscribing.
let unsubscribeAgents: (() => void) | null = null;
let unsubscribeSkills: (() => void) | null = null;
let unsubscribeMcp: (() => void) | null = null;
// The snapshot.projectPath value that identifies the active scope. For the user
// project it is null (user-only mirror); for a project it is the project path.
let activeScopePath: string | null = null;

/** Stop watching + unsubscribe the current scope. Safe to call repeatedly. */
function teardownLiveWiring(): void {
  unsubscribeAgents?.();
  unsubscribeSkills?.();
  unsubscribeMcp?.();
  unsubscribeAgents = null;
  unsubscribeSkills = null;
  unsubscribeMcp = null;
  void window.api.unwatchAgents();
  void window.api.unwatchSkills();
  void window.api.unwatchMcp();
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  project: null,
  agents: [],
  skills: [],
  mcp: [],
  hooks: [],
  loading: false,

  load: async (projectId: string) => {
    const id = ++currentLoadId;
    set({ loading: true });

    // project + hooks still come from getDashboard; agents/skills now come from
    // the live mirrors (lightweight summaries).
    const data = await window.api.getDashboard(projectId);
    if (id !== currentLoadId) return; // superseded

    // The user project mirrors the user scope only (no project dir) → pass
    // undefined so the mirror's projectPath is null and we don't double-scan.
    const watchPath = data.project.id === "user" ? undefined : data.project.path;
    const scopePath = watchPath ?? null;

    const [agentsSnap, skillsSnap, mcpSnap] = await Promise.all([
      window.api.getAgentsMirror(watchPath),
      window.api.getSkillsMirror(watchPath),
      window.api.getMcp(watchPath),
    ]);
    if (id !== currentLoadId) return; // superseded

    // Switch the live wiring to this scope: tear the old one down, then watch +
    // subscribe. Snapshots for a different projectPath are ignored.
    teardownLiveWiring();
    activeScopePath = scopePath;

    unsubscribeAgents = window.api.onAgentsChanged((snapshot) => {
      if (snapshot.projectPath === activeScopePath) set({ agents: snapshot.agents });
    });
    unsubscribeSkills = window.api.onSkillsChanged((snapshot) => {
      if (snapshot.projectPath === activeScopePath) set({ skills: snapshot.skills });
    });
    unsubscribeMcp = window.api.onMcpChanged((snapshot) => {
      if (snapshot.projectPath === activeScopePath) set({ mcp: snapshot.servers });
    });
    void window.api.watchAgents(watchPath);
    void window.api.watchSkills(watchPath);
    void window.api.watchMcp(watchPath);

    set({
      project: data.project,
      agents: agentsSnap.agents,
      skills: skillsSnap.skills,
      mcp: mcpSnap.servers,
      hooks: data.hooks,
      loading: false,
    });
  },

  refresh: async () => {
    const id = get().project?.id;
    if (!id) return;
    await get().load(id);
  },

  deleteAgent: async (agentName) => {
    // Delete then let the live watcher push the refreshed agent list — no manual
    // reload needed (the mirror broadcasts agents_changed on the dir change).
    await window.api.deleteAgent(agentName);
  },
}));
