/// <reference types="vite/client" />

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

    transform: (input: { kind: import("./store/usePanelStore").PanelTabKind; instruction: string; content: string }) => Promise<string>;

    getProjects: (forceRefresh?: boolean) => Promise<import("./hooks/useProjects").Project[]>;
    getProject: (id: string) => Promise<import("./hooks/useProjects").Project | null>;
    getDashboard: (id: string) => Promise<import("./hooks/useProjects").Dashboard>;

    spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string; model?: string }) => Promise<import("./types/spawn.types").SpawnSession>;
    getSession: (localSessionId: string) => Promise<import("./types/spawn.types").SpawnSession | null>;
    sendInput: (localSessionId: string, text: string) => Promise<boolean>;
    killSession: (localSessionId: string) => Promise<boolean>;
    getSessions: () => Promise<import("./types/spawn.types").SpawnSession[]>;

    getRecentEvents: (limit?: number) => Promise<import("./types/events.types").LiveEvent[]>;
    getEventsByAgent: (name: string, limit?: number) => Promise<import("./types/events.types").LiveEvent[]>;

    getProjectMemory: (projectId: string) => Promise<import("./types/agent.types").MemoryFile[]>;
    updateProjectMemoryFile: (projectId: string, fileName: string, content: string) => Promise<import("./types/agent.types").MemoryFile>;
    deleteProjectMemoryFile: (projectId: string, fileName: string) => Promise<void>;

    getFavorites: (projectId: string) => Promise<import("./store/useFavoritesStore").FavoriteItem[]>;
    addFavorite: (projectId: string, type: string, name: string) => Promise<void>;
    removeFavorite: (projectId: string, type: string, name: string) => Promise<void>;

    getSessionList: (projectPath: string) => Promise<import("./types/session.types").SessionSummary[]>;
    getSessionConversation: (filePath: string) => Promise<import("./types/session.types").SessionConversation>;
    watchSessions: (projectPath: string) => Promise<void>;
    unwatchSessions: (projectPath: string) => Promise<void>;
    watchConversation: (filePath: string) => Promise<void>;
    unwatchConversation: (filePath: string) => Promise<void>;
    pinConversation: (sessionId: string) => Promise<void>;
    unpinConversation: (sessionId: string) => Promise<void>;
    archiveConversation: (sessionId: string) => Promise<void>;
    unarchiveConversation: (sessionId: string) => Promise<void>;
    softDeleteConversation: (sessionId: string) => Promise<void>;
    restoreConversation: (sessionId: string) => Promise<void>;
    setConversationTitle: (claudeSessionId: string, title: string) => Promise<void>;
    clearConversation: (claudeSessionId: string) => Promise<void>;
    onConversationAppended: (
      cb: (data: {
        filePath: string;
        messages: import("./types/session.types").SessionMessage[];
      }) => void,
    ) => () => void;
    openFilePicker: () => Promise<string[]>;
    readImageAsDataUrl: (filePath: string) => Promise<string | null>;
    getPathForFile: (file: File) => string;

    onEvent: (cb: (data: unknown) => void) => () => void;

    getSettings: (projectPath?: string) => Promise<import("./types/settings.types").SettingsSnapshot>;
    watchSettings: (projectPath?: string) => Promise<void>;
    unwatchSettings: () => Promise<void>;
    onSettingsChanged: (cb: (snapshot: import("./types/settings.types").SettingsSnapshot) => void) => () => void;

    getAgentsMirror: (projectPath?: string) => Promise<import("./types/agents-mirror.types").AgentsSnapshot>;
    watchAgents: (projectPath?: string) => Promise<void>;
    unwatchAgents: () => Promise<void>;
    onAgentsChanged: (cb: (snapshot: import("./types/agents-mirror.types").AgentsSnapshot) => void) => () => void;

    getSkill: (filePath: string) => Promise<import("./types/dashboard.types").SkillFile | null>;
    getSkillsMirror: (projectPath?: string) => Promise<import("./types/skills-mirror.types").SkillsSnapshot>;
    watchSkills: (projectPath?: string) => Promise<void>;
    unwatchSkills: () => Promise<void>;
    onSkillsChanged: (cb: (snapshot: import("./types/skills-mirror.types").SkillsSnapshot) => void) => () => void;

    getMcp: (projectPath?: string) => Promise<import("./types/mcp-mirror.types").McpSnapshot>;
    watchMcp: (projectPath?: string) => Promise<void>;
    unwatchMcp: () => Promise<void>;
    onMcpChanged: (cb: (snapshot: import("./types/mcp-mirror.types").McpSnapshot) => void) => () => void;

    getMcpRaw: (
      name: string,
      scope?: import("./types/mcp-manage.types").McpManageScope,
      projectPath?: string,
    ) => Promise<import("./types/mcp-manage.types").McpServerRaw>;
    addMcpServer: (
      input: import("./types/mcp-manage.types").McpAddInput,
    ) => Promise<import("./types/mcp-manage.types").McpMutationResult>;
    editMcpServer: (
      name: string,
      input: import("./types/mcp-manage.types").McpAddInput,
    ) => Promise<import("./types/mcp-manage.types").McpMutationResult>;
    removeMcpServer: (
      name: string,
      scope: import("./types/mcp-manage.types").McpManageScope,
      projectPath?: string,
    ) => Promise<import("./types/mcp-manage.types").McpMutationResult>;

    getMemoryMirror: (projectPath?: string) => Promise<import("./types/memory-mirror.types").MemorySnapshot>;
    watchMemory: (projectPath?: string) => Promise<void>;
    unwatchMemory: () => Promise<void>;
    onMemoryChanged: (cb: (snapshot: import("./types/memory-mirror.types").MemorySnapshot) => void) => () => void;

    locateClaudeUser: () => Promise<string | null>;
    buildUserProfile: (
      claudePath: string,
    ) => Promise<import("./types/user.types").UserProfile>;
    getUserProfile: () => Promise<import("./types/user.types").UserProfile | null>;
    saveUserProfile: (
      profile: import("./types/user.types").UserProfile,
    ) => Promise<import("./types/user.types").UserProfile>;
    completeOnboarding: () => Promise<import("./types/user.types").UserProfile>;
    resetUser: () => Promise<void>;
    scanRepos: (root?: string) => Promise<import("./types/user.types").RepoCandidate[]>;
    listFavoriteRepos: () => Promise<import("./types/user.types").FavoriteRepo[]>;
    addFavoriteRepo: (
      repoPath: string,
      label?: string,
    ) => Promise<import("./types/user.types").FavoriteRepo>;
    removeFavoriteRepo: (repoPath: string) => Promise<void>;
    openDirectoryPicker: () => Promise<string | null>;

    getOnboardingScan: (root?: string) => Promise<import("./types/onboarding.types").Candidate[]>;
    ingestScope: (
      scopePath: string,
      scope: import("./types/onboarding.types").ScopeProfile["scope"],
      plugins: string[],
    ) => Promise<import("./types/onboarding.types").ScopeProfile>;
    listProfiles: () => Promise<import("./types/onboarding.types").ScopeProfile[]>;
    getProfile: (
      scopePath: string,
    ) => Promise<import("./types/onboarding.types").ScopeProfile | null>;
    refreshProfile: (
      scopePath: string,
    ) => Promise<import("./types/onboarding.types").ScopeProfile>;

    ptyCreate: (projectPath: string, cwd: string, cols: number, rows: number) => Promise<void>;
    ptyWrite: (projectPath: string, data: string) => void;
    ptyResize: (projectPath: string, cols: number, rows: number) => void;
    ptyKill: (projectPath: string) => void;
    onPtyData: (cb: (p: { projectPath: string; data: string }) => void) => () => void;

    submitImproveRequest: (
      input: import("./types/improve.types").ImproveRequestInput,
    ) => Promise<import("./types/improve.types").ImproveRequest>;
    listImproveRequests: () => Promise<import("./types/improve.types").ImproveRequest[]>;
    getImproveRequest: (
      id: string,
    ) => Promise<import("./types/improve.types").ImproveRequest | null>;
    watchImproveInbox: () => Promise<void>;
    unwatchImproveInbox: () => Promise<void>;
    onImproveRequestChanged: (
      cb: (request: import("./types/improve.types").ImproveRequest) => void,
    ) => () => void;
  };
}
