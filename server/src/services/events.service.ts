import { pool } from "./db.js";
import { broadcast } from "./sse.js";

type HookEvent = {
  agent_name: string;
  session_id?: string;
  event_type: string;
  tool_name?: string;
  payload?: Record<string, unknown>;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
};

export async function ingestEvent(event: HookEvent) {
  const result = await pool.query(
    `INSERT INTO events (agent_name, session_id, event_type, tool_name, payload, tokens_in, tokens_out, cost_usd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      event.agent_name,
      event.session_id || null,
      event.event_type,
      event.tool_name || null,
      JSON.stringify(event.payload || {}),
      event.tokens_in || 0,
      event.tokens_out || 0,
      event.cost_usd || 0,
    ]
  );

  const stored = result.rows[0];

  if (event.session_id) {
    await pool.query(
      `UPDATE missions SET
        tokens_in_total = tokens_in_total + $1,
        tokens_out_total = tokens_out_total + $2,
        cost_usd_total = cost_usd_total + $3,
        events_count = events_count + 1
       WHERE session_id = $4`,
      [event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0, event.session_id]
    );
  }

  if (event.event_type === "Stop" && event.session_id) {
    await pool.query(
      `UPDATE missions SET status = 'done', finished_at = NOW() WHERE session_id = $1 AND status = 'running'`,
      [event.session_id]
    );
  }

  broadcast({
    type: "event",
    ...stored,
  });

  return stored;
}

export async function getRecentEvents(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM events ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getEventsByAgent(agentName: string, limit = 50) {
  const result = await pool.query(
    `SELECT * FROM events WHERE agent_name = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentName, limit]
  );
  return result.rows;
}

export async function getStats() {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT session_id) FILTER (WHERE event_type != 'Stop') AS active_sessions,
      COUNT(*) AS total_events,
      COALESCE(SUM(tokens_in), 0) AS total_tokens_in,
      COALESCE(SUM(tokens_out), 0) AS total_tokens_out,
      COALESCE(SUM(cost_usd), 0) AS total_cost,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS events_today,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) AS cost_today
    FROM events
  `);
  return result.rows[0];
}

export async function getStatsPerAgent() {
  const result = await pool.query(`
    SELECT
      agent_name,
      COUNT(*) AS events_count,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      MAX(created_at) AS last_active
    FROM events
    GROUP BY agent_name
    ORDER BY cost_usd DESC
  `);
  return result.rows;
}
