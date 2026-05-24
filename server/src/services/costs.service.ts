import { pool } from "./db.js";

export async function getCostsByDay(days = 30) {
  const result = await pool.query(
    `SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count
    FROM events
    WHERE created_at > NOW() - INTERVAL '1 day' * $1
    GROUP BY DATE(created_at)
    ORDER BY day ASC`,
    [days]
  );
  return result.rows;
}

export async function getCostsByAgent(days = 30) {
  const result = await pool.query(
    `SELECT
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count,
      COUNT(DISTINCT DATE(created_at)) AS active_days,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM events
    WHERE created_at > NOW() - INTERVAL '1 day' * $1
    GROUP BY agent_name
    ORDER BY cost_usd DESC`,
    [days]
  );
  return result.rows;
}

export async function getCostsByAgentPerDay(days = 30) {
  const result = await pool.query(
    `SELECT
      DATE(created_at) AS day,
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM events
    WHERE created_at > NOW() - INTERVAL '1 day' * $1
    GROUP BY DATE(created_at), agent_name
    ORDER BY day ASC, cost_usd DESC`,
    [days]
  );
  return result.rows;
}

export async function getCostsByTool(days = 30) {
  const result = await pool.query(
    `SELECT
      COALESCE(tool_name, 'unknown') AS tool_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS call_count
    FROM events
    WHERE tool_name IS NOT NULL
      AND created_at > NOW() - INTERVAL '1 day' * $1
    GROUP BY tool_name
    ORDER BY cost_usd DESC`,
    [days]
  );
  return result.rows;
}

export async function getCostsSummary() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(tokens_in) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) AS tokens_in_today,
      COALESCE(SUM(tokens_out) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) AS tokens_out_today,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0) AS cost_today,
      COALESCE(SUM(tokens_in) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) AS tokens_in_7d,
      COALESCE(SUM(tokens_out) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) AS tokens_out_7d,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) AS cost_7d,
      COALESCE(SUM(tokens_in) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS tokens_in_30d,
      COALESCE(SUM(tokens_out) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS tokens_out_30d,
      COALESCE(SUM(cost_usd) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) AS cost_30d,
      COALESCE(SUM(tokens_in), 0) AS tokens_in_all,
      COALESCE(SUM(tokens_out), 0) AS tokens_out_all,
      COALESCE(SUM(cost_usd), 0) AS cost_all
    FROM events
  `);
  return result.rows[0];
}
