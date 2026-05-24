import { pool } from "./db.js";

export async function createMission(agentName: string, title: string, sessionId?: string) {
  const result = await pool.query(
    `INSERT INTO missions (agent_name, title, session_id) VALUES ($1, $2, $3) RETURNING *`,
    [agentName, title, sessionId || null]
  );
  return result.rows[0];
}

export async function getMissions(limit = 50, status?: string) {
  if (status) {
    const result = await pool.query(
      `SELECT * FROM missions WHERE status = $1 ORDER BY started_at DESC LIMIT $2`,
      [status, limit]
    );
    return result.rows;
  }
  const result = await pool.query(
    `SELECT * FROM missions ORDER BY started_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getMission(id: number) {
  const result = await pool.query(`SELECT * FROM missions WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function getMissionEvents(id: number) {
  const mission = await getMission(id);
  if (!mission?.session_id) return [];
  const result = await pool.query(
    `SELECT * FROM events WHERE session_id = $1 ORDER BY created_at ASC`,
    [mission.session_id]
  );
  return result.rows;
}

export async function failMission(sessionId: string) {
  await pool.query(
    `UPDATE missions SET status = 'failed', finished_at = NOW() WHERE session_id = $1 AND status = 'running'`,
    [sessionId]
  );
}
