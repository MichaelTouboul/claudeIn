import type { AgentFile } from "../types/agent.types";

const BASE = "/api/agents";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getAgents: () => request<AgentFile[]>(BASE),
  getAgent: (name: string) => request<AgentFile>(`${BASE}/${name}`),
  getFolders: () => request<string[]>(`${BASE}/folders`),

  createAgent: (payload: {
    folder: string;
    fileName: string;
    frontmatter: Record<string, unknown>;
    body: string;
  }) => request<AgentFile>(BASE, { method: "POST", body: JSON.stringify(payload) }),

  updateAgent: (name: string, payload: { frontmatter?: Record<string, unknown>; body?: string }) =>
    request<AgentFile>(`${BASE}/${name}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteAgent: (name: string) =>
    request<void>(`${BASE}/${name}`, { method: "DELETE" }),

  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    request(`${BASE}/${agentName}/memory/${fileName}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  deleteMemoryFile: (agentName: string, fileName: string) =>
    request<void>(`${BASE}/${agentName}/memory/${fileName}`, { method: "DELETE" }),

  getProjectMemory: (projectId: string) =>
    request<Array<{ name: string; path: string; content: string; lastModified: string; lines: number; bytes: number }>>(`/api/memory/${projectId}`),

  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    request(`/api/memory/${projectId}/${fileName}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  deleteProjectMemoryFile: (projectId: string, fileName: string) =>
    request<void>(`/api/memory/${projectId}/${fileName}`, { method: "DELETE" }),
};
