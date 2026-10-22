import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import type { Db, Queryable } from './db.ts';
import type { Ctx } from './http.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

type NRow = {
  id: string; user_id: string; type: string; title: string; body: string | null;
  ref_type: string | null; ref_id: string | null; image_file: string | null; read_at: string | null; created_at: string;
};

// Write a notification for a user. Never throws — a failed notification must not break the
// action that triggered it (approving a task, paying a withdrawal, etc.).
export async function notify(
  db: Queryable,
  userId: string,
  n: { type: string; title: string; body?: string; refType?: string; refId?: string },
): Promise<void> {
  try {
    await db
      .prepare('INSERT INTO notifications (id, user_id, type, title, body, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newId(), userId, n.type, n.title, n.body ?? null, n.refType ?? null, n.refId ?? null);
  } catch (e) {
    console.error('[notify]', e);
  }
}

export type SendMail = (m: { to: string; subject: string; text: string }) => void;

// Email a user by id for the events worth an inbox ping (approvals, payouts, etc.). Never throws
// and is fire-and-forget: a mail failure must not break the action that triggered it. Silently does
// nothing when no mailer is configured. Real delivery to arbitrary users needs a verified Resend
// domain; until then the mailer just logs.
export async function emailUser(db: Queryable, sendMail: SendMail | undefined, userId: string, subject: string, text: string): Promise<void> {
  if (!sendMail) return;
  try {
    const row = (await db.prepare('SELECT email FROM users WHERE id = ?').get(userId)) as { email: string } | undefined;
    if (row?.email) sendMail({ to: row.email, subject, text });
  } catch (e) {
    console.error('[emailUser]', e);
  }
}

const view = (n: NRow) => ({
  id: n.id, type: n.type, title: n.title, body: n.body, image: n.image_file,
  refType: n.ref_type, refId: n.ref_id, read: !!n.read_at, createdAt: n.created_at,
});

const unreadCount = async (db: Queryable, userId: string): Promise<number> =>
  ((await db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId)) as { n: number }).n;

export function notificationRoutes({ db, route, requireUser }: Deps) {
  route('GET', '/api/notifications', async (c) => {
    const u = await requireUser(c);
    const rows = (await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(u.id)) as NRow[];
    return { notifications: rows.map(view), unread: await unreadCount(db, u.id) };
  });

  route('GET', '/api/notifications/unread', async (c) => {
    const u = await requireUser(c);
    return { unread: await unreadCount(db, u.id) };
  });

  route('POST', '/api/notifications/read', async (c) => {
    const u = await requireUser(c);
    const id = typeof c.body.id === 'string' ? c.body.id : '';
    const at = new Date().toISOString();
    if (id) await db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').run(at, id, u.id);
    else await db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(at, u.id);
    return { ok: true, unread: await unreadCount(db, u.id) };
  });
}
