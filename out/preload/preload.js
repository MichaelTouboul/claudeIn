let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("api", {
	getAgents: () => electron.ipcRenderer.invoke("agents:list"),
	getAgent: (name) => electron.ipcRenderer.invoke("agents:get", name),
	getFolders: () => electron.ipcRenderer.invoke("agents:folders"),
	createAgent: (payload) => electron.ipcRenderer.invoke("agents:create", payload),
	updateAgent: (name, payload) => electron.ipcRenderer.invoke("agents:update", name, payload),
	deleteAgent: (name) => electron.ipcRenderer.invoke("agents:delete", name),
	updateMemoryFile: (agentName, fileName, content) => electron.ipcRenderer.invoke("agents:memory:update", agentName, fileName, content),
	deleteMemoryFile: (agentName, fileName) => electron.ipcRenderer.invoke("agents:memory:delete", agentName, fileName),
	getProjects: (forceRefresh) => electron.ipcRenderer.invoke("projects:list", forceRefresh),
	getProject: (id) => electron.ipcRenderer.invoke("projects:get", id),
	getDashboard: (id) => electron.ipcRenderer.invoke("projects:dashboard", id),
	getLinks: (projectId) => electron.ipcRenderer.invoke("links:list", projectId),
	linkAgent: (agentName, projectId) => electron.ipcRenderer.invoke("links:add", agentName, projectId),
	unlinkAgent: (agentName, projectId) => electron.ipcRenderer.invoke("links:remove", agentName, projectId),
	spawn: (opts) => electron.ipcRenderer.invoke("spawn:start", opts),
	getSession: (sessionId) => electron.ipcRenderer.invoke("spawn:get", sessionId),
	sendInput: (sessionId, text) => electron.ipcRenderer.invoke("spawn:input", sessionId, text),
	killSession: (sessionId) => electron.ipcRenderer.invoke("spawn:kill", sessionId),
	getSessions: () => electron.ipcRenderer.invoke("spawn:list"),
	getRecentEvents: (limit) => electron.ipcRenderer.invoke("events:recent", limit),
	getEventsByAgent: (name, limit) => electron.ipcRenderer.invoke("events:by-agent", name, limit),
	getStats: () => electron.ipcRenderer.invoke("events:stats"),
	getProjectMemory: (projectId) => electron.ipcRenderer.invoke("memory:list", projectId),
	updateProjectMemoryFile: (projectId, fileName, content) => electron.ipcRenderer.invoke("memory:update", projectId, fileName, content),
	deleteProjectMemoryFile: (projectId, fileName) => electron.ipcRenderer.invoke("memory:delete", projectId, fileName),
	getCostsSummary: () => electron.ipcRenderer.invoke("costs:summary"),
	getCostsByDay: (days) => electron.ipcRenderer.invoke("costs:by-day", days),
	getCostsByAgent: (days) => electron.ipcRenderer.invoke("costs:by-agent", days),
	getCostsByAgentPerDay: (days) => electron.ipcRenderer.invoke("costs:by-agent-day", days),
	getCostsByTool: (days) => electron.ipcRenderer.invoke("costs:by-tool", days),
	getFavorites: (projectId) => electron.ipcRenderer.invoke("favorites:list", projectId),
	addFavorite: (projectId, type, name) => electron.ipcRenderer.invoke("favorites:add", projectId, type, name),
	removeFavorite: (projectId, type, name) => electron.ipcRenderer.invoke("favorites:remove", projectId, type, name),
	getSessionList: (projectPath) => electron.ipcRenderer.invoke("sessions:list", projectPath),
	getSessionConversation: (filePath) => electron.ipcRenderer.invoke("sessions:conversation", filePath),
	watchSessions: (projectPath) => electron.ipcRenderer.invoke("sessions:watch-start", projectPath),
	unwatchSessions: (projectPath) => electron.ipcRenderer.invoke("sessions:watch-stop", projectPath),
	onEvent: (cb) => {
		const handler = (_e, data) => cb(data);
		electron.ipcRenderer.on("push-event", handler);
		return () => {
			electron.ipcRenderer.removeListener("push-event", handler);
		};
	}
});
//#endregion
