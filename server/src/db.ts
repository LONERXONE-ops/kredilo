import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { root } from './config.ts';

export type Db = DatabaseSync;

export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.join(root, 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const done = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(f);
    if (done) continue;
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(path.join(dir, f), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(f, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

export function audit(db: Db, actorId: string | null, action: string, target?: string, meta?: unknown) {
  db.prepare('INSERT INTO audit_log (actor_id, action, target, meta) VALUES (?, ?, ?, ?)').run(
    actorId,
    action,
    target ?? null,
    meta === undefined ? null : JSON.stringify(meta),
  );
}
