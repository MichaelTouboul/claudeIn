import { getDb } from "./db";

export function createMission(
  agentName: string,
  title: string,
  sessionId?: string
) {
  getDb()
    .prepare(
      "INSERT INTO missions (agent_name, title, session_id) VALUES (?, ?, ?)"
    )
    .run(agentName, title, sessionId || null);

  return getDb()
    .prepare("SELECT * FROM missions WHERE id = last_insert_rowid()")
    .get();
}

export function getMissions(limit = 50, status?: string) {
  if (status) {
    return getDb()
      .prepare(
        "SELECT * FROM missions WHERE status = ? ORDER BY started_at DESC LIMIT ?"
      )
      .all(status, limit);
  }
  return getDb()
    .prepare("SELECT * FROM missions ORDER BY started_at DESC LIMIT ?")
    .all(limit);
}

export function getMission(id: number) {
  return (
    getDb().prepare("SELECT * FROM missions WHERE id = ?").get(id) || null
  );
}

export function getMissionEvents(id: number) {
  const mission = getMission(id) as { session_id?: string } | null;
  if (!mission?.session_id) return [];
  return getDb()
    .prepare(
      "SELECT * FROM events WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(mission.session_id);
}

export function failMission(sessionId: string): void {
  getDb()
    .prepare(
      "UPDATE missions SET status = 'failed', finished_at = datetime('now') WHERE session_id = ? AND status = 'running'"
    )
    .run(sessionId);
}
