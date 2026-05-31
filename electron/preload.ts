import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
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

  onEvent: (cb: (data: unknown) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data);
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },
});
