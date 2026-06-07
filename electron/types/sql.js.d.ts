// Minimal ambient declaration for sql.js (no bundled types) — typed only to the
// surface electron/services/db.ts actually uses. sql.js is synchronous WASM
// SQLite; see electron/CLAUDE.md. If broader coverage is ever needed, prefer
// installing @types/sql.js over widening this file.
declare module "sql.js" {
  export interface Statement {
    bind(params: unknown[]): boolean;
    step(): boolean;
    get(): unknown[];
    getColumnNames(): string[];
    free(): boolean;
  }

  export interface Database {
    prepare(sql: string): Statement;
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string): unknown[];
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
