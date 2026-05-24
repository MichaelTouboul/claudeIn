import { pool } from "./db.js";

export async function getLinksForProject(projectId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT agent_name FROM agent_project_links WHERE project_id = $1`,
    [projectId]
  );
  return result.rows.map((r) => r.agent_name);
}

export async function linkAgent(agentName: string, projectId: string): Promise<void> {
  await pool.query(
    `INSERT INTO agent_project_links (agent_name, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [agentName, projectId]
  );
}

export async function unlinkAgent(agentName: string, projectId: string): Promise<void> {
  await pool.query(
    `DELETE FROM agent_project_links WHERE agent_name = $1 AND project_id = $2`,
    [agentName, projectId]
  );
}

export async function getProjectsForAgent(agentName: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT project_id FROM agent_project_links WHERE agent_name = $1`,
    [agentName]
  );
  return result.rows.map((r) => r.project_id);
}
