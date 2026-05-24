import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "tastewise",
  password: process.env.PG_PASSWORD || "tastewise",
  database: process.env.PG_DATABASE || "agent_manager",
  max: 10,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      agent_name TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      payload JSONB DEFAULT '{}',
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      agent_name TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
      session_id TEXT,
      tokens_in_total INTEGER DEFAULT 0,
      tokens_out_total INTEGER DEFAULT 0,
      cost_usd_total REAL DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_name);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_name);
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

    CREATE TABLE IF NOT EXISTS agent_project_links (
      id SERIAL PRIMARY KEY,
      agent_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agent_name, project_id)
    );

    CREATE INDEX IF NOT EXISTS idx_links_project ON agent_project_links(project_id);
    CREATE INDEX IF NOT EXISTS idx_links_agent ON agent_project_links(agent_name);
  `);
}

export { pool };
