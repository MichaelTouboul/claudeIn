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
    CREATE TABLE IF NOT EXISTS conversation_meta (
      session_id  TEXT PRIMARY KEY,
      pinned_at   TEXT,
      archived_at TEXT,
      deleted_at  TEXT,
      note        TEXT,
      ai_title    TEXT,
      user_title  TEXT,
      cleared_at  TEXT
    );
    CREATE TABLE IF NOT EXISTS scope_profiles (
      scope_path   TEXT PRIMARY KEY,
      scope        TEXT NOT NULL,
      profile_md   TEXT NOT NULL,
      inputs_hash  TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_profile (
      id                      INTEGER PRIMARY KEY CHECK (id = 1),
      claude_user_path        TEXT,
      name                    TEXT,
      role                    TEXT,
      plugins                 TEXT,
      capabilities            TEXT,
      summary                 TEXT,
      stack                   TEXT,
      domains                 TEXT,
      workflow                TEXT,
      onboarding_completed_at TEXT,
      generated_at            TEXT,
      updated_at              TEXT
    );
    CREATE TABLE IF NOT EXISTS favorite_repos (
      path          TEXT PRIMARY KEY,
      label         TEXT,
      added_at      TEXT,
      logo_data_url TEXT
    );
    CREATE TABLE IF NOT EXISTS disabled_hooks (
      id         TEXT PRIMARY KEY,
      scope      TEXT,
      event      TEXT NOT NULL,
      matcher    TEXT,
      command    TEXT NOT NULL,
      layer_path TEXT NOT NULL,
      removed_at TEXT
    );
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

  const conversationMetaColumns = wrapper
    .prepare("PRAGMA table_info(conversation_meta)")
    .all()
    .map((row) => row.name);

  if (!conversationMetaColumns.includes("ai_title")) {
    wrapper.exec("ALTER TABLE conversation_meta ADD COLUMN ai_title TEXT");
  }

  if (!conversationMetaColumns.includes("user_title")) {
    wrapper.exec("ALTER TABLE conversation_meta ADD COLUMN user_title TEXT");
  }

  // cleared_at — durable `/clear` boundary. `loadConversation` returns only
  // messages strictly after this timestamp, so a cleared conversation reloads
  // empty/fresh while the on-disk transcript is left untouched.
  if (!conversationMetaColumns.includes("cleared_at")) {
    wrapper.exec("ALTER TABLE conversation_meta ADD COLUMN cleared_at TEXT");
  }

  // logo_data_url — the repo logo detected at scan time, inlined as a base64
  // `data:` URL so it survives reloads and is re-displayable (Avatar + folder
  // tab) without re-reading the FS.
  const favoriteRepoColumns = wrapper
    .prepare("PRAGMA table_info(favorite_repos)")
    .all()
    .map((row) => row.name);

  if (!favoriteRepoColumns.includes("logo_data_url")) {
    wrapper.exec("ALTER TABLE favorite_repos ADD COLUMN logo_data_url TEXT");
  }

  // stack — LLM-inferred individual technologies (the "Stack" tag chips),
  // mirroring `domains`. Existing rows have a NULL stack column, which the map
  // deserializes to `[]` (back-compat, no destructive migration).
  const userProfileColumns = wrapper
    .prepare("PRAGMA table_info(user_profile)")
    .all()
    .map((row) => row.name);

  if (!userProfileColumns.includes("stack")) {
    wrapper.exec("ALTER TABLE user_profile ADD COLUMN stack TEXT");
  }
}
