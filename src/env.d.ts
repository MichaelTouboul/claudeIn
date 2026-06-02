declare module '*.css';

interface Window {
  api: {
    platform: NodeJS.Platform;
    getAgents: () => Promise<import("./types/agent.types").AgentFile[]>;
    getAgent: (name: string) => Promise<import("./types/agent.types").AgentFile | null>;
    getFolders: () => Promise<string[]>;
    createAgent: (payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    updateAgent: (name: string, payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    deleteAgent: (name: string) => Promise<void>;
    updateMemoryFile: (agentName: string, fileName: string, content: string) => Promise<import("./types/agent.types").MemoryFile>;
    deleteMemoryFile: (agentName: string, fileName: string) => Promise<void>;

    getHomeDir: () => Promise<string>;

    getProjects: (forceRefresh?: boolean) => Promise<import("./hooks/useProjects").Project[]>;
    getProject: (id: string) => Promise<import("./hooks/useProjects").Project | null>;
    getDashboard: (id: string) => Promise<import("./hooks/useProjects").Dashboard>;

    spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) => Promise<import("./types/spawn.types").SpawnSession>;
    getSession: (sessionId: string) => Promise<import("./types/spawn.types").SpawnSession | null>;
    sendInput: (sessionId: string, text: string) => Promise<boolean>;
    killSession: (sessionId: string) => Promise<boolean>;
    getSessions: () => Promise<import("./types/spawn.types").SpawnSession[]>;

    getRecentEvents: (limit?: number) => Promise<import("./types/events.types").LiveEvent[]>;
    getEventsByAgent: (name: string, limit?: number) => Promise<import("./types/events.types").LiveEvent[]>;
    getStats: () => Promise<import("./hooks/useStats").Stats>;

    getProjectMemory: (projectId: string) => Promise<import("./types/agent.types").MemoryFile[]>;
    updateProjectMemoryFile: (projectId: string, fileName: string, content: string) => Promise<import("./types/agent.types").MemoryFile>;
    deleteProjectMemoryFile: (projectId: string, fileName: string) => Promise<void>;

    getCostsSummary: () => Promise<import("./types/costs.types").CostsSummary>;
    getCostsByDay: (days?: number) => Promise<import("./types/costs.types").CostsByDay[]>;
    getCostsByAgent: (days?: number) => Promise<import("./types/costs.types").CostsByAgent[]>;
    getCostsByAgentPerDay: (days?: number) => Promise<import("./types/costs.types").CostsByAgent[]>;
    getCostsByTool: (days?: number) => Promise<import("./types/costs.types").CostsByTool[]>;

    getFavorites: (projectId: string) => Promise<import("./store/useFavoritesStore").FavoriteItem[]>;
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

    getSettings: (projectPath?: string) => Promise<import("./types/settings.types").SettingsSnapshot>;
    watchSettings: (projectPath?: string) => Promise<void>;
    unwatchSettings: () => Promise<void>;
    onSettingsChanged: (cb: (snapshot: import("./types/settings.types").SettingsSnapshot) => void) => () => void;

    getAgentsMirror: (projectPath?: string) => Promise<import("./types/agents-mirror.types").AgentsSnapshot>;
    watchAgents: (projectPath?: string) => Promise<void>;
    unwatchAgents: () => Promise<void>;
    onAgentsChanged: (cb: (snapshot: import("./types/agents-mirror.types").AgentsSnapshot) => void) => () => void;

    ptyCreate: (projectPath: string, cwd: string, cols: number, rows: number) => Promise<void>;
    ptyWrite: (projectPath: string, data: string) => void;
    ptyResize: (projectPath: string, cols: number, rows: number) => void;
    ptyKill: (projectPath: string) => void;
    onPtyData: (cb: (p: { projectPath: string; data: string }) => void) => () => void;
  };
}
