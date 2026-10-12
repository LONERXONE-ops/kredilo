import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import type { Db } from './db.ts';
import type { Ctx } from './http.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

type NRow = {
  id: string; user_id: string; type: string; title: string; body: string | null;
  ref_type: string | null; ref_id: string | null; read_at: string | null; created_at: string;
};

// Write a notification for a user. Never throws — a failed notification must not break the
// action that triggered it (approving a task, paying a withdrawal, etc.).
export function notify(
  db: Db,
  userId: string,
  n: { type: string; title: string; body?: string; refType?: string; refId?: string },
): void {
  try {
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, body, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(newId(), userId, n.type, n.title, n.body ?? null, n.refType ?? null, n.refId ?? null);
  } catch (e) {
    console.error('[notify]', e);
  }
}

const view = (n: NRow) => ({
  id: n.id, type: n.type, title: n.title, body: n.body,
  refType: n.ref_type, refId: n.ref_id, read: !!n.read_at, createdAt: n.created_at,
});

const unreadCount = (db: Db, userId: string): number =>
  (db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId) as { n: number }).n;

export function notificationRoutes({ db, route, requireUser }: Deps) {
  route('GET', '/api/notifications', async (c) => {
    const u = requireUser(c);
    const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(u.id) as NRow[];
    return { notifications: rows.map(view), unread: unreadCount(db, u.id) };
  });

  route('GET', '/api/notifications/unread', async (c) => {
    const u = requireUser(c);
    return { unread: unreadCount(db, u.id) };
  });

  route('POST', '/api/notifications/read', async (c) => {
    const u = requireUser(c);
    const id = typeof c.body.id === 'string' ? c.body.id : '';
    const at = new Date().toISOString();
    if (id) db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').run(at, id, u.id);
    else db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(at, u.id);
    return { ok: true, unread: unreadCount(db, u.id) };
  });
}
