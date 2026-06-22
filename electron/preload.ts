import { contextBridge, ipcRenderer, webUtils } from "electron";

import { createPushBus } from "./pushBus";
import type { DiffMode } from "./types/git.types";

// Single multiplexer over the one real-time IPC channel (`push-event`). Every
// `onXxx`/`onEvent` subscription below routes through `pushBus.subscribe`, so
// `IpcRenderer` holds exactly ONE `push-event` listener regardless of how many
// features subscribe — no more `MaxListenersExceededWarning`. The underlying
// `ipcRenderer.on` is attached lazily on the first subscribe.
const pushBus = createPushBus((emit) => {
  ipcRenderer.on("push-event", (_e, data: unknown) => emit(data));
});

contextBridge.exposeInMainWorld("api", {
  platform: process.platform,
  getAgents: () => ipcRenderer.invoke("agents:list"),
  getAgent: (name: string) => ipcRenderer.invoke("agents:get", name),
  getAgentByPath: (filePath: string) => ipcRenderer.invoke("agents:get-by-path", filePath),
  getFolders: () => ipcRenderer.invoke("agents:folders"),
  createAgent: (payload: unknown) => ipcRenderer.invoke("agents:create", payload),
  updateAgent: (name: string, payload: unknown) => ipcRenderer.invoke("agents:update", name, payload),
  deleteAgent: (name: string) => ipcRenderer.invoke("agents:delete", name),
  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    ipcRenderer.invoke("agents:memory:update", agentName, fileName, content),
  deleteMemoryFile: (agentName: string, fileName: string) =>
    ipcRenderer.invoke("agents:memory:delete", agentName, fileName),

  getHomeDir: () => ipcRenderer.invoke("system:home-dir"),
  openPath: (target: string) => ipcRenderer.invoke("system:open-path", target),
  getAppVersion: () => ipcRenderer.invoke("system:appVersion"),
  watchAppVersion: () => ipcRenderer.invoke("system:watch-version"),
  unwatchAppVersion: () => ipcRenderer.invoke("system:unwatch-version"),
  onVersionChanged: (cb: (version: string) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; version?: unknown };
      if (data?.type === "version_changed" && typeof data.version === "string") {
        cb(data.version);
      }
    });
  },

  transform: (input: { kind: "table" | "code" | "text"; instruction: string; content: string }) =>
    ipcRenderer.invoke("panel:transform", input),

  getProjects: (forceRefresh?: boolean) => ipcRenderer.invoke("projects:list", forceRefresh),
  getProject: (id: string) => ipcRenderer.invoke("projects:get", id),
  getDashboard: (id: string) => ipcRenderer.invoke("projects:dashboard", id),

  gitDiff: (repoPath: string, mode: DiffMode) => ipcRenderer.invoke("git:diff", repoPath, mode),

  gitBranches: (repoPath: string) => ipcRenderer.invoke("git:branches", repoPath),
  watchGitBranch: (repoPath: string) => ipcRenderer.invoke("git:watch-branch", repoPath),
  unwatchGitBranch: (repoPath: string) => ipcRenderer.invoke("git:unwatch-branch", repoPath),
  gitWorktreeStats: (repoPath: string) => ipcRenderer.invoke("git:worktree-stats", repoPath),
  gitWorktreesAllRepos: (repoPaths: string[]) =>
    ipcRenderer.invoke("git:worktrees-all-repos", repoPaths),
  gitWorktreeAdd: (repoPath: string, branch: string) =>
    ipcRenderer.invoke("git:worktree-add", repoPath, branch),
  gitWorktreeRemove: (repoPath: string, worktreeTarget: string, force: boolean) =>
    ipcRenderer.invoke("git:worktree-remove", repoPath, worktreeTarget, force),
  gitWorktreeMerge: (repoPath: string, branch: string) =>
    ipcRenderer.invoke("git:worktree-merge", repoPath, branch),

  spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string; model?: string; permission_mode?: string; think?: boolean }) =>
    ipcRenderer.invoke("spawn:start", opts),
  getSession: (localSessionId: string) => ipcRenderer.invoke("spawn:get", localSessionId),
  sendInput: (localSessionId: string, text: string) => ipcRenderer.invoke("spawn:input", localSessionId, text),
  killSession: (localSessionId: string) => ipcRenderer.invoke("spawn:kill", localSessionId),
  getSessions: () => ipcRenderer.invoke("spawn:list"),

  getRecentEvents: (limit?: number) => ipcRenderer.invoke("events:recent", limit),
  getEventsByAgent: (name: string, limit?: number) => ipcRenderer.invoke("events:by-agent", name, limit),
  getStats: () => ipcRenderer.invoke("events:stats"),

  getProjectMemory: (projectId: string) => ipcRenderer.invoke("memory:list", projectId),
  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    ipcRenderer.invoke("memory:update", projectId, fileName, content),
  deleteProjectMemoryFile: (projectId: string, fileName: string) =>
    ipcRenderer.invoke("memory:delete", projectId, fileName),

  getActivity: (days?: number) => ipcRenderer.invoke("activity:get", days),

  getFavorites: (projectId: string) => ipcRenderer.invoke("favorites:list", projectId),
  addFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:add", projectId, type, name),
  removeFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:remove", projectId, type, name),

  getSessionList: (projectPath: string) => ipcRenderer.invoke("sessions:list", projectPath),
  getSessionConversation: (filePath: string) => ipcRenderer.invoke("sessions:conversation", filePath),
  getConversationSteps: (projectPath: string, sessionId: string) =>
    ipcRenderer.invoke("sessions:steps", projectPath, sessionId),
  watchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-start", projectPath),
  unwatchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-stop", projectPath),
  watchConversation: (filePath: string) => ipcRenderer.invoke("conversation:watch", filePath),
  unwatchConversation: (filePath: string) => ipcRenderer.invoke("conversation:unwatch", filePath),
  pinConversation: (sessionId: string) => ipcRenderer.invoke("conversation:pin", sessionId),
  unpinConversation: (sessionId: string) => ipcRenderer.invoke("conversation:unpin", sessionId),
  archiveConversation: (sessionId: string) => ipcRenderer.invoke("conversation:archive", sessionId),
  unarchiveConversation: (sessionId: string) => ipcRenderer.invoke("conversation:unarchive", sessionId),
  softDeleteConversation: (sessionId: string) => ipcRenderer.invoke("conversation:softDelete", sessionId),
  restoreConversation: (sessionId: string) => ipcRenderer.invoke("conversation:restore", sessionId),
  setConversationTitle: (claudeSessionId: string, title: string) => ipcRenderer.invoke("conversation:set-title", claudeSessionId, title),
  setConversationColor: (claudeSessionId: string, color: string | null) => ipcRenderer.invoke("conversation:set-color", claudeSessionId, color),
  clearConversation: (claudeSessionId: string) => ipcRenderer.invoke("conversation:clear", claudeSessionId),
  onConversationAppended: (
    cb: (data: {
      filePath: string;
      messages: import("./types/session.types").SessionMessage[];
    }) => void,
  ) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; filePath?: string; messages?: unknown };
      if (data?.type === "conversation_appended" && typeof data.filePath === "string") {
        cb({
          filePath: data.filePath,
          messages: data.messages as import("./types/session.types").SessionMessage[],
        });
      }
    });
  },
  openFilePicker: (kind: "all" | "image" = "all") => ipcRenderer.invoke("dialog:open-file", kind),
  readImageAsDataUrl: (filePath: string) => ipcRenderer.invoke("dialog:read-image", filePath),
  saveImageFromDataUrl: (dataUrl: string) => ipcRenderer.invoke("dialog:save-image", dataUrl),
  // Resolve a dropped File's absolute path. Modern Electron strips `.path` from
  // renderer File objects, so we use the renderer-safe synchronous `webUtils`
  // helper (no IPC needed). Drag-and-drop onto the chat reuses this for the same
  // attach pipeline as the file picker.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  onEvent: (cb: (data: unknown) => void) => {
    return pushBus.subscribe(cb);
  },

  getSettings: (projectPath?: string) => ipcRenderer.invoke("settings:get", projectPath),
  watchSettings: (projectPath?: string) => ipcRenderer.invoke("settings:watch", projectPath),
  unwatchSettings: () => ipcRenderer.invoke("settings:unwatch"),

  getHooks: (projectPath?: string) => ipcRenderer.invoke("hooks:list", projectPath),
  setHookEnabled: (hookId: string, enabled: boolean, projectPath?: string) =>
    ipcRenderer.invoke("hooks:set-enabled", hookId, enabled, projectPath),
  onSettingsChanged: (cb: (snapshot: import("./types/settings.types").SettingsSnapshot) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; snapshot?: unknown };
      if (data?.type === "settings_changed" && data.snapshot) {
        cb(data.snapshot as import("./types/settings.types").SettingsSnapshot);
      }
    });
  },

  getAgentsMirror: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:get", projectPath),
  watchAgents: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:watch", projectPath),
  unwatchAgents: () => ipcRenderer.invoke("agents:mirror:unwatch"),
  onAgentsChanged: (cb: (snapshot: import("./types/agents-mirror.types").AgentsSnapshot) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; snapshot?: unknown };
      if (data?.type === "agents_changed" && data.snapshot) {
        cb(data.snapshot as import("./types/agents-mirror.types").AgentsSnapshot);
      }
    });
  },

  getSkill: (filePath: string) => ipcRenderer.invoke("skills:get", filePath),
  getSkillsMirror: (projectPath?: string) => ipcRenderer.invoke("skills:mirror:get", projectPath),
  watchSkills: (projectPath?: string) => ipcRenderer.invoke("skills:mirror:watch", projectPath),
  unwatchSkills: () => ipcRenderer.invoke("skills:mirror:unwatch"),
  onSkillsChanged: (cb: (snapshot: import("./types/skills-mirror.types").SkillsSnapshot) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; snapshot?: unknown };
      if (data?.type === "skills_changed" && data.snapshot) {
        cb(data.snapshot as import("./types/skills-mirror.types").SkillsSnapshot);
      }
    });
  },

  getMcp: (projectPath?: string) => ipcRenderer.invoke("mcp:mirror:get", projectPath),
  watchMcp: (projectPath?: string) => ipcRenderer.invoke("mcp:mirror:watch", projectPath),
  unwatchMcp: () => ipcRenderer.invoke("mcp:mirror:unwatch"),
  onMcpChanged: (cb: (snapshot: import("./types/mcp-mirror.types").McpSnapshot) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; snapshot?: unknown };
      if (data?.type === "mcp_changed" && data.snapshot) {
        cb(data.snapshot as import("./types/mcp-mirror.types").McpSnapshot);
      }
    });
  },

  getMcpRaw: (
    name: string,
    scope?: import("./types/mcp-manage.types").McpManageScope,
    projectPath?: string,
  ) => ipcRenderer.invoke("mcp:get-raw", name, scope, projectPath),
  addMcpServer: (input: import("./types/mcp-manage.types").McpAddInput) =>
    ipcRenderer.invoke("mcp:add", input),
  editMcpServer: (name: string, input: import("./types/mcp-manage.types").McpAddInput) =>
    ipcRenderer.invoke("mcp:edit", name, input),
  removeMcpServer: (
    name: string,
    scope: import("./types/mcp-manage.types").McpManageScope,
    projectPath?: string,
  ) => ipcRenderer.invoke("mcp:remove", name, scope, projectPath),

  getMemoryMirror: (projectPath?: string) => ipcRenderer.invoke("memory:mirror:get", projectPath),
  watchMemory: (projectPath?: string) => ipcRenderer.invoke("memory:mirror:watch", projectPath),
  unwatchMemory: () => ipcRenderer.invoke("memory:mirror:unwatch"),
  readMemoryFile: (filePath: string, projectPath?: string) =>
    ipcRenderer.invoke("memory:read-file", filePath, projectPath),
  writeMemoryFile: (filePath: string, content: string, projectPath?: string) =>
    ipcRenderer.invoke("memory:write-file", filePath, content, projectPath),
  onMemoryChanged: (cb: (snapshot: import("./types/memory-mirror.types").MemorySnapshot) => void) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; snapshot?: unknown };
      if (data?.type === "memory_changed" && data.snapshot) {
        cb(data.snapshot as import("./types/memory-mirror.types").MemorySnapshot);
      }
    });
  },

  locateClaudeUser: () => ipcRenderer.invoke("user:locate"),
  buildUserProfile: (claudePath: string) => ipcRenderer.invoke("user:buildProfile", claudePath),
  getUserProfile: () => ipcRenderer.invoke("user:getProfile"),
  saveUserProfile: (profile: import("../src/lib/types/user.types").UserProfile) =>
    ipcRenderer.invoke("user:saveProfile", profile),
  completeOnboarding: () => ipcRenderer.invoke("user:complete"),
  resetUser: () => ipcRenderer.invoke("user:reset"),
  scanRepos: (root?: string) => ipcRenderer.invoke("repos:scan", root),
  scanSingleRepo: (repoPath: string) => ipcRenderer.invoke("repos:scan-single", repoPath),
  listFavoriteRepos: () => ipcRenderer.invoke("favoriteRepos:list"),
  addFavoriteRepo: (repoPath: string, label?: string, logoDataUrl?: string | null) =>
    ipcRenderer.invoke("favoriteRepos:add", repoPath, label, logoDataUrl),
  removeFavoriteRepo: (repoPath: string) => ipcRenderer.invoke("favoriteRepos:remove", repoPath),
  openDirectoryPicker: () => ipcRenderer.invoke("dialog:open-directory"),

  getOnboardingScan: (root?: string) => ipcRenderer.invoke("onboarding:scan", root),
  ingestScope: (scopePath: string, scope: "user" | "project", plugins: string[]) =>
    ipcRenderer.invoke("onboarding:ingest", scopePath, scope, plugins),
  listProfiles: () => ipcRenderer.invoke("profiles:list"),
  getProfile: (scopePath: string) => ipcRenderer.invoke("profiles:get", scopePath),
  refreshProfile: (scopePath: string) => ipcRenderer.invoke("profiles:refresh", scopePath),

  ptyCreate: (projectPath: string, cwd: string, cols: number, rows: number) =>
    ipcRenderer.invoke("pty:create", projectPath, cwd, cols, rows),
  ptyWrite: (projectPath: string, data: string) => ipcRenderer.send("pty:write", projectPath, data),
  ptyResize: (projectPath: string, cols: number, rows: number) => ipcRenderer.send("pty:resize", projectPath, cols, rows),
  ptyKill: (projectPath: string) => ipcRenderer.send("pty:kill", projectPath),
  onPtyData: (cb: (p: { projectPath: string; data: string }) => void) => {
    const handler = (_e: unknown, p: { projectPath: string; data: string }) => cb(p);
    ipcRenderer.on("pty:data", handler);
    return () => { ipcRenderer.removeListener("pty:data", handler); };
  },

  // Self-Improve loop — native right-click menu (I3). The renderer asks the main
  // process to pop the native Electron menu (editing roles + a dev-only "Improve
  // this…" item) carrying the resolved component target; main replies through the
  // shared `push-event` channel when "Improve this…" is chosen.
  openContextMenu: (request: import("./types/improve.types").ContextMenuRequest) =>
    ipcRenderer.send("context-menu:open", request),
  onImproveContextMenuSelected: (
    cb: (target: import("./types/improve.types").ImproveContextTarget | null) => void,
  ) => {
    return pushBus.subscribe((raw) => {
      const data = raw as {
        type?: string;
        target?: import("./types/improve.types").ImproveContextTarget | null;
      };
      if (data?.type === "improve_context_menu_selected") {
        cb(data.target ?? null);
      }
    });
  },

  improveChat: (input: import("./services/improve/improve-chat.service").ImproveChatInput) =>
    ipcRenderer.invoke("improve:chat", input),
  submitImproveRequest: (input: import("./types/improve.types").ImproveRequestInput) =>
    ipcRenderer.invoke("improve:submit", input),
  listImproveRequests: () => ipcRenderer.invoke("improve:list"),
  getImproveRequest: (id: string) => ipcRenderer.invoke("improve:get", id),
  watchImproveInbox: () => ipcRenderer.invoke("improve:watch"),
  unwatchImproveInbox: () => ipcRenderer.invoke("improve:unwatch"),
  onImproveRequestChanged: (
    cb: (request: import("./types/improve.types").ImproveRequest) => void,
  ) => {
    return pushBus.subscribe((raw) => {
      const data = raw as { type?: string; request?: unknown };
      if (data?.type === "improve_request_changed" && data.request) {
        cb(data.request as import("./types/improve.types").ImproveRequest);
      }
    });
  },
});
