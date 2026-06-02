import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";

const HOME = process.env.HOME || require("os").homedir();
const DB_DIR = path.join(HOME, ".claude-agent-manager");
const DB_PATH = path.join(DB_DIR, "data.db");

let db: any;

export interface PreparedStatement {
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
  run(...params: unknown[]): void;
}

export interface DbWrapper {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
}

function rowsToObjects(stmt: any): Record<string, unknown>[] {
  const cols = stmt.getColumnNames();
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) {
      obj[cols[i]] = row[i];
    }
    results.push(obj);
  }
  stmt.free();
  return results;
}

function createWrapper(sqldb: any): DbWrapper {
  return {
    prepare(sql: string): PreparedStatement {
      return {
        all(...params: unknown[]): Record<string, unknown>[] {
          const stmt = sqldb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const results = rowsToObjects(stmt);
          save();
          return results;
        },
        get(...params: unknown[]): Record<string, unknown> | undefined {
          const stmt = sqldb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const results = rowsToObjects(stmt);
          save();
          return results[0];
        },
        run(...params: unknown[]): void {
          sqldb.run(sql, params);
          save();
        },
      };
    },
    exec(sql: string): void {
      sqldb.exec(sql);
      save();
    },
  };
}

let wrapper: DbWrapper;

function save(): void {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function getDb(): DbWrapper {
  if (!wrapper) throw new Error("Database not initialized. Call initDb() first.");
  return wrapper;
}

export async function initDb(): Promise<void> {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  wrapper = createWrapper(db);

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      payload TEXT DEFAULT '{}',
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      model TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
      session_id TEXT,
      tokens_in_total INTEGER DEFAULT 0,
      tokens_out_total INTEGER DEFAULT 0,
      cost_usd_total REAL DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK (item_type IN ('agent', 'skill', 'hook')),
      item_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_type, item_name, project_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_name);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_name);
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
    CREATE INDEX IF NOT EXISTS idx_favorites_project ON favorites(project_id);
  `);

  runMigrations();
}

// Idempotent schema migrations for existing DBs. CREATE TABLE IF NOT EXISTS does
// not alter a table that already exists, so additive columns are applied here by
// inspecting PRAGMA table_info and only ALTERing when the column is absent.
function runMigrations(): void {
  const eventColumns = wrapper
    .prepare("PRAGMA table_info(events)")
    .all()
    .map((row) => row.name);

  if (!eventColumns.includes("model")) {
    wrapper.exec("ALTER TABLE events ADD COLUMN model TEXT");
  }
}
