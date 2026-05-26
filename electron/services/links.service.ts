import { getDb } from "./db";

export function getLinksForProject(projectId: string): string[] {
  const rows = getDb()
    .prepare("SELECT agent_name FROM agent_project_links WHERE project_id = ?")
    .all(projectId) as { agent_name: string }[];
  return rows.map((r) => r.agent_name);
}

export function linkAgent(agentName: string, projectId: string): void {
  getDb()
    .prepare(
      "INSERT INTO agent_project_links (agent_name, project_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
    )
    .run(agentName, projectId);
}

export function unlinkAgent(agentName: string, projectId: string): void {
  getDb()
    .prepare(
      "DELETE FROM agent_project_links WHERE agent_name = ? AND project_id = ?"
    )
    .run(agentName, projectId);
}

export function getProjectsForAgent(agentName: string): string[] {
  const rows = getDb()
    .prepare("SELECT project_id FROM agent_project_links WHERE agent_name = ?")
    .all(agentName) as { project_id: string }[];
  return rows.map((r) => r.project_id);
}
