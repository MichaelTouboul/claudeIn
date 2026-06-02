import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  platform: process.platform,
  getAgents: () => ipcRenderer.invoke("agents:list"),
  getAgent: (name: string) => ipcRenderer.invoke("agents:get", name),
  getFolders: () => ipcRenderer.invoke("agents:folders"),
  createAgent: (payload: unknown) => ipcRenderer.invoke("agents:create", payload),
  updateAgent: (name: string, payload: unknown) => ipcRenderer.invoke("agents:update", name, payload),
  deleteAgent: (name: string) => ipcRenderer.invoke("agents:delete", name),
  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    ipcRenderer.invoke("agents:memory:update", agentName, fileName, content),
  deleteMemoryFile: (agentName: string, fileName: string) =>
    ipcRenderer.invoke("agents:memory:delete", agentName, fileName),

  getHomeDir: () => ipcRenderer.invoke("system:home-dir"),

  getProjects: (forceRefresh?: boolean) => ipcRenderer.invoke("projects:list", forceRefresh),
  getProject: (id: string) => ipcRenderer.invoke("projects:get", id),
  getDashboard: (id: string) => ipcRenderer.invoke("projects:dashboard", id),

  spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) =>
    ipcRenderer.invoke("spawn:start", opts),
  getSession: (sessionId: string) => ipcRenderer.invoke("spawn:get", sessionId),
  sendInput: (sessionId: string, text: string) => ipcRenderer.invoke("spawn:input", sessionId, text),
  killSession: (sessionId: string) => ipcRenderer.invoke("spawn:kill", sessionId),
  getSessions: () => ipcRenderer.invoke("spawn:list"),

  getRecentEvents: (limit?: number) => ipcRenderer.invoke("events:recent", limit),
  getEventsByAgent: (name: string, limit?: number) => ipcRenderer.invoke("events:by-agent", name, limit),
  getStats: () => ipcRenderer.invoke("events:stats"),

  getProjectMemory: (projectId: string) => ipcRenderer.invoke("memory:list", projectId),
  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    ipcRenderer.invoke("memory:update", projectId, fileName, content),
  deleteProjectMemoryFile: (projectId: string, fileName: string) =>
    ipcRenderer.invoke("memory:delete", projectId, fileName),

  getCostsSummary: () => ipcRenderer.invoke("costs:summary"),
  getCostsByDay: (days?: number) => ipcRenderer.invoke("costs:by-day", days),
  getCostsByAgent: (days?: number) => ipcRenderer.invoke("costs:by-agent", days),
  getCostsByAgentPerDay: (days?: number) => ipcRenderer.invoke("costs:by-agent-day", days),
  getCostsByTool: (days?: number) => ipcRenderer.invoke("costs:by-tool", days),
  getCostsByModel: (days?: number) => ipcRenderer.invoke("costs:by-model", days),

  getFavorites: (projectId: string) => ipcRenderer.invoke("favorites:list", projectId),
  addFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:add", projectId, type, name),
  removeFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:remove", projectId, type, name),

  getSessionList: (projectPath: string) => ipcRenderer.invoke("sessions:list", projectPath),
  getSessionConversation: (filePath: string) => ipcRenderer.invoke("sessions:conversation", filePath),
  watchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-start", projectPath),
  unwatchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-stop", projectPath),
  openFilePicker: () => ipcRenderer.invoke("dialog:open-file"),
  readImageAsDataUrl: (filePath: string) => ipcRenderer.invoke("dialog:read-image", filePath),
  generateTitle: (userMessage: string, assistantMessage: string) =>
    ipcRenderer.invoke("dialog:generate-title", userMessage, assistantMessage),

  onEvent: (cb: (data: unknown) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data);
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },

  getSettings: (projectPath?: string) => ipcRenderer.invoke("settings:get", projectPath),
  watchSettings: (projectPath?: string) => ipcRenderer.invoke("settings:watch", projectPath),
  unwatchSettings: () => ipcRenderer.invoke("settings:unwatch"),
  onSettingsChanged: (cb: (snapshot: import("../src/types/settings.types").SettingsSnapshot) => void) => {
    const handler = (_e: unknown, data: { type?: string; snapshot?: unknown }) => {
      if (data?.type === "settings_changed" && data.snapshot) {
        cb(data.snapshot as import("../src/types/settings.types").SettingsSnapshot);
      }
    };
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },

  getAgentsMirror: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:get", projectPath),
  watchAgents: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:watch", projectPath),
  unwatchAgents: () => ipcRenderer.invoke("agents:mirror:unwatch"),
  onAgentsChanged: (cb: (snapshot: import("../src/types/agents-mirror.types").AgentsSnapshot) => void) => {
    const handler = (_e: unknown, data: { type?: string; snapshot?: unknown }) => {
      if (data?.type === "agents_changed" && data.snapshot) {
        cb(data.snapshot as import("../src/types/agents-mirror.types").AgentsSnapshot);
      }
    };
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },

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
});
