import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './config.ts';

// --- Async DB layer -----------------------------------------------------
// The whole codebase talks to the database through this thin async wrapper
// (`db.prepare(sql).get/all/run(...args)`), which is backed by one of two
// engines chosen purely from the connection URL:
//   • node:sqlite (DatabaseSync) for local file / in-memory  — dev + tests.
//     Works everywhere Node runs, including Termux/Android (no native dep).
//   • @libsql/client for a remote Turso database in production.
//     Pulled in only when the URL is remote; it's an OPTIONAL dependency so
//     a platform without its native binary (e.g. Android) still installs.
// A transaction (`db.begin()`) exposes the same prepare() surface, so the
// money-critical ledger code runs interleaved reads and writes atomically.

type Arg = string | number | bigint | boolean | null | Uint8Array;

export interface Stmt {
  get<T = Record<string, unknown>>(...args: Arg[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(...args: Arg[]): Promise<T[]>;
  run(...args: Arg[]): Promise<{ lastInsertRowid: number; changes: number }>;
}

export interface Queryable {
  prepare(sql: string): Stmt;
}

export interface Tx extends Queryable {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Db extends Queryable {
  exec(sql: string): Promise<void>;
  begin(): Promise<Tx>;
  close(): void;
}

export type DbConfig = { url: string; authToken?: string };

const MIGRATIONS_DIR = path.join(root, 'migrations');
const migrationFiles = () => readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

const isRemote = (url: string) => /^(libsql|wss?|https?):\/\//i.test(url);

export async function openDb(cfg: DbConfig): Promise<Db> {
  return isRemote(cfg.url) ? openLibsql(cfg) : openSqlite(cfg.url);
}

// --- node:sqlite backend (dev + tests) ----------------------------------

async function openSqlite(url: string): Promise<Db> {
  const { DatabaseSync } = await import('node:sqlite');
  const file = url === ':memory:' ? ':memory:' : url.replace(/^file:/, '');
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrateSqlite(db);

  // Every method returns an already-resolved promise: the underlying work is
  // synchronous, so a begin()…commit() block completes within one event-loop
  // turn (only microtask awaits inside), i.e. no request can interleave it.
  const stmt = (sql: string): Stmt => {
    const s = db.prepare(sql);
    return {
      async get<T>(...a: Arg[]) {
        return s.get(...(a as never[])) as T | undefined;
      },
      async all<T>(...a: Arg[]) {
        return s.all(...(a as never[])) as T[];
      },
      async run(...a: Arg[]) {
        const r = s.run(...(a as never[]));
        return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
      },
    };
  };

  return {
    prepare: stmt,
    exec: async (sql: string) => void db.exec(sql),
    async begin(): Promise<Tx> {
      db.exec('BEGIN IMMEDIATE');
      let settled = false;
      return {
        prepare: stmt,
        commit: async () => { if (!settled) { settled = true; db.exec('COMMIT'); } },
        rollback: async () => { if (!settled) { settled = true; db.exec('ROLLBACK'); } },
      };
    },
    close: () => db.close(),
  };
}

function migrateSqlite(db: import('node:sqlite').DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  for (const f of migrationFiles()) {
    if (db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(f)) continue;
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(f, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

// --- libSQL / Turso backend (production) ---------------------------------

type LibsqlExecutor = { execute(stmt: { sql: string; args: Arg[] }): Promise<{ rows: unknown[]; lastInsertRowid?: bigint; rowsAffected: number }> };

function libsqlStmt(exec: LibsqlExecutor, sql: string): Stmt {
  return {
    async get<T>(...args: Arg[]) {
      const r = await exec.execute({ sql, args });
      return r.rows[0] as T | undefined;
    },
    async all<T>(...args: Arg[]) {
      const r = await exec.execute({ sql, args });
      return r.rows as T[];
    },
    async run(...args: Arg[]) {
      const r = await exec.execute({ sql, args });
      return { lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : 0, changes: Number(r.rowsAffected ?? 0) };
    },
  };
}

async function openLibsql(cfg: DbConfig): Promise<Db> {
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url: cfg.url, authToken: cfg.authToken, intMode: 'number' });
  await migrateLibsql(client);

  return {
    prepare: (sql: string) => libsqlStmt(client as unknown as LibsqlExecutor, sql),
    exec: (sql: string) => client.executeMultiple(sql),
    async begin(): Promise<Tx> {
      const t = await client.transaction('write');
      return {
        prepare: (sql: string) => libsqlStmt(t as unknown as LibsqlExecutor, sql),
        commit: () => t.commit(),
        rollback: () => t.rollback(),
      };
    },
    close: () => client.close(),
  };
}

async function migrateLibsql(client: { execute: (s: { sql: string; args: Arg[] }) => Promise<{ rows: unknown[] }>; executeMultiple: (sql: string) => Promise<void> }) {
  await client.executeMultiple('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  for (const f of migrationFiles()) {
    const done = await client.execute({ sql: 'SELECT 1 FROM schema_migrations WHERE name = ?', args: [f] });
    if (done.rows.length) continue;
    const body = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const iso = new Date().toISOString();
    // All or nothing: the body (which may include triggers) plus the record
    // row, run as one script wrapped in a transaction. File names and ISO
    // timestamps contain no quotes, so interpolation here is safe.
    try {
      await client.executeMultiple(`BEGIN;\n${body}\nINSERT INTO schema_migrations (name, applied_at) VALUES ('${f}', '${iso}');\nCOMMIT;`);
    } catch (e) {
      await client.executeMultiple('ROLLBACK;').catch(() => {});
      throw new Error(`Migration ${f} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

// --- shared helper ------------------------------------------------------

export async function audit(db: Queryable, actorId: string | null, action: string, target?: string, meta?: unknown) {
  await db
    .prepare('INSERT INTO audit_log (actor_id, action, target, meta) VALUES (?, ?, ?, ?)')
    .run(actorId, action, target ?? null, meta === undefined ? null : JSON.stringify(meta));
}
