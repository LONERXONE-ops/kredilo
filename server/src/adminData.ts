import { audit } from './db.ts';
import type { Db } from './db.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { addFunding, balance, currentSettings, reserveAvailable, tokensToNaira } from './ledger.ts';
import { avatarUrl } from './uploads.ts';
import { deleteUserSessions } from './auth.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

const str = (v: unknown, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const one = (db: Db, sql: string, ...p: unknown[]) => (db.prepare(sql).get(...p) as { n: number }).n;

export function adminDataRoutes({ db, route, requireUser }: Deps) {
  const requireAdmin = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };
  const requireOwner = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Owner only.');
    return u;
  };

  route('GET', '/api/admin/overview', async (c) => {
    requireAdmin(c);
    const { rate, minWithdrawalTokens } = currentSettings(db);
    const reserve = reserveAvailable(db);
    return {
      users: one(db, "SELECT COUNT(*) AS n FROM users WHERE role = 'user'"),
      admins: one(db, "SELECT COUNT(*) AS n FROM users WHERE role != 'user'"),
      liveTasks: one(db, "SELECT COUNT(*) AS n FROM tasks WHERE status = 'live'"),
      pendingReviews: one(db, "SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending_review'"),
      pendingPosts: one(db, "SELECT COUNT(*) AS n FROM tasks WHERE kind = 'posted' AND status = 'pending_payment'"),
      openWithdrawals: one(db, "SELECT COUNT(*) AS n FROM withdrawals WHERE status IN ('requested','processing')"),
      reserveTokens: reserve,
      reserveNaira: tokensToNaira(reserve, rate),
      // Warn the owner while there's still a buffer, before rewards start failing.
      reserveLow: reserve < minWithdrawalTokens * 3,
    };
  });

  route('GET', '/api/admin/users', async (c) => {
    const u = requireAdmin(c);
    if (u.role === 'reviewer') throw new HttpError(403, 'Not allowed.');
    const q = str(c.query.q, 80).toLowerCase();
    const rows = db
      .prepare(`SELECT id, email, role, status, email_verified_at, created_at, avatar_ref FROM users ${q ? 'WHERE LOWER(email) LIKE ?' : ''} ORDER BY created_at DESC LIMIT 200`)
      .all(...(q ? [`%${q}%`] : [])) as { id: string; email: string; role: string; status: string; email_verified_at: string | null; created_at: string; avatar_ref: string | null }[];
    return {
      users: rows.map((r) => ({
        id: r.id, email: r.email, role: r.role, status: r.status,
        emailVerified: r.email_verified_at !== null, balance: balance(db, r.id), createdAt: r.created_at, avatar: avatarUrl(r.avatar_ref),
      })),
    };
  });

  route('POST', '/api/admin/users/status', async (c) => {
    const admin = requireOwner(c);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(str(c.body.userId, 64)) as UserRow | undefined;
    if (!target) throw new HttpError(404, 'User not found.');
    if (target.id === admin.id) throw new HttpError(400, 'You cannot change your own status.');
    if (target.role === 'owner') throw new HttpError(400, 'You cannot suspend an owner.');
    const status = c.body.suspend ? 'suspended' : 'active';
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, target.id);
    if (status === 'suspended') deleteUserSessions(db, target.id);
    audit(db, admin.id, status === 'suspended' ? 'user.suspend' : 'user.reinstate', target.id);
    return { ok: true };
  });

  route('GET', '/api/admin/funding', async (c) => {
    requireOwner(c);
    const { rate } = currentSettings(db);
    const sum = (reason: string) => (db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM reserve WHERE reason = ?').get(reason) as { n: number }).n;
    const funded = sum('initial_reserve') + sum('post_payment') + sum('funding_add');
    const issued = -sum('reward_issued');
    const available = reserveAvailable(db);
    const liabilities = one(db, "SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE reason = 'withdrawal_hold'") * -1;
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
    const admin = requireOwner(c);
    const tokens = Math.floor(Number(c.body.tokens));
    if (!Number.isFinite(tokens) || tokens <= 0) throw new HttpError(400, 'Enter a positive number of kreds.');
    if (tokens > 1_000_000_000) throw new HttpError(400, 'That amount is too large.');
    addFunding(db, tokens, 'funding_add', 'manual', undefined, admin.id);
    const { rate } = currentSettings(db);
    const available = reserveAvailable(db);
    return { ok: true, availableTokens: available, availableNaira: tokensToNaira(available, rate) };
  });

  // Owner changes the kred <-> naira exchange rate. Stored as a new versioned settings row,
  // so past ledger entries (which snapshot their own rate) are untouched.
  route('POST', '/api/admin/rate', async (c) => {
    const admin = requireOwner(c);
    const kreds = Math.floor(Number(c.body.kreds));
    const naira = Math.floor(Number(c.body.naira));
    if (!Number.isFinite(kreds) || kreds <= 0 || !Number.isFinite(naira) || naira <= 0) throw new HttpError(400, 'Enter positive values for both kreds and naira.');
    const cur = currentSettings(db);
    db.prepare('INSERT INTO settings (tokens_per_naira_num, tokens_per_naira_den, min_withdrawal_tokens) VALUES (?, ?, ?)').run(kreds, naira, cur.minWithdrawalTokens);
    audit(db, admin.id, 'settings.rate', null, { kreds, naira });
    return { ok: true, rate: { tokens: kreds, naira } };
  });

  route('GET', '/api/admin/ledger', async (c) => {
    requireOwner(c);
    const rows = db
      .prepare(`SELECT l.amount, l.reason, l.ref_type, l.ref_id, l.created_at, u.email
                FROM ledger l JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 200`)
      .all() as { amount: number; reason: string; ref_type: string | null; ref_id: string | null; created_at: string; email: string }[];
    return { entries: rows.map((r) => ({ amount: r.amount, reason: r.reason, refType: r.ref_type, email: r.email, at: r.created_at })) };
  });

  route('GET', '/api/admin/audit', async (c) => {
    requireOwner(c);
    const rows = db
      .prepare(`SELECT a.action, a.target, a.meta, a.created_at, u.email AS actor
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`)
      .all() as { action: string; target: string | null; meta: string | null; created_at: string; actor: string | null }[];
    return { entries: rows.map((r) => ({ action: r.action, target: r.target, meta: r.meta, actor: r.actor, at: r.created_at })) };
  });

  route('GET', '/api/admin/fraud', async (c) => {
    const u = requireAdmin(c);
    if (u.role === 'support') throw new HttpError(403, 'Not allowed.');
    const reusedProof = db
      .prepare(`SELECT proof_hash, COUNT(*) AS c FROM submissions WHERE proof_hash IS NOT NULL GROUP BY proof_hash HAVING c > 1`)
      .all() as { proof_hash: string; c: number }[];
    const reusedHandle = db
      .prepare(`SELECT LOWER(handle) AS h, COUNT(DISTINCT user_id) AS c FROM submissions WHERE handle IS NOT NULL GROUP BY LOWER(handle) HAVING c > 1`)
      .all() as { h: string; c: number }[];
    const notReceived = one(db, 'SELECT COUNT(*) AS n FROM withdrawals WHERE not_received = 1');
    return {
      reusedScreenshots: reusedProof.length,
      reusedHandles: reusedHandle.map((r) => ({ handle: r.h, accounts: r.c })),
      notReceivedCount: notReceived,
    };
  });
}
