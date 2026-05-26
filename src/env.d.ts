interface Window {
  api: {
    getAgents: () => Promise<import("./types/agent.types").AgentFile[]>;
    getAgent: (name: string) => Promise<import("./types/agent.types").AgentFile | null>;
    getFolders: () => Promise<string[]>;
    createAgent: (payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    updateAgent: (name: string, payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    deleteAgent: (name: string) => Promise<void>;
    updateMemoryFile: (agentName: string, fileName: string, content: string) => Promise<unknown>;
    deleteMemoryFile: (agentName: string, fileName: string) => Promise<void>;

    getProjects: (forceRefresh?: boolean) => Promise<unknown[]>;
    getProject: (id: string) => Promise<unknown>;
    getDashboard: (id: string) => Promise<unknown>;

    getLinks: (projectId: string) => Promise<string[]>;
    linkAgent: (agentName: string, projectId: string) => Promise<void>;
    unlinkAgent: (agentName: string, projectId: string) => Promise<void>;

    spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) => Promise<unknown>;
    getSession: (sessionId: string) => Promise<unknown>;
    sendInput: (sessionId: string, text: string) => Promise<boolean>;
    killSession: (sessionId: string) => Promise<boolean>;
    getSessions: () => Promise<unknown[]>;

    getRecentEvents: (limit?: number) => Promise<unknown[]>;
    getEventsByAgent: (name: string, limit?: number) => Promise<unknown[]>;
    getStats: () => Promise<unknown>;

    getProjectMemory: (projectId: string) => Promise<unknown[]>;
    updateProjectMemoryFile: (projectId: string, fileName: string, content: string) => Promise<unknown>;
    deleteProjectMemoryFile: (projectId: string, fileName: string) => Promise<void>;

    getCostsSummary: () => Promise<unknown>;
    getCostsByDay: (days?: number) => Promise<unknown[]>;
    getCostsByAgent: (days?: number) => Promise<unknown[]>;
    getCostsByAgentPerDay: (days?: number) => Promise<unknown[]>;
    getCostsByTool: (days?: number) => Promise<unknown[]>;

    getFavorites: (projectId: string) => Promise<unknown[]>;
    addFavorite: (projectId: string, type: string, name: string) => Promise<void>;
    removeFavorite: (projectId: string, type: string, name: string) => Promise<void>;

    onEvent: (cb: (data: unknown) => void) => () => void;
  };
}
