import { getDb } from "./db";

export function getCostsByDay(days = 30) {
  return getDb()
    .prepare(
      `SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY day ASC`
    )
    .all(days);
}

export function getCostsByAgent(days = 30) {
  return getDb()
    .prepare(
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
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY agent_name
    ORDER BY cost_usd DESC`
    )
    .all(days);
}

export function getCostsByAgentPerDay(days = 30) {
  return getDb()
    .prepare(
      `SELECT
      DATE(created_at) AS day,
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at), agent_name
    ORDER BY day ASC, cost_usd DESC`
    )
    .all(days);
}

export function getCostsByTool(days = 30) {
  return getDb()
    .prepare(
      `SELECT
      COALESCE(tool_name, 'unknown') AS tool_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS call_count
    FROM events
    WHERE tool_name IS NOT NULL
      AND created_at > datetime('now', '-' || ? || ' days')
    GROUP BY tool_name
    ORDER BY cost_usd DESC`
    )
    .all(days);
}

export function getCostsSummary() {
  return getDb()
    .prepare(
      `SELECT
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_in ELSE 0 END), 0) AS tokens_in_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_out ELSE 0 END), 0) AS tokens_out_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN cost_usd ELSE 0 END), 0) AS cost_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN cost_usd ELSE 0 END), 0) AS cost_30d,
      COALESCE(SUM(tokens_in), 0) AS tokens_in_all,
      COALESCE(SUM(tokens_out), 0) AS tokens_out_all,
      COALESCE(SUM(cost_usd), 0) AS cost_all
    FROM events`
    )
    .get();
}
