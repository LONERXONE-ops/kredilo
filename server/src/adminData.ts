import { audit } from './db.ts';
import type { Db, Queryable } from './db.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { addFunding, balance, currentSettings, reserveAvailable, tokensToNaira } from './ledger.ts';
import { avatarUrl, saveImage } from './uploads.ts';
import { deleteUserSessions, newId } from './auth.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

const str = (v: unknown, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const one = async (db: Queryable, sql: string, ...p: unknown[]) => ((await db.prepare(sql).get(...p)) as { n: number }).n;

export function adminDataRoutes({ db, route, requireUser }: Deps) {
  const requireAdmin = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };
  const requireOwner = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Owner only.');
    return u;
  };

  route('GET', '/api/admin/overview', async (c) => {
    await requireAdmin(c);
    const { rate, minWithdrawalTokens } = await currentSettings(db);
    const reserve = await reserveAvailable(db);
    const nowMs = Date.now();
    const activeCut = new Date(nowMs - 5 * 60_000).toISOString();   // seen in the last 5 minutes
    const recentCut = new Date(nowMs - 60 * 60_000).toISOString();  // seen in the last hour
    return {
      users: await one(db, "SELECT COUNT(*) AS n FROM users WHERE role = 'user'"),
      admins: await one(db, "SELECT COUNT(*) AS n FROM users WHERE role != 'user'"),
      liveTasks: await one(db, "SELECT COUNT(*) AS n FROM tasks WHERE status = 'live'"),
      pendingReviews: await one(db, "SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending_review'"),
      pendingPosts: await one(db, "SELECT COUNT(*) AS n FROM tasks WHERE kind = 'posted' AND status = 'pending_payment'"),
      openWithdrawals: await one(db, "SELECT COUNT(*) AS n FROM withdrawals WHERE status IN ('requested','processing')"),
      usersActive: await one(db, "SELECT COUNT(*) AS n FROM users WHERE role = 'user' AND last_seen_at > ?", activeCut),
      usersRecent: await one(db, "SELECT COUNT(*) AS n FROM users WHERE role = 'user' AND last_seen_at > ? AND last_seen_at <= ?", recentCut, activeCut),
      reserveTokens: reserve,
      reserveNaira: tokensToNaira(reserve, rate),
      // Warn the owner while there's still a buffer, before rewards start failing.
      reserveLow: reserve < minWithdrawalTokens * 3,
    };
  });

  route('GET', '/api/admin/users', async (c) => {
    const u = await requireAdmin(c);
    if (u.role === 'reviewer') throw new HttpError(403, 'Not allowed.');
    const q = str(c.query.q, 80).toLowerCase();
    const rows = (await db
      .prepare(`SELECT id, email, role, status, email_verified_at, created_at, avatar_ref, last_seen_at FROM users ${q ? 'WHERE LOWER(email) LIKE ?' : ''} ORDER BY created_at DESC LIMIT 200`)
      .all(...(q ? [`%${q}%`] : []))) as { id: string; email: string; role: string; status: string; email_verified_at: string | null; created_at: string; avatar_ref: string | null; last_seen_at: string | null }[];
    return {
      users: await Promise.all(
        rows.map(async (r) => ({
          id: r.id, email: r.email, role: r.role, status: r.status,
          emailVerified: r.email_verified_at !== null, balance: await balance(db, r.id), createdAt: r.created_at, avatar: avatarUrl(r.avatar_ref), lastSeen: r.last_seen_at,
        })),
      ),
    };
  });

  route('POST', '/api/admin/users/status', async (c) => {
    const admin = await requireOwner(c);
    const target = (await db.prepare('SELECT * FROM users WHERE id = ?').get(str(c.body.userId, 64))) as UserRow | undefined;
    if (!target) throw new HttpError(404, 'User not found.');
    if (target.id === admin.id) throw new HttpError(400, 'You cannot change your own status.');
    if (target.role === 'owner') throw new HttpError(400, 'You cannot suspend an owner.');
    const status = c.body.suspend ? 'suspended' : 'active';
    await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, target.id);
    if (status === 'suspended') await deleteUserSessions(db, target.id);
    await audit(db, admin.id, status === 'suspended' ? 'user.suspend' : 'user.reinstate', target.id);
    return { ok: true };
  });

  // Broadcast one notification to every user at once, and keep a record in the announcements
  // history so it can be reviewed and edited later.
  route('POST', '/api/admin/announce', async (c) => {
    const admin = await requireOwner(c);
    const title = str(c.body.title, 120);
    const body = str(c.body.body, 1000);
    if (!title) throw new HttpError(400, 'Enter an announcement title.');
    const image = c.body.image ? (await saveImage(c.body.image)).file : null;
    const annId = newId();
    const res = await db
      .prepare("INSERT INTO notifications (id, user_id, type, title, body, ref_type, ref_id, image_file) SELECT lower(hex(randomblob(16))), id, 'announcement', ?, ?, 'announcement', ?, ? FROM users")
      .run(title, body || null, annId, image);
    await db.prepare('INSERT INTO announcements (id, title, body, image_file, sent_by, sent_count) VALUES (?, ?, ?, ?, ?, ?)').run(annId, title, body || null, image, admin.id, res.changes);
    await audit(db, admin.id, 'announce', annId, { title, sent: res.changes });
    return { ok: true, sent: res.changes };
  });

  // History of past announcements, newest first.
  route('GET', '/api/admin/announcements', async (c) => {
    await requireOwner(c);
    const rows = (await db
      .prepare(`SELECT a.id, a.title, a.body, a.image_file, a.sent_count, a.created_at, a.updated_at, u.email AS sender
                FROM announcements a LEFT JOIN users u ON u.id = a.sent_by ORDER BY a.created_at DESC LIMIT 100`)
      .all()) as { id: string; title: string; body: string | null; image_file: string | null; sent_count: number; created_at: string; updated_at: string | null; sender: string | null }[];
    return { announcements: rows.map((r) => ({ id: r.id, title: r.title, body: r.body, image: r.image_file, sentCount: r.sent_count, createdAt: r.created_at, updatedAt: r.updated_at, sender: r.sender })) };
  });

  // Edit a past announcement to fix a typo; the change also updates what users already received.
  route('POST', '/api/admin/announcements/update', async (c) => {
    const admin = await requireOwner(c);
    const id = str(c.body.id, 64);
    const title = str(c.body.title, 120);
    const body = str(c.body.body, 1000);
    if (!title) throw new HttpError(400, 'Enter an announcement title.');
    const ann = await db.prepare('SELECT id FROM announcements WHERE id = ?').get(id);
    if (!ann) throw new HttpError(404, 'Announcement not found.');
    const now = new Date().toISOString();
    await db.prepare('UPDATE announcements SET title = ?, body = ?, updated_at = ? WHERE id = ?').run(title, body || null, now, id);
    await db.prepare("UPDATE notifications SET title = ?, body = ? WHERE ref_type = 'announcement' AND ref_id = ?").run(title, body || null, id);
    await audit(db, admin.id, 'announce.edit', id, { title });
    return { ok: true };
  });

  route('GET', '/api/admin/funding', async (c) => {
    await requireOwner(c);
    const { rate } = await currentSettings(db);
    const sum = async (reason: string) => ((await db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM reserve WHERE reason = ?').get(reason)) as { n: number }).n;
    const funded = (await sum('initial_reserve')) + (await sum('post_payment')) + (await sum('funding_add'));
    const issued = -(await sum('reward_issued'));
    const available = await reserveAvailable(db);
    const liabilities = (await one(db, "SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE reason = 'withdrawal_hold'")) * -1;
    return {
      rate: { tokens: rate.num, naira: rate.den },
      fundedTokens: funded, fundedNaira: tokensToNaira(funded, rate),
      issuedTokens: issued, issuedNaira: tokensToNaira(issued, rate),
      availableTokens: available, availableNaira: tokensToNaira(available, rate),
      heldForWithdrawalTokens: liabilities, heldForWithdrawalNaira: tokensToNaira(liabilities, rate),
    };
  });

  // Owner tops up the reward reserve.
  route('POST', '/api/admin/funding', async (c) => {
    const admin = await requireOwner(c);
    const tokens = Math.floor(Number(c.body.tokens));
    if (!Number.isFinite(tokens) || tokens <= 0) throw new HttpError(400, 'Enter a positive number of kreds.');
    if (tokens > 1_000_000_000) throw new HttpError(400, 'That amount is too large.');
    await addFunding(db, tokens, 'funding_add', 'manual', undefined, admin.id);
    const { rate } = await currentSettings(db);
    const available = await reserveAvailable(db);
    return { ok: true, availableTokens: available, availableNaira: tokensToNaira(available, rate) };
  });

  // Owner changes the kred <-> naira exchange rate. Stored as a new versioned settings row,
  // so past ledger entries (which snapshot their own rate) are untouched.
  route('POST', '/api/admin/rate', async (c) => {
    const admin = await requireOwner(c);
    const kreds = Math.floor(Number(c.body.kreds));
    const naira = Math.floor(Number(c.body.naira));
    if (!Number.isFinite(kreds) || kreds <= 0 || !Number.isFinite(naira) || naira <= 0) throw new HttpError(400, 'Enter positive values for both kreds and naira.');
    const cur = await currentSettings(db);
    await db.prepare('INSERT INTO settings (tokens_per_naira_num, tokens_per_naira_den, min_withdrawal_tokens) VALUES (?, ?, ?)').run(kreds, naira, cur.minWithdrawalTokens);
    await audit(db, admin.id, 'settings.rate', null, { kreds, naira });
    return { ok: true, rate: { tokens: kreds, naira } };
  });

  route('GET', '/api/admin/ledger', async (c) => {
    await requireOwner(c);
    const rows = (await db
      .prepare(`SELECT l.amount, l.reason, l.ref_type, l.ref_id, l.created_at, u.email
                FROM ledger l JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 200`)
      .all()) as { amount: number; reason: string; ref_type: string | null; ref_id: string | null; created_at: string; email: string }[];
    return { entries: rows.map((r) => ({ amount: r.amount, reason: r.reason, refType: r.ref_type, email: r.email, at: r.created_at })) };
  });

  route('GET', '/api/admin/audit', async (c) => {
    await requireOwner(c);
    const rows = (await db
      .prepare(`SELECT a.action, a.target, a.meta, a.created_at, u.email AS actor
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`)
      .all()) as { action: string; target: string | null; meta: string | null; created_at: string; actor: string | null }[];
    return { entries: rows.map((r) => ({ action: r.action, target: r.target, meta: r.meta, actor: r.actor, at: r.created_at })) };
  });

  route('GET', '/api/admin/fraud', async (c) => {
    const u = await requireAdmin(c);
    if (u.role === 'support') throw new HttpError(403, 'Not allowed.');
    const reusedProof = (await db
      .prepare(`SELECT proof_hash, COUNT(*) AS c FROM submissions WHERE proof_hash IS NOT NULL GROUP BY proof_hash HAVING c > 1`)
      .all()) as { proof_hash: string; c: number }[];
    const reusedHandle = (await db
      .prepare(`SELECT LOWER(handle) AS h, COUNT(DISTINCT user_id) AS c FROM submissions WHERE handle IS NOT NULL GROUP BY LOWER(handle) HAVING c > 1`)
      .all()) as { h: string; c: number }[];
    // One bank account paid out to several different accounts is the classic multi-account cash-out.
    const reusedBank = (await db
      .prepare(`SELECT bank_name AS b, account_last4 AS l4, COUNT(DISTINCT user_id) AS c
                FROM withdrawals WHERE account_last4 IS NOT NULL GROUP BY bank_name, account_last4 HAVING c > 1`)
      .all()) as { b: string; l4: string; c: number }[];
    const notReceived = await one(db, 'SELECT COUNT(*) AS n FROM withdrawals WHERE not_received = 1');
    return {
      reusedScreenshots: reusedProof.length,
      reusedHandles: reusedHandle.map((r) => ({ handle: r.h, accounts: r.c })),
      reusedBankAccounts: reusedBank.map((r) => ({ bank: r.b, last4: r.l4, accounts: r.c })),
      notReceivedCount: notReceived,
    };
  });
}
