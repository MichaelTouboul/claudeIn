import { getDb } from "./db";
import { broadcast } from "./broadcast";

type HookEvent = {
  agent_name: string;
  session_id?: string;
  event_type: string;
  tool_name?: string;
  payload?: Record<string, unknown>;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  model?: string;
};

export function ingestEvent(event: HookEvent) {
  const db = getDb();

  const stmt = db.prepare(
    `INSERT INTO events (agent_name, session_id, event_type, tool_name, payload, tokens_in, tokens_out, cost_usd, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(
    event.agent_name,
    event.session_id || null,
    event.event_type,
    event.tool_name || null,
    JSON.stringify(event.payload || {}),
    event.tokens_in || 0,
    event.tokens_out || 0,
    event.cost_usd || 0,
    event.model || null
  );

  const stored = db
    .prepare("SELECT * FROM events WHERE id = last_insert_rowid()")
    .get();

  if (event.session_id) {
    db.prepare(
      `UPDATE missions SET
        tokens_in_total = tokens_in_total + ?,
        tokens_out_total = tokens_out_total + ?,
        cost_usd_total = cost_usd_total + ?,
        events_count = events_count + 1
       WHERE session_id = ?`
    ).run(
      event.tokens_in || 0,
      event.tokens_out || 0,
      event.cost_usd || 0,
      event.session_id
    );
  }

  if (event.event_type === "Stop" && event.session_id) {
    db.prepare(
      `UPDATE missions SET status = 'done', finished_at = datetime('now') WHERE session_id = ? AND status = 'running'`
    ).run(event.session_id);
  }

  broadcast({
    type: "event",
    ...(stored as Record<string, unknown>),
  });

  return stored;
}

export function getRecentEvents(limit = 50) {
  return getDb()
    .prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

export function getEventsByAgent(agentName: string, limit = 50) {
  return getDb()
    .prepare(
      "SELECT * FROM events WHERE agent_name = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(agentName, limit);
}

export function getStats() {
  return getDb()
    .prepare(
      `SELECT
      COUNT(DISTINCT CASE WHEN event_type != 'Stop' THEN session_id END) AS active_sessions,
      COUNT(*) AS total_events,
      COALESCE(SUM(tokens_in), 0) AS total_tokens_in,
      COALESCE(SUM(tokens_out), 0) AS total_tokens_out,
      COALESCE(SUM(cost_usd), 0) AS total_cost,
      SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN 1 ELSE 0 END) AS events_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today
    FROM events`
    )
    .get();
}
