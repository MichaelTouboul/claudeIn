interface Window {
  api: {
    getAgents: () => Promise<import("./types/agent.types").AgentFile[]>;
    getAgent: (name: string) => Promise<import("./types/agent.types").AgentFile | null>;
    getFolders: () => Promise<string[]>;
    createAgent: (payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    updateAgent: (name: string, payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    deleteAgent: (name: string) => Promise<void>;
    updateMemoryFile: (agentName: string, fileName: string, content: string) => Promise<import("./types/agent.types").MemoryFile>;
    deleteMemoryFile: (agentName: string, fileName: string) => Promise<void>;

    getProjects: (forceRefresh?: boolean) => Promise<import("./hooks/useProjects").Project[]>;
    getProject: (id: string) => Promise<import("./hooks/useProjects").Project | null>;
    getDashboard: (id: string) => Promise<import("./hooks/useProjects").Dashboard>;

    getLinks: (projectId: string) => Promise<string[]>;
    linkAgent: (agentName: string, projectId: string) => Promise<void>;
    unlinkAgent: (agentName: string, projectId: string) => Promise<void>;

    spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) => Promise<import("./types/spawn.types").SpawnSession>;
    getSession: (sessionId: string) => Promise<import("./types/spawn.types").SpawnSession | null>;
    sendInput: (sessionId: string, text: string) => Promise<boolean>;
    killSession: (sessionId: string) => Promise<boolean>;
    getSessions: () => Promise<import("./types/spawn.types").SpawnSession[]>;

    getRecentEvents: (limit?: number) => Promise<import("./hooks/useIPC").LiveEvent[]>;
    getEventsByAgent: (name: string, limit?: number) => Promise<import("./hooks/useIPC").LiveEvent[]>;
    getStats: () => Promise<import("./hooks/useStats").Stats>;

    getProjectMemory: (projectId: string) => Promise<import("./types/agent.types").MemoryFile[]>;
    updateProjectMemoryFile: (projectId: string, fileName: string, content: string) => Promise<import("./types/agent.types").MemoryFile>;
    deleteProjectMemoryFile: (projectId: string, fileName: string) => Promise<void>;

    getCostsSummary: () => Promise<import("./types/costs.types").CostsSummary>;
    getCostsByDay: (days?: number) => Promise<import("./types/costs.types").CostsByDay[]>;
    getCostsByAgent: (days?: number) => Promise<import("./types/costs.types").CostsByAgent[]>;
    getCostsByAgentPerDay: (days?: number) => Promise<import("./types/costs.types").CostsByAgent[]>;
    getCostsByTool: (days?: number) => Promise<import("./types/costs.types").CostsByTool[]>;

    getFavorites: (projectId: string) => Promise<import("./hooks/useFavorites").FavoriteItem[]>;
    addFavorite: (projectId: string, type: string, name: string) => Promise<void>;
    removeFavorite: (projectId: string, type: string, name: string) => Promise<void>;

    getSessionList: (projectPath: string) => Promise<import("./hooks/useSessions").SessionSummary[]>;
    getSessionConversation: (filePath: string) => Promise<import("./hooks/useSessions").SessionConversation>;
    watchSessions: (projectPath: string) => Promise<void>;
    unwatchSessions: (projectPath: string) => Promise<void>;
    openFilePicker: () => Promise<string[]>;
    readImageAsDataUrl: (filePath: string) => Promise<string | null>;
    generateTitle: (userMessage: string, assistantMessage: string) => Promise<string>;

    onEvent: (cb: (data: unknown) => void) => () => void;
  };
}
