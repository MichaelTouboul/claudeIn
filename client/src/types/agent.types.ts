export type AgentFrontmatter = {
  name: string;
  description: string;
  model?: string;
  color?: string;
  tools?: string | string[];
  disallowedTools?: string | string[];
  maxTurns?: number;
  memory?: string;
  permissionMode?: string;
  subAgents?: string[];
  skills?: string[];
  mcpServers?: string[];
  background?: boolean;
  effort?: string;
  isolation?: string;
  initialPrompt?: string;
  hooks?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AgentFile = {
  id: string;
  filePath: string;
  relativePath: string;
  folder: string;
  frontmatter: AgentFrontmatter;
  body: string;
  status: "created" | "to_create";
  subAgents: string[];
  memoryFiles: MemoryFile[];
  annexFiles: AnnexFile[];
  scope?: "user" | "project";
  linked?: boolean;
};

export type MemoryFile = {
  name: string;
  path: string;
  content: string;
  lastModified: string;
};

export type AnnexFile = {
  name: string;
  path: string;
  content: string;
  isEnv: boolean;
};
