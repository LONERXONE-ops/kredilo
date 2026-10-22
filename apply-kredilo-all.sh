#!/usr/bin/env bash
# Kredilo - full feature wave: task editing (admin + user 1h), notifications detail,
# announcements history/edit/image, activity monitoring, 3 new games + bigger trivia,
# dock + team redesign. Run from your repo root:  cd ~/kredilo && bash apply-kredilo-all.sh
set -euo pipefail
if [ ! -f package.json ] || [ ! -d src ] || [ ! -d server ]; then
  echo "Run this from the kredilo repo root (where package.json, src/ and server/ live)." >&2
  exit 1
fi
echo "Writing files..."
mkdir -p "server/migrations"
cat > "server/migrations/015_activity_edits.sql" <<'KREDILO_WAVE_EOF'
-- Activity monitoring: when a user was last seen making an authenticated request.
ALTER TABLE users ADD COLUMN last_seen_at TEXT;
-- When a posted task went live (admin confirmed payment). Starts the poster's 1-hour edit window.
ALTER TABLE tasks ADD COLUMN went_live_at TEXT;
CREATE INDEX IF NOT EXISTS users_last_seen ON users(last_seen_at);
KREDILO_WAVE_EOF
echo "  server/migrations/015_activity_edits.sql"
mkdir -p "server/migrations"
cat > "server/migrations/016_announcements.sql" <<'KREDILO_WAVE_EOF'
-- Broadcast announcements the owner sends to everyone, kept as a history so they can be
-- reviewed and edited. Each send also writes one notification per user (ref_type 'announcement',
-- ref_id = this announcement's id), so editing the announcement can update what users see.
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  image_file TEXT,
  sent_by TEXT REFERENCES users(id),
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);
-- Optional image shown inside a notification (used by announcements).
ALTER TABLE notifications ADD COLUMN image_file TEXT;
KREDILO_WAVE_EOF
echo "  server/migrations/016_announcements.sql"
mkdir -p "server/src"
cat > "server/src/auth.ts" <<'KREDILO_WAVE_EOF'
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { avatarUrl } from './uploads.ts';
import { promisify } from 'node:util';
import type { Queryable } from './db.ts';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'kredilo_session';
export const SESSION_DAYS = 7;

export type UserRow = {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  role: 'user' | 'owner' | 'reviewer' | 'support';
  status: 'active' | 'suspended';
  email_verified_at: string | null;
  created_at: string;
  avatar_ref: string | null;
  referral_code: string | null;
  referred_by: string | null;
  referral_bonus_paid: number;
  streak: number;
  last_streak_day: string | null;
  last_seen_at: string | null;
};

// Kreds a referrer earns when someone they invited completes their first task.
export const REFERRAL_BONUS = 10;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused chars
function randomCode(len = 6): string {
  const b = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[b[i] % CODE_CHARS.length];
  return s;
}

// Returns the user's referral code, generating and saving one the first time.
export async function ensureReferralCode(db: Queryable, userId: string): Promise<string> {
  const row = (await db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId)) as { referral_code: string | null } | undefined;
  if (row?.referral_code) return row.referral_code;
  let code = randomCode();
  while (await db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code)) code = randomCode();
  await db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, userId);
  return code;
}

export async function findByReferralCode(db: Queryable, code: string): Promise<UserRow | undefined> {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!c) return undefined;
  return (await db.prepare('SELECT * FROM users WHERE referral_code = ?').get(c)) as UserRow | undefined;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, s, h] = stored.split('$');
  if (kind !== 'scrypt' || !s || !h) return false;
  const expected = Buffer.from(h, 'base64');
  const actual = await scrypt(pw, Buffer.from(s, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Used so a wrong email takes about as long as a wrong password.
export const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(64).toString('base64')}`;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const newId = () => randomUUID();

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

export async function createSession(db: Queryable, userId: string): Promise<string> {
  const token = newToken();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), userId, inDays(SESSION_DAYS));
  return token;
}

export async function sessionUser(db: Queryable, token: string | undefined): Promise<UserRow | null> {
  if (!token) return null;
  const row = (await db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
    )
    .get(hashToken(token), new Date().toISOString())) as UserRow | undefined;
  return row ?? null;
}

export async function deleteSession(db: Queryable, token: string | undefined) {
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export async function deleteUserSessions(db: Queryable, userId: string) {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export async function createEmailToken(db: Queryable, userId: string, purpose: 'verify_email' | 'reset_password'): Promise<string> {
  const token = newToken();
  const minutes = purpose === 'verify_email' ? 60 * 24 : 60;
  await db.prepare('INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, purpose, inMinutes(minutes));
  return token;
}

// Checks a token without using it up (so a rejected form does not burn the link).
export async function peekEmailToken(db: Queryable, token: string, purpose: 'verify_email' | 'reset_password'): Promise<string | null> {
  const row = (await db
    .prepare('SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?')
    .get(hashToken(token), purpose, new Date().toISOString())) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

// Returns the user id if the token is valid, unused and unexpired, and marks it used. One use only.
export async function consumeEmailToken(db: Queryable, token: string, purpose: 'verify_email' | 'reset_password'): Promise<string | null> {
  const row = (await db
    .prepare('SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?')
    .get(hashToken(token), purpose, new Date().toISOString())) as { user_id: string } | undefined;
  if (!row) return null;
  const res = await db.prepare('UPDATE email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').run(new Date().toISOString(), hashToken(token));
  return res.changes === 1 ? row.user_id : null;
}

export const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  username: u.username ?? u.email.split('@')[0],
  role: u.role,
  emailVerified: u.email_verified_at !== null,
  createdAt: u.created_at,
  avatar: avatarUrl(u.avatar_ref ?? null),
  referralCode: u.referral_code,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}
export function passwordProblem(pw: unknown, email: string): string | null {
  if (typeof pw !== 'string') return 'Password is required.';
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (pw.length > 128) return 'Password is too long.';
  if (pw.toLowerCase() === email) return 'Password must not be your email.';
  return null;
}

// Usernames: 3-20 chars, lowercase letters, numbers and underscores. Returns the normalised
// username, or null if invalid.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export function validUsername(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const u = v.trim().toLowerCase();
  return USERNAME_RE.test(u) ? u : null;
}

// Case-insensitive check for whether a username is already taken (optionally ignoring one user).
export async function usernameTaken(db: Queryable, username: string, exceptId?: string): Promise<boolean> {
  const row = exceptId
    ? await db.prepare('SELECT 1 FROM users WHERE lower(username) = ? AND id != ?').get(username, exceptId)
    : await db.prepare('SELECT 1 FROM users WHERE lower(username) = ?').get(username);
  return !!row;
}

// Fallback username from an email prefix when none was chosen (API callers without the UI).
// Always valid (3-20 chars) and unique.
export async function autoUsername(db: Queryable, email: string): Promise<string> {
  let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (base.length < 3) base = (base + 'user').slice(0, 10);
  base = base.slice(0, 15);
  let candidate = base;
  let n = 0;
  while (await usernameTaken(db, candidate)) candidate = `${base}${++n}`.slice(0, 20);
  return candidate;
}
KREDILO_WAVE_EOF
echo "  server/src/auth.ts"
mkdir -p "server/src"
cat > "server/src/app.ts" <<'KREDILO_WAVE_EOF'
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { adminRoutes } from './admin.ts';
import { walletRoutes } from './wallet.ts';
import { taskRoutes } from './tasks.ts';
import { postRoutes } from './posts.ts';
import { withdrawalRoutes } from './withdrawals.ts';
import { adminDataRoutes } from './adminData.ts';
import { avatarRoutes } from './avatar.ts';
import { notificationRoutes } from './notifications.ts';
import { gameRoutes } from './games.ts';
import { socialRoutes } from './social.ts';
import { streakRoutes } from './streak.ts';
import { googleRoutes } from './google.ts';
import { audit } from './db.ts';
import type { Db } from './db.ts';
import {
  DUMMY_HASH, SESSION_COOKIE, SESSION_DAYS, consumeEmailToken, createEmailToken, createSession, deleteSession,
  autoUsername, deleteUserSessions, ensureReferralCode, findByReferralCode, hashPassword, newId, passwordProblem,
  peekEmailToken, publicUser, REFERRAL_BONUS, sessionUser, usernameTaken, validEmail, validUsername, verifyPassword,
} from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError, cookie, limited, parseCookies, readJson, sendJson } from './http.ts';
import type { Ctx } from './http.ts';
import type { AppOptions } from './config.ts';
import { serveStatic } from './static.ts';

type Handler = (c: Ctx) => Promise<unknown>;

export function createApp(db: Db, o: AppOptions): Server {
  const routes = new Map<string, Handler>();
  const route = (method: string, path: string, h: Handler) => routes.set(`${method} ${path}`, h);
  const maxAge = SESSION_DAYS * 86_400;
  const setSession = (c: Ctx, token: string) =>
    c.res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, token, { maxAgeSec: maxAge, secure: o.isProd }));
  const clearSession = (c: Ctx) => c.res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', { maxAgeSec: 0, secure: o.isProd }));
  // Activity heartbeat: remember when each signed-in user was last seen, at most one write per
  // user per minute so it never adds real database load. Powers the admin activity indicators.
  const lastSeenWrite = new Map<string, number>();
  const touchLastSeen = async (u: UserRow) => {
    const nowMs = Date.now();
    if (nowMs - (lastSeenWrite.get(u.id) ?? 0) < 60_000) return;
    lastSeenWrite.set(u.id, nowMs);
    try { await db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), u.id); } catch { /* best effort */ }
  };
  const currentUser = async (c: Ctx): Promise<UserRow | null> => {
    const u = await sessionUser(db, c.cookies[SESSION_COOKIE]);
    if (u) void touchLastSeen(u);
    return u;
  };
  const requireUser = async (c: Ctx): Promise<UserRow> => {
    const u = await currentUser(c);
    if (!u) throw new HttpError(401, 'Please log in.');
    return u;
  };
  const tooMany = () => new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');

  // First owner: only the configured OWNER_EMAIL, only after it is verified, only if no owner exists yet.
  const maybePromoteOwner = async (u: UserRow) => {
    if (!o.ownerEmail || u.email !== o.ownerEmail) return;
    const tx = await db.begin();
    try {
      const has = await tx.prepare("SELECT 1 FROM users WHERE role = 'owner'").get();
      if (!has) {
        await tx.prepare("UPDATE users SET role = 'owner' WHERE id = ? AND email_verified_at IS NOT NULL").run(u.id);
        await audit(tx, u.id, 'owner.bootstrap', u.id);
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  };

  const sendVerify = async (u: UserRow) => {
    const token = await createEmailToken(db, u.id, 'verify_email');
    o.sendMail({ to: u.email, subject: 'Verify your Kredilo email', text: `Open this link to verify your email:\n${o.appOrigin}/verify-email?token=${token}` });
  };

  route('GET', '/api/health', async () => ({ ok: true }));

  // Public contact form -> emails the support inbox.
  route('POST', '/api/contact', async (c) => {
    if (limited(`contact:${c.ip}`, 5, 3_600_000)) throw tooMany();
    const name = typeof c.body.name === 'string' ? c.body.name.trim().slice(0, 100) : '';
    const email = validEmail(c.body.email);
    const message = typeof c.body.message === 'string' ? c.body.message.trim().slice(0, 4000) : '';
    if (!name || !email || !message) throw new HttpError(400, 'Please add your name, a valid email and a message.');
    o.sendMail({
      to: o.supportEmail,
      subject: `Kredilo contact — ${name}`,
      text: `New message from the Kredilo contact form:\n\nName: ${name}\nEmail: ${email}\n\n${message}\n\n— Reply directly to ${email}`,
    });
    return { ok: true };
  });

  route('POST', '/api/auth/signup', async (c) => {
    if (limited(`signup:${c.ip}`, 10, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    if (!email) throw new HttpError(400, 'Enter a valid email address.');
    const provided = c.body.username !== undefined && c.body.username !== '';
    const chosen = provided ? validUsername(c.body.username) : null;
    if (provided && !chosen) throw new HttpError(400, 'Username must be 3-20 characters: lowercase letters, numbers or underscores.');
    const problem = passwordProblem(c.body.password, email);
    if (problem) throw new HttpError(400, problem);
    if (await db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists.');
    if (chosen && (await usernameTaken(db, chosen))) throw new HttpError(409, 'That username is already taken.');
    const username = chosen ?? (await autoUsername(db, email));
    // Referral is optional — but if a code IS entered, it must be a real one.
    const refRaw = typeof c.body.referralCode === 'string' ? c.body.referralCode.trim() : '';
    let referrer: UserRow | undefined;
    if (refRaw) {
      referrer = await findByReferralCode(db, refRaw);
      if (!referrer) throw new HttpError(400, 'That referral code isn’t valid. Leave it blank if no one invited you.');
    }
    const id = newId();
    await db.prepare('INSERT INTO users (id, email, username, password_hash, referred_by) VALUES (?, ?, ?, ?, ?)')
      .run(id, email, username, await hashPassword(c.body.password as string), referrer?.id ?? null);
    await ensureReferralCode(db, id);
    await audit(db, id, 'user.signup', id, referrer ? { referredBy: referrer.id } : undefined);
    const user = (await db.prepare('SELECT * FROM users WHERE id = ?').get(id)) as UserRow;
    await sendVerify(user);
    setSession(c, await createSession(db, id));
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/login', async (c) => {
    const email = validEmail(c.body.email);
    const password = typeof c.body.password === 'string' ? c.body.password : '';
    if (limited(`login-ip:${c.ip}`, 30, 900_000) || (email && limited(`login-email:${email}`, 8, 900_000))) throw tooMany();
    const user = email ? ((await db.prepare('SELECT * FROM users WHERE email = ?').get(email)) as UserRow | undefined) : undefined;
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
    if (user.status !== 'active') throw new HttpError(403, 'This account is suspended.');
    setSession(c, await createSession(db, user.id));
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/logout', async (c) => {
    await deleteSession(db, c.cookies[SESSION_COOKIE]);
    clearSession(c);
    return { ok: true };
  });

  route('GET', '/api/auth/me', async (c) => {
    const u = await currentUser(c);
    return { user: u ? publicUser(u) : null };
  });

  route('POST', '/api/auth/verify', async (c) => {
    if (limited(`verify:${c.ip}`, 20, 900_000)) throw tooMany();
    const token = typeof c.body.token === 'string' ? c.body.token : '';
    const userId = await consumeEmailToken(db, token, 'verify_email');
    if (!userId) throw new HttpError(400, 'This link is invalid or has expired.');
    await db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL').run(new Date().toISOString(), userId);
    await audit(db, userId, 'user.email_verified', userId);
    await maybePromoteOwner((await db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) as UserRow);
    return { ok: true };
  });

  route('POST', '/api/auth/resend-verification', async (c) => {
    const u = await requireUser(c);
    if (limited(`resend:${u.id}`, 3, 3_600_000)) throw tooMany();
    if (!u.email_verified_at) await sendVerify(u);
    return { ok: true };
  });

  route('POST', '/api/auth/forgot', async (c) => {
    if (limited(`forgot:${c.ip}`, 10, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    const user = email ? ((await db.prepare('SELECT * FROM users WHERE email = ?').get(email)) as UserRow | undefined) : undefined;
    if (user) {
      const token = await createEmailToken(db, user.id, 'reset_password');
      o.sendMail({ to: user.email, subject: 'Reset your Kredilo password', text: `Open this link to set a new password:\n${o.appOrigin}/reset-password?token=${token}` });
    }
    return { ok: true }; // same answer whether or not the email exists
  });

  route('POST', '/api/auth/reset', async (c) => {
    if (limited(`reset:${c.ip}`, 10, 900_000)) throw tooMany();
    const token = typeof c.body.token === 'string' ? c.body.token : '';
    const peeked = await peekEmailToken(db, token, 'reset_password');
    if (!peeked) throw new HttpError(400, 'This link is invalid or has expired.');
    const user = (await db.prepare('SELECT * FROM users WHERE id = ?').get(peeked)) as UserRow;
    const problem = passwordProblem(c.body.password, user.email);
    if (problem) throw new HttpError(400, problem);
    const userId = await consumeEmailToken(db, token, 'reset_password');
    if (!userId) throw new HttpError(400, 'This link is invalid or has expired.');
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(c.body.password as string), userId);
    await deleteUserSessions(db, userId);
    await audit(db, userId, 'user.password_reset', userId);
    return { ok: true };
  });

  route('POST', '/api/auth/username', async (c) => {
    const u = await requireUser(c);
    if (limited(`username:${u.id}`, 5, 3_600_000)) throw tooMany();
    const username = validUsername(c.body.username);
    if (!username) throw new HttpError(400, 'Username must be 3-20 characters: lowercase letters, numbers or underscores.');
    if (await usernameTaken(db, username, u.id)) throw new HttpError(409, 'That username is already taken.');
    await db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, u.id);
    await audit(db, u.id, 'user.username', u.id, { username });
    return { user: publicUser((await db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) as UserRow) };
  });

  route('GET', '/api/referral', async (c) => {
    const u = await requireUser(c);
    const code = await ensureReferralCode(db, u.id);
    const count = ((await db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?').get(u.id)) as { n: number }).n;
    const credited = ((await db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ? AND referral_bonus_paid = 1').get(u.id)) as { n: number }).n;
    return { code, count, credited, earned: credited * REFERRAL_BONUS, bonus: REFERRAL_BONUS };
  });

  adminRoutes({ db, route, requireUser, options: o });
  walletRoutes({ db, route, requireUser });
  taskRoutes({ db, route, requireUser, sendMail: o.sendMail });
  postRoutes({ db, route, requireUser, sendMail: o.sendMail });
  withdrawalRoutes({ db, route, requireUser, sendMail: o.sendMail });
  adminDataRoutes({ db, route, requireUser });
  avatarRoutes({ db, route, requireUser });
  notificationRoutes({ db, route, requireUser });
  gameRoutes({ db, route, requireUser });
  socialRoutes({ db, route, requireUser });
  streakRoutes({ db, route, requireUser });
  googleRoutes({ db, route, options: o, setSession, maybePromoteOwner });

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const h = routes.get(`${method} ${url.pathname}`);
      if (!h) {
        // Not an API route: serve the built frontend (production) with SPA fallback.
        if (method === 'GET' && !url.pathname.startsWith('/api/') && serveStatic(url.pathname, res)) return;
        throw new HttpError(404, 'Not found');
      }
      if (method !== 'GET') {
        const origin = req.headers.origin;
        if (origin && !o.allowedOrigins.includes(origin)) throw new HttpError(403, 'Origin not allowed');
      }
      const c: Ctx = {
        req,
        res,
        ip: req.socket.remoteAddress ?? 'unknown',
        cookies: parseCookies(req.headers.cookie),
        body: await readJson(req, (url.pathname === '/api/tasks/submit' || url.pathname === '/api/avatar' || url.pathname === '/api/post/create' || url.pathname === '/api/admin/tasks') ? 8_000_000 : 16_384),
        query: Object.fromEntries(url.searchParams),
      };
      const data = await h(c);
      if (res.headersSent) return;
      sendJson(res, 200, data, res.hasHeader('Set-Cookie') ? { 'Set-Cookie': res.getHeader('Set-Cookie') as string } : {});
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
      console.error('[error]', e);
      sendJson(res, 500, { error: 'Something went wrong.' });
    }
  };

  return createServer((req, res) => void handle(req, res));
}
KREDILO_WAVE_EOF
echo "  server/src/app.ts"
mkdir -p "server/src"
cat > "server/src/notifications.ts" <<'KREDILO_WAVE_EOF'
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
KREDILO_WAVE_EOF
echo "  server/src/notifications.ts"
mkdir -p "server/src"
cat > "server/src/adminData.ts" <<'KREDILO_WAVE_EOF'
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
KREDILO_WAVE_EOF
echo "  server/src/adminData.ts"
mkdir -p "server/src"
cat > "server/src/tasks.ts" <<'KREDILO_WAVE_EOF'
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError, limited } from './http.ts';
import type { Ctx } from './http.ts';
import { creditReward, LedgerError } from './ledger.ts';
import { readPrivateImage, saveImage } from './uploads.ts';
import { emailUser, notify } from './notifications.ts';
import type { SendMail } from './notifications.ts';
import { REFERRAL_BONUS } from './auth.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
  sendMail?: SendMail;
};

const tooMany = () => new HttpError(429, 'You’re going a bit fast — wait a moment and try again.');

const PROOF_TYPES = ['screenshot', 'link', 'text', 'none'];
const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

// Validate an optional external link. Returns null when empty; throws on a malformed/non-http URL.
export function cleanLink(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('scheme');
    return u.toString();
  } catch {
    throw new HttpError(400, 'Enter a valid link starting with https://');
  }
}

type TaskRow = {
  id: string; kind: string; title: string; description: string; category: string; reward_tokens: number;
  proof_type: string; needs_handle: number; photo_file: string | null; link_url: string | null; max_completions: number;
  approved_count: number; status: string; created_by: string; pool_tokens: number; price_naira: number | null;
  days: number | null; expires_at: string | null; created_at: string;
};
type SubRow = {
  id: string; task_id: string; user_id: string; status: string; proof_file: string | null; proof_text: string | null;
  handle: string | null; proof_hash: string | null; reject_reason: string | null; reviewed_by: string | null;
  submitted_at: string | null; reviewed_at: string | null; created_at: string;
};

const publicTask = (t: TaskRow) => ({
  id: t.id, kind: t.kind, title: t.title, description: t.description, category: t.category,
  reward: t.reward_tokens, proofType: t.proof_type, needsHandle: !!t.needs_handle,
  photo: t.photo_file, link: t.link_url, status: t.status, remaining: Math.max(0, t.max_completions - t.approved_count),
  maxCompletions: t.max_completions, approvedCount: t.approved_count, expiresAt: t.expires_at,
});

export function taskRoutes({ db, route, requireUser, sendMail }: Deps) {
  const requireAdmin = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };
  const getTask = async (id: string) => (await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)) as TaskRow | undefined;
  const isLive = (t: TaskRow) => t.status === 'live' && (!t.expires_at || t.expires_at > new Date().toISOString());

  route('GET', '/api/tasks', async (c) => {
    await requireUser(c);
    const rows = (await db.prepare("SELECT * FROM tasks WHERE status = 'live' ORDER BY created_at DESC").all()) as TaskRow[];
    return { tasks: rows.filter(isLive).map(publicTask) };
  });

  route('GET', '/api/tasks/mine', async (c) => {
    const u = await requireUser(c);
    const rows = (await db
      .prepare('SELECT s.*, t.title, t.reward_tokens, t.proof_type FROM submissions s JOIN tasks t ON t.id = s.task_id WHERE s.user_id = ? ORDER BY s.created_at DESC')
      .all(u.id)) as (SubRow & { title: string; reward_tokens: number; proof_type: string })[];
    return {
      submissions: rows.map((s) => ({
        id: s.id, taskId: s.task_id, title: s.title, reward: s.reward_tokens, proofType: s.proof_type,
        status: s.status, rejectReason: s.reject_reason, submittedAt: s.submitted_at,
      })),
    };
  });

  route('POST', '/api/tasks/accept', async (c) => {
    const u = await requireUser(c);
    if (limited(`accept:${u.id}`, 30, 60_000)) throw tooMany();
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || !isLive(task)) throw new HttpError(404, 'This task is not available.');
    if (task.approved_count >= task.max_completions) throw new HttpError(409, 'This task is full.');
    if (task.created_by === u.id) throw new HttpError(403, 'You cannot do your own task.');
    try {
      await db.prepare('INSERT INTO submissions (id, task_id, user_id) VALUES (?, ?, ?)').run(newId(), task.id, u.id);
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'You have already started this task.');
      throw e;
    }
    return { ok: true };
  });

  route('POST', '/api/tasks/submit', async (c) => {
    const u = await requireUser(c);
    if (limited(`submit:${u.id}`, 15, 60_000)) throw tooMany();
    const sub = (await db.prepare('SELECT * FROM submissions WHERE task_id = ? AND user_id = ?').get(str(c.body.taskId, 64), u.id)) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Start the task before submitting.');
    if (sub.status !== 'in_progress') throw new HttpError(409, 'This task has already been submitted.');
    const task = (await getTask(sub.task_id))!;

    let proofFile: string | null = null;
    let proofHash: string | null = null;
    let proofText: string | null = null;
    const handle = task.needs_handle ? str(c.body.handle, 100) : null;
    if (task.needs_handle && !handle) throw new HttpError(400, 'Enter the social handle you used.');

    if (task.proof_type === 'screenshot') {
      const saved = await saveImage(c.body.image);
      proofFile = saved.file;
      proofHash = saved.hash;
      const reused = await db.prepare('SELECT 1 FROM submissions WHERE task_id = ? AND proof_hash = ? AND user_id != ?').get(task.id, proofHash, u.id);
      if (reused) throw new HttpError(409, 'This screenshot has already been submitted by someone else.');
    } else if (task.proof_type === 'link' || task.proof_type === 'text') {
      proofText = str(c.body.text, 1000);
      if (!proofText) throw new HttpError(400, 'Enter your proof.');
    }

    try {
      await db
        .prepare("UPDATE submissions SET status = 'pending_review', proof_file = ?, proof_hash = ?, proof_text = ?, handle = ?, submitted_at = ? WHERE id = ?")
        .run(proofFile, proofHash, proofText, handle, new Date().toISOString(), sub.id);
    } catch (e) {
      if (String(e).includes('UNIQUE') && String(e).includes('handle')) throw new HttpError(409, 'That handle has already been used for this task.');
      throw e;
    }
    if (task.kind === 'posted' && task.created_by !== u.id) {
      await notify(db, task.created_by, {
        type: 'post_submission', title: 'New proof to review',
        body: `Someone submitted proof for your task "${task.title}".`, refType: 'task', refId: task.id,
      });
    }
    return { ok: true, status: 'pending_review' };
  });

  route('POST', '/api/admin/tasks', async (c) => {
    const admin = await requireAdmin(c);
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    const category = CATEGORIES.includes(str(c.body.category, 40)) ? str(c.body.category, 40) : 'Other';
    const reward = int(c.body.reward);
    const proofType = PROOF_TYPES.includes(str(c.body.proofType, 20)) ? str(c.body.proofType, 20) : 'screenshot';
    const maxCompletions = int(c.body.maxCompletions);
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    if (!Number.isInteger(reward) || reward <= 0) throw new HttpError(400, 'Reward must be a positive number of tokens.');
    if (!Number.isInteger(maxCompletions) || maxCompletions <= 0) throw new HttpError(400, 'Set how many people can complete it.');
    const link = cleanLink(c.body.link);
    const photo = c.body.photo ? (await saveImage(c.body.photo)).file : null;

    const id = newId();
    await db
      .prepare("INSERT INTO tasks (id, kind, title, description, category, reward_tokens, proof_type, needs_handle, photo_file, link_url, max_completions, status, created_by) VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)")
      .run(id, title, description, category, reward, proofType, c.body.needsHandle ? 1 : 0, photo, link, maxCompletions, admin.id);
    await audit(db, admin.id, 'task.create', id, { reward, maxCompletions });
    return { task: publicTask((await getTask(id))!) };
  });

  // Admins (any admin role except plain users) can edit an existing task. Separate from the
  // one-hour window that applies to a regular user editing their own posted task.
  route('POST', '/api/admin/tasks/update', async (c) => {
    const admin = await requireAdmin(c);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task) throw new HttpError(404, 'Task not found.');
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    const category = CATEGORIES.includes(str(c.body.category, 40)) ? str(c.body.category, 40) : task.category;
    const reward = int(c.body.reward);
    const proofType = PROOF_TYPES.includes(str(c.body.proofType, 20)) ? str(c.body.proofType, 20) : task.proof_type;
    const maxCompletions = int(c.body.maxCompletions);
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    if (!Number.isInteger(reward) || reward <= 0) throw new HttpError(400, 'Reward must be a positive number of tokens.');
    if (!Number.isInteger(maxCompletions) || maxCompletions <= 0) throw new HttpError(400, 'Set how many people can complete it.');
    if (maxCompletions < task.approved_count) throw new HttpError(400, `At least ${task.approved_count} people have already completed this, so the limit cannot be lower.`);
    const needsHandle = c.body.needsHandle ? 1 : 0;
    const link = cleanLink(c.body.link);
    const photo = c.body.photo ? (await saveImage(c.body.photo)).file : task.photo_file;
    await db
      .prepare('UPDATE tasks SET title = ?, description = ?, category = ?, reward_tokens = ?, proof_type = ?, needs_handle = ?, max_completions = ?, link_url = ?, photo_file = ? WHERE id = ?')
      .run(title, description, category, reward, proofType, needsHandle, maxCompletions, link, photo, task.id);
    await audit(db, admin.id, 'task.update', task.id, { reward, maxCompletions });
    return { task: publicTask((await getTask(task.id))!) };
  });

  route('POST', '/api/admin/tasks/close', async (c) => {
    const admin = await requireAdmin(c);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task) throw new HttpError(404, 'Task not found.');
    await db.prepare("UPDATE tasks SET status = 'closed' WHERE id = ?").run(task.id);
    await audit(db, admin.id, 'task.close', task.id);
    return { ok: true };
  });

  route('POST', '/api/admin/tasks/delete', async (c) => {
    const admin = await requireAdmin(c);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task) throw new HttpError(404, 'Task not found.');
    const tx = await db.begin();
    try {
      await tx.prepare('DELETE FROM submissions WHERE task_id = ?').run(task.id);
      await tx.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
      await audit(tx, admin.id, 'task.delete', task.id, { title: task.title });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    return { ok: true };
  });

  route('GET', '/api/admin/submissions', async (c) => {
    await requireAdmin(c);
    const taskId = str(c.query.taskId, 64);
    const rows = (await db
      .prepare(`SELECT s.*, t.title, t.reward_tokens FROM submissions s JOIN tasks t ON t.id = s.task_id
                WHERE s.status = 'pending_review' ${taskId ? 'AND s.task_id = ?' : ''} ORDER BY s.submitted_at ASC`)
      .all(...(taskId ? [taskId] : []))) as (SubRow & { title: string; reward_tokens: number })[];
    return {
      submissions: rows.map((s) => ({
        id: s.id, taskId: s.task_id, title: s.title, reward: s.reward_tokens,
        handle: s.handle, proofFile: s.proof_file, proofText: s.proof_text, submittedAt: s.submitted_at,
      })),
    };
  });

  route('POST', '/api/admin/submissions/approve', async (c) => {
    const admin = await requireAdmin(c);
    const sub = (await db.prepare('SELECT * FROM submissions WHERE id = ?').get(str(c.body.submissionId, 64))) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Submission not found.');
    if (sub.status !== 'pending_review') throw new HttpError(409, 'This submission is not awaiting review.');
    const task = (await getTask(sub.task_id))!;
    if (task.approved_count >= task.max_completions) throw new HttpError(409, 'This task has reached its completion limit.');

    try {
      await creditReward(db, {
        userId: sub.user_id,
        tokens: task.reward_tokens,
        refType: 'task',
        refId: task.id,
        idempotencyKey: `sub:${sub.id}`,
        fromReserve: true,
        actorId: admin.id,
      });
    } catch (e) {
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Reward funding is exhausted. Add funding before approving.');
      if (e instanceof LedgerError && e.code === 'duplicate') {
        /* already credited; fall through to mark approved */
      } else throw e;
    }

    const tx = await db.begin();
    try {
      await tx.prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending_review'").run(admin.id, new Date().toISOString(), sub.id);
      await tx.prepare('UPDATE tasks SET approved_count = approved_count + 1 WHERE id = ?').run(task.id);
      await tx.prepare("UPDATE tasks SET status = 'closed' WHERE id = ? AND approved_count >= max_completions").run(task.id);
      await audit(tx, admin.id, 'submission.approve', sub.id, { task: task.id, tokens: task.reward_tokens });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await notify(db, sub.user_id, {
      type: 'task_approved', title: 'Task approved 🎉',
      body: `You earned ${task.reward_tokens} kreds for "${task.title}".`, refType: 'task', refId: task.id,
    });
    await emailUser(db, sendMail, sub.user_id, 'Your Kredilo task was approved 🎉',
      `Good news — "${task.title}" was approved and ${task.reward_tokens} kreds have been added to your wallet.\n\nLog in to Kredilo to see your balance.`);

    // Referral bonus: the first approved task for a referred user pays their referrer once.
    const doer = (await db.prepare('SELECT referred_by, referral_bonus_paid FROM users WHERE id = ?').get(sub.user_id)) as { referred_by: string | null; referral_bonus_paid: number } | undefined;
    if (doer?.referred_by && !doer.referral_bonus_paid) {
      try {
        await creditReward(db, {
          userId: doer.referred_by, tokens: REFERRAL_BONUS, refType: 'referral', refId: sub.user_id,
          idempotencyKey: `referral:${sub.user_id}`, fromReserve: true, actorId: admin.id,
        });
        await db.prepare('UPDATE users SET referral_bonus_paid = 1 WHERE id = ?').run(sub.user_id);
        await notify(db, doer.referred_by, {
          type: 'referral_bonus', title: 'Referral bonus 🎉',
          body: `You earned ${REFERRAL_BONUS} kreds — someone you invited just completed their first task.`,
          refType: 'referral', refId: sub.user_id,
        });
      } catch (e) {
        if (!(e instanceof LedgerError)) throw e;
        console.error('[referral] bonus skipped:', e.code);
      }
    }
    return { ok: true };
  });

  route('POST', '/api/admin/submissions/reject', async (c) => {
    const admin = await requireAdmin(c);
    const reason = str(c.body.reason, 500);
    if (!reason) throw new HttpError(400, 'A rejection reason is required.');
    const sub = (await db.prepare('SELECT * FROM submissions WHERE id = ?').get(str(c.body.submissionId, 64))) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Submission not found.');
    if (sub.status !== 'pending_review') throw new HttpError(409, 'This submission is not awaiting review.');
    await db.prepare("UPDATE submissions SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(reason, admin.id, new Date().toISOString(), sub.id);
    await audit(db, admin.id, 'submission.reject', sub.id, { task: sub.task_id });
    const rtask = await getTask(sub.task_id);
    await notify(db, sub.user_id, {
      type: 'task_rejected', title: 'Task not approved',
      body: `"${rtask?.title ?? 'Your task'}" was not approved: ${reason}`, refType: 'task', refId: sub.task_id,
    });
    await emailUser(db, sendMail, sub.user_id, 'Your Kredilo task was not approved',
      `"${rtask?.title ?? 'Your task'}" was not approved.\n\nReason: ${reason}\n\nYou can try another task on Kredilo.`);
    return { ok: true };
  });

  route('GET', '/api/uploads', async (c) => {
    const u = await requireUser(c);
    // A stored ref is either a local "<hash>.<ext>" filename or a "cld:<public_id>" Cloudinary ref.
    const file = str(c.query.file, 300);
    // Cloudinary refs ("cld:<public_id>") carry slashes in the public_id (e.g. cld:kredilo/private/ab…);
    // local refs are a bare "<hash>.<ext>". Block ".." always; allow "/" only for cld: refs.
    if (!file || file.includes('..') || (!file.startsWith('cld:') && file.includes('/'))) throw new HttpError(400, 'Bad file.');
    const allowed =
      u.role !== 'user' ||
      (await db.prepare('SELECT 1 FROM submissions WHERE proof_file = ? AND user_id = ?').get(file, u.id)) ||
      (await db.prepare("SELECT 1 FROM tasks WHERE created_by = ? AND (photo_file = ? OR id IN (SELECT task_id FROM submissions WHERE proof_file = ?))").get(u.id, file, file)) ||
      (await db.prepare("SELECT 1 FROM tasks WHERE photo_file = ? AND status = 'live'").get(file)) ||
      (await db.prepare('SELECT 1 FROM notifications WHERE image_file = ? AND user_id = ?').get(file, u.id));
    if (!allowed) throw new HttpError(403, 'Not allowed.');
    const img = await readPrivateImage(file);
    if (!img) throw new HttpError(404, 'File not found.');
    c.res.writeHead(200, { 'Content-Type': img.contentType, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    c.res.end(img.bytes);
    return undefined;
  });
}
KREDILO_WAVE_EOF
echo "  server/src/tasks.ts"
mkdir -p "server/src"
cat > "server/src/posts.ts" <<'KREDILO_WAVE_EOF'
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { saveImage } from './uploads.ts';
import { cleanLink } from './tasks.ts';
import { emailUser, notify } from './notifications.ts';
import type { SendMail } from './notifications.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
  sendMail?: SendMail;
};

const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

// A posted task runs for 1-10 days. Cost and reward scale with a flat daily rate the owner can edit.
export const MAX_POST_DAYS = 10;
const DEFAULT_PRICE_PER_DAY = 1000; // naira
const DEFAULT_TOKENS_PER_DAY = 30;

async function flag(db: Db, key: string): Promise<string | null> {
  const r = (await db.prepare('SELECT value FROM platform_flags WHERE key = ? ORDER BY id DESC LIMIT 1').get(key)) as { value: string | null } | undefined;
  return r?.value ?? null;
}
async function postRate(db: Db): Promise<{ perDayNaira: number; perDayTokens: number }> {
  const n = Number(await flag(db, 'post_price_per_day'));
  const t = Number(await flag(db, 'post_tokens_per_day'));
  return {
    perDayNaira: Number.isFinite(n) && n > 0 ? n : DEFAULT_PRICE_PER_DAY,
    perDayTokens: Number.isFinite(t) && t > 0 ? t : DEFAULT_TOKENS_PER_DAY,
  };
}

// Close out posted tasks whose paid run has ended, and remove them so they drop off every view.
// Ledger credits already earned are untouched; only the task and its submissions go.
export async function sweepExpiredPosts(db: Db): Promise<number> {
  const expired = (await db.prepare("SELECT id FROM tasks WHERE kind = 'posted' AND status IN ('live','closed') AND expires_at IS NOT NULL AND expires_at < ?").all(new Date().toISOString())) as { id: string }[];
  let removed = 0;
  for (const t of expired) {
    const tx = await db.begin();
    try {
      await tx.prepare('DELETE FROM submissions WHERE task_id = ?').run(t.id);
      await tx.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
      await tx.commit();
      removed++;
    } catch {
      await tx.rollback();
    }
  }
  return removed;
}

type TaskRow = {
  id: string; kind: string; title: string; description: string; category: string; reward_tokens: number;
  proof_type: string; needs_handle: number; photo_file: string | null; link_url: string | null; max_completions: number;
  approved_count: number; status: string; created_by: string; pool_tokens: number; price_naira: number | null;
  days: number | null; expires_at: string | null; went_live_at: string | null; receipt_file: string | null; payment_note: string | null; created_at: string;
};
type SubRow = {
  id: string; task_id: string; user_id: string; status: string; proof_file: string | null; proof_text: string | null;
  handle: string | null; submitted_at: string | null;
};

export function postRoutes({ db, route, requireUser, sendMail }: Deps) {
  const getTask = async (id: string) => (await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)) as TaskRow | undefined;
  const requireAdmin = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };

  const posterView = (t: TaskRow) => ({
    id: t.id, title: t.title, description: t.description, category: t.category, reward: t.reward_tokens,
    needsHandle: !!t.needs_handle, photo: t.photo_file, link: t.link_url, days: t.days, priceNaira: t.price_naira,
    maxCompletions: t.max_completions, approvedCount: t.approved_count, status: t.status,
    paymentNote: t.payment_note, expiresAt: t.expires_at,
    // True only while the poster's one-hour post-approval edit window is still open.
    canEdit: t.status === 'live' && !!t.went_live_at && Date.now() - Date.parse(t.went_live_at) <= 3_600_000,
  });

  route('GET', '/api/post/pricing', async (c) => {
    await requireUser(c);
    const rate = await postRate(db);
    return {
      perDayNaira: rate.perDayNaira,
      perDayTokens: rate.perDayTokens,
      maxDays: MAX_POST_DAYS,
      categories: CATEGORIES,
      payTo: {
        bankName: process.env.PAY_BANK ?? '',
        accountName: process.env.PAY_ACCOUNT_NAME ?? '',
        accountNumber: process.env.PAY_ACCOUNT_NUMBER ?? '',
      },
    };
  });

  route('POST', '/api/admin/post-rate', async (c) => {
    const u = await requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can change this.');
    const naira = int(c.body.perDayNaira);
    const tokens = int(c.body.perDayTokens);
    if (!Number.isInteger(naira) || naira <= 0) throw new HttpError(400, 'Enter a valid price per day.');
    if (!Number.isInteger(tokens) || tokens <= 0) throw new HttpError(400, 'Enter a valid token reward per day.');
    await db.prepare('INSERT INTO platform_flags (key, value, updated_by) VALUES (?, ?, ?)').run('post_price_per_day', String(naira), u.id);
    await db.prepare('INSERT INTO platform_flags (key, value, updated_by) VALUES (?, ?, ?)').run('post_tokens_per_day', String(tokens), u.id);
    await audit(db, u.id, 'post.rate', null, { naira, tokens });
    return { ok: true, perDayNaira: naira, perDayTokens: tokens };
  });

  route('POST', '/api/post/create', async (c) => {
    const u = await requireUser(c);
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    const category = CATEGORIES.includes(str(c.body.category, 40)) ? str(c.body.category, 40) : 'Other';
    const days = int(c.body.days);
    const maxCompletions = int(c.body.maxCompletions);
    const needsHandle = c.body.needsHandle ? 1 : 0;
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    if (!Number.isInteger(maxCompletions) || maxCompletions <= 0) throw new HttpError(400, 'Set how many people can do the task.');
    if (!Number.isInteger(days) || days < 1 || days > MAX_POST_DAYS) throw new HttpError(400, `Choose between 1 and ${MAX_POST_DAYS} days.`);

    const rate = await postRate(db);
    const priceNaira = days * rate.perDayNaira;
    const rewardTokens = days * rate.perDayTokens;

    if (!c.body.photo) throw new HttpError(400, 'Add a photo for your task.');
    if (!c.body.receipt) throw new HttpError(400, 'Attach your payment receipt.');
    const link = cleanLink(c.body.link);
    const photo = (await saveImage(c.body.photo)).file;
    const receipt = (await saveImage(c.body.receipt)).file;

    const pool = rewardTokens * maxCompletions;
    const id = newId();
    await db
      .prepare(
        `INSERT INTO tasks (id, kind, title, description, category, reward_tokens, proof_type, needs_handle, photo_file, link_url,
        max_completions, status, created_by, pool_tokens, price_naira, days, receipt_file)
       VALUES (?, 'posted', ?, ?, ?, ?, 'screenshot', ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?)`,
      )
      .run(id, title, description, category, rewardTokens, needsHandle, photo, link, maxCompletions, u.id, pool, priceNaira, days, receipt);
    await audit(db, u.id, 'post.create', id, { days, price: priceNaira, pool });
    return { id, status: 'pending_payment', priceNaira, reward: rewardTokens, pool };
  });

  // The poster can fix a mistake on their own task for up to one hour after it goes live.
  // Ownership and the one-hour window are both enforced here on the server, never only in the UI.
  route('POST', '/api/post/edit', async (c) => {
    const u = await requireUser(c);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || task.kind !== 'posted' || task.created_by !== u.id) throw new HttpError(404, 'Task not found.');
    if (task.status !== 'live') throw new HttpError(409, 'Only a live task can be edited.');
    if (!task.went_live_at || Date.now() - Date.parse(task.went_live_at) > 3_600_000) throw new HttpError(403, 'The one hour edit window for this task has closed.');
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    const link = cleanLink(c.body.link);
    const photo = c.body.photo ? (await saveImage(c.body.photo)).file : task.photo_file;
    await db.prepare('UPDATE tasks SET title = ?, description = ?, link_url = ?, photo_file = ? WHERE id = ?').run(title, description, link, photo, task.id);
    await audit(db, u.id, 'post.edit', task.id);
    return { ok: true };
  });

  route('GET', '/api/post/mine', async (c) => {
    const u = await requireUser(c);
    const tasks = (await db.prepare("SELECT * FROM tasks WHERE kind = 'posted' AND created_by = ? ORDER BY created_at DESC").all(u.id)) as TaskRow[];
    return { tasks: tasks.map(posterView) };
  });

  route('GET', '/api/post/doers', async (c) => {
    const u = await requireUser(c);
    const task = await getTask(str(c.query.taskId, 64));
    if (!task || task.created_by !== u.id) throw new HttpError(404, 'Task not found.');
    const subs = (await db.prepare("SELECT id, status, handle, proof_file, submitted_at FROM submissions WHERE task_id = ? ORDER BY created_at").all(task.id)) as SubRow[];
    const ongoing = subs.filter((s) => s.status === 'in_progress');
    const done = subs.filter((s) => s.status === 'pending_review' || s.status === 'approved');
    const view = (s: SubRow) => ({ id: s.id, status: s.status, handle: s.handle, proofFile: s.proof_file, submittedAt: s.submitted_at });
    return { ongoing: ongoing.map(view), completed: done.map(view) };
  });

  route('GET', '/api/admin/posts', async (c) => {
    await requireAdmin(c);
    const rows = (await db.prepare("SELECT * FROM tasks WHERE kind = 'posted' AND status = 'pending_payment' ORDER BY created_at").all()) as TaskRow[];
    return {
      posts: rows.map((t) => ({
        id: t.id, title: t.title, description: t.description, category: t.category, reward: t.reward_tokens,
        maxCompletions: t.max_completions, days: t.days, priceNaira: t.price_naira, pool: t.pool_tokens,
        photo: t.photo_file, receipt: t.receipt_file, link: t.link_url, createdAt: t.created_at,
      })),
    };
  });

  route('POST', '/api/admin/posts/confirm', async (c) => {
    const admin = await requireAdmin(c);
    const note = str(c.body.note, 300);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || task.kind !== 'posted') throw new HttpError(404, 'Posted task not found.');
    if (task.status !== 'pending_payment') throw new HttpError(409, 'This task is not awaiting payment.');

    const expiresAt = new Date(Date.now() + (task.days ?? 1) * 86_400_000).toISOString();
    const tx = await db.begin();
    try {
      const already = await tx.prepare("SELECT 1 FROM reserve WHERE reason = 'post_payment' AND ref_id = ?").get(task.id);
      if (!already) await tx.prepare("INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, 'post_payment', 'posted_task', ?)").run(task.pool_tokens, task.id);
      await tx.prepare("UPDATE tasks SET status = 'live', payment_note = ?, expires_at = ?, went_live_at = ? WHERE id = ? AND status = 'pending_payment'").run(note || null, expiresAt, new Date().toISOString(), task.id);
      await audit(tx, admin.id, 'post.confirm', task.id, { pool: task.pool_tokens });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await notify(db, task.created_by, {
      type: 'post_live', title: 'Your task is live ✅',
      body: `"${task.title}" is now live for doers. If you spot a mistake you have one hour to edit it.`, refType: 'task', refId: task.id,
    });
    await emailUser(db, sendMail, task.created_by, 'Your Kredilo task is live ✅',
      `Your payment was confirmed and "${task.title}" is now live for doers.\n\nTrack completions from "My posted tasks" on Kredilo.`);
    return { ok: true };
  });

  route('POST', '/api/admin/posts/reject', async (c) => {
    const admin = await requireAdmin(c);
    const note = str(c.body.note, 300);
    if (!note) throw new HttpError(400, 'Give a reason so the poster knows why.');
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || task.kind !== 'posted') throw new HttpError(404, 'Posted task not found.');
    if (task.status !== 'pending_payment') throw new HttpError(409, 'This task is not awaiting payment.');
    await db.prepare("UPDATE tasks SET status = 'rejected', payment_note = ? WHERE id = ?").run(note, task.id);
    await audit(db, admin.id, 'post.reject', task.id);
    await notify(db, task.created_by, {
      type: 'post_rejected', title: 'Posted task declined',
      body: `"${task.title}" was not approved: ${note}`, refType: 'task', refId: task.id,
    });
    await emailUser(db, sendMail, task.created_by, 'Your Kredilo posted task was declined',
      `"${task.title}" was not approved.\n\nReason: ${note}\n\nReach out to support if you think this was a mistake.`);
    return { ok: true };
  });
}
KREDILO_WAVE_EOF
echo "  server/src/posts.ts"
mkdir -p "server/src"
cat > "server/src/games.ts" <<'KREDILO_WAVE_EOF'
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { HttpError, limited } from './http.ts';
import type { Ctx } from './http.ts';
import { creditReward, LedgerError } from './ledger.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

// Max kreds per game, per day. Each game is claimable once per calendar day.
const CAPS: Record<string, number> = { snake: 50, memory: 50, reaction: 30, trivia: 40, stroop: 40, math: 40, tiles: 30 };
const today = () => new Date().toISOString().slice(0, 10);

export function gameRoutes({ db, route, requireUser }: Deps) {
  route('GET', '/api/games/status', async (c) => {
    const u = await requireUser(c);
    const day = today();
    const rows = (await db.prepare('SELECT game, kreds FROM game_claims WHERE user_id = ? AND day = ?').all(u.id, day)) as { game: string; kreds: number }[];
    const claimed: Record<string, number> = {};
    for (const r of rows) claimed[r.game] = r.kreds;
    return { day, caps: CAPS, claimed };
  });

  route('POST', '/api/games/claim', async (c) => {
    const u = await requireUser(c);
    if (limited(`game-claim:${u.id}`, 20, 60_000)) throw new HttpError(429, 'You’re going a bit fast — wait a moment and try again.');
    const game = typeof c.body.game === 'string' ? c.body.game : '';
    if (!(game in CAPS)) throw new HttpError(400, 'Unknown game.');
    const raw = typeof c.body.score === 'number' && Number.isFinite(c.body.score) ? c.body.score : 0;
    const cap = CAPS[game];
    const kreds = Math.max(0, Math.min(cap, Math.round(raw)));
    const day = today();

    const existing = (await db.prepare('SELECT kreds FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').get(u.id, game, day)) as { kreds: number } | undefined;
    if (existing) return { already: true, kreds: existing.kreds, cap };
    if (kreds <= 0) return { already: false, kreds: 0, cap };

    // Reserve the daily slot first (unique constraint stops races), then credit. If credit fails, release it.
    const ins = await db.prepare('INSERT OR IGNORE INTO game_claims (id, user_id, game, day, kreds) VALUES (?, ?, ?, ?, ?)').run(newId(), u.id, game, day, kreds);
    if (ins.changes === 0) {
      const ex = (await db.prepare('SELECT kreds FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').get(u.id, game, day)) as { kreds: number };
      return { already: true, kreds: ex.kreds, cap };
    }
    try {
      await creditReward(db, {
        userId: u.id, tokens: kreds, refType: 'game', refId: `${game}:${day}`,
        idempotencyKey: `game:${u.id}:${game}:${day}`, fromReserve: true, actorId: u.id,
      });
    } catch (e) {
      await db.prepare('DELETE FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').run(u.id, game, day);
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Game rewards are temporarily unavailable. Try again later.');
      throw e;
    }
    await audit(db, u.id, 'game.claim', game, { kreds, day });
    return { already: false, kreds, cap };
  });
}
KREDILO_WAVE_EOF
echo "  server/src/games.ts"
mkdir -p "server/test"
cat > "server/test/tasks.test.ts" <<'KREDILO_WAVE_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { balance, reserveAvailable } from '../src/ledger.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OWNER = 'owner@example.com';

async function adminTask(t: any, owner: string, over: Record<string, unknown> = {}) {
  return t.call('POST', '/api/admin/tasks', { title: 'Follow us', description: 'Follow and screenshot', category: 'Social Media', reward: 30, proofType: 'screenshot', maxCompletions: 2, ...over }, owner);
}
const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;

test('only admins can create tasks; validation is enforced', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const member = await t.makeUser('m@example.com');
  assert.equal((await adminTask(t, member)).status, 403);
  assert.equal((await adminTask(t, '')).status, 401);
  assert.equal((await adminTask(t, owner, { reward: 0 })).status, 400);
  assert.equal((await adminTask(t, owner, { title: '' })).status, 400);
  assert.equal((await adminTask(t, owner, { maxCompletions: 0 })).status, 400);
  const ok = await adminTask(t, owner);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.task.reward, 30);
  assert.equal(ok.json.task.remaining, 2);
  t.close();
});

test('full doer flow: accept, submit, admin approves, tokens credited once', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const did = await meId(t, doer);
  const taskId = (await adminTask(t, owner)).json.task.id;
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, doer)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, doer)).status, 409);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer)).json.status, 'pending_review');
  const queue = await t.call('GET', '/api/admin/submissions', undefined, owner);
  assert.equal(queue.json.submissions.length, 1);
  const subId = queue.json.submissions[0].id;
  assert.equal(await balance(t.db, did), 0);
  assert.equal((await t.call('GET', '/api/tasks/mine', undefined, doer)).json.submissions[0].status, 'pending_review');
  assert.equal((await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner)).status, 200);
  assert.equal(await balance(t.db, did), 30);
  assert.equal(await reserveAvailable(t.db), 4800 - 30);
  assert.ok(t.mails.some((m) => m.to === 'doer@example.com' && /approved/i.test(m.subject))); // Wave 4: approval email
  assert.equal((await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner)).status, 409);
  assert.equal(await balance(t.db, did), 30);
  t.close();
});

test('reject records a reason, credits nothing, and the doer sees it', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const did = await meId(t, doer);
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  assert.equal((await t.call('POST', '/api/admin/submissions/reject', { submissionId: subId }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/submissions/reject', { submissionId: subId, reason: 'Screenshot does not show a follow' }, owner)).status, 200);
  assert.equal(await balance(t.db, did), 0);
  const mine = (await t.call('GET', '/api/tasks/mine', undefined, doer)).json.submissions[0];
  assert.equal(mine.status, 'rejected');
  assert.equal(mine.rejectReason, 'Screenshot does not show a follow');
  t.close();
});

test('a task closes when it reaches its completion cap', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { maxCompletions: 1 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a);
  const subA = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subA }, owner);
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, b)).status, 404);
  assert.equal((await t.call('GET', '/api/tasks', undefined, b)).json.tasks.length, 0);
  t.close();
});

test('you cannot do your own task; non-image proof is rejected by type check', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner)).json.task.id;
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, owner)).status, 403);
  const doer = await t.makeUser('doer@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  const notImage = 'data:text/plain;base64,' + Buffer.from('hello not an image at all').toString('base64');
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: notImage }, doer)).status, 415);
  t.close();
});

test('the same screenshot cannot be reused by a second account on the same task', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { maxCompletions: 5 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/accept', { taskId }, b);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, b)).status, 409);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG2 }, b)).status, 200);
  t.close();
});

test('handle-required task: handle is mandatory and unique per task', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { needsHandle: true, maxCompletions: 5 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/accept', { taskId }, b);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a)).status, 400);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG, handle: '@wisdom' }, a)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG2, handle: '@wisdom' }, b)).status, 409);
  t.close();
});

test('uploaded screenshot is viewable by an admin and by the owner of it, not by a stranger', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const stranger = await t.makeUser('s@example.com');
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const file = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].proofFile as string;
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, owner)).status, 200);
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, doer)).status, 200);
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, stranger)).status, 403);
  assert.equal((await t.call('GET', `/api/uploads?file=../secret.txt`, undefined, owner)).status, 400);
  t.close();
});

test('wallet route reflects credited rewards and the real rate', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner);
  const w = (await t.call('GET', '/api/wallet', undefined, doer)).json;
  assert.equal(w.balanceTokens, 30);
  assert.equal(w.balanceNaira, 15);
  assert.equal(w.minWithdrawalTokens, 2000);
  assert.equal(w.minWithdrawalNaira, 1000);
  assert.equal(w.transactions[0].reason, 'task_reward');
  t.close();
});

test('an admin can edit an existing task; a normal user cannot', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const made = await adminTask(t, owner, { title: 'Old title', reward: 10, maxCompletions: 5 });
  const id = made.json.task.id;
  const upd = await t.call('POST', '/api/admin/tasks/update', { taskId: id, title: 'New title', description: 'New desc', category: 'Surveys', reward: 25, proofType: 'screenshot', maxCompletions: 8 }, owner);
  assert.equal(upd.status, 200);
  assert.equal(upd.json.task.title, 'New title');
  assert.equal(upd.json.task.reward, 25);
  assert.equal(upd.json.task.category, 'Surveys');
  const member = await t.makeUser('m2@example.com');
  assert.equal((await t.call('POST', '/api/admin/tasks/update', { taskId: id, title: 'Hack', description: 'x', reward: 1, maxCompletions: 1 }, member)).status, 403);
  t.close();
});
KREDILO_WAVE_EOF
echo "  server/test/tasks.test.ts"
mkdir -p "server/test"
cat > "server/test/posts.test.ts" <<'KREDILO_WAVE_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { reserveAvailable, balance } from '../src/ledger.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const RCPT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OWNER = 'owner@example.com';

async function makePost(t: any, cookie: string, over: Record<string, unknown> = {}) {
  return t.call('POST', '/api/post/create', { title: 'Follow me', description: 'Follow my page', category: 'Social Media', days: 1, maxCompletions: 3, needsHandle: true, photo: PNG, receipt: RCPT, ...over }, cookie);
}

test('pricing is exposed to signed-in users as a daily rate', async () => {
  const t = await setup();
  const u = await t.makeUser('u@example.com');
  assert.equal((await t.call('GET', '/api/post/pricing')).status, 401);
  const r = await t.call('GET', '/api/post/pricing', undefined, u);
  assert.equal(r.status, 200);
  assert.equal(r.json.perDayNaira, 1000);
  assert.equal(r.json.perDayTokens, 30);
  assert.equal(r.json.maxDays, 10);
  t.close();
});

test('a posted task starts pending_payment, is NOT live, and funds no reserve yet', async () => {
  const t = await setup();
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const r = await makePost(t, poster);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'pending_payment');
  assert.equal(r.json.pool, 90);
  assert.equal(await reserveAvailable(t.db), before);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 0);
  t.close();
});

test('bad posts are rejected: missing photo, missing receipt, bad duration', async () => {
  const t = await setup();
  const poster = await t.makeUser('poster@example.com');
  assert.equal((await makePost(t, poster, { photo: undefined })).status, 400);
  assert.equal((await makePost(t, poster, { receipt: undefined })).status, 400);
  assert.equal((await makePost(t, poster, { days: 11 })).status, 400);
  assert.equal((await makePost(t, poster, { maxCompletions: 0 })).status, 400);
  t.close();
});

test('admin confirms payment: task goes live and its pool funds the reserve exactly once', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const id = (await makePost(t, poster)).json.id;
  const queue = await t.call('GET', '/api/admin/posts', undefined, owner);
  assert.equal(queue.json.posts.length, 1);
  assert.equal(queue.json.posts[0].pool, 90);
  assert.equal((await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'Seen in bank' }, owner)).status, 200);
  assert.equal(await reserveAvailable(t.db), before + 90);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 1);
  assert.equal((await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'x' }, owner)).status, 409);
  assert.equal(await reserveAvailable(t.db), before + 90);
  t.close();
});

test('rejecting a post needs a reason and never funds the reserve', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const id = (await makePost(t, poster)).json.id;
  assert.equal((await t.call('POST', '/api/admin/posts/reject', { taskId: id }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/posts/reject', { taskId: id, note: 'Payment not received' }, owner)).status, 200);
  assert.equal(await reserveAvailable(t.db), before);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 0);
  t.close();
});

test('doers complete a posted task; reward comes from the funded pool, poster sees doers but not emails', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const doer = await t.makeUser('doer@example.com');
  const did = (await t.call('GET', '/api/auth/me', undefined, doer)).json.user.id;
  const id = (await makePost(t, poster, { maxCompletions: 1 })).json.id;
  await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'ok' }, owner);
  const afterFund = await reserveAvailable(t.db);
  await t.call('POST', '/api/tasks/accept', { taskId: id }, doer);
  let doers = await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster);
  assert.equal(doers.json.ongoing.length, 1);
  assert.equal(JSON.stringify(doers.json).includes('doer@example.com'), false);
  await t.call('POST', '/api/tasks/submit', { taskId: id, image: PNG, handle: '@someone' }, doer);
  doers = await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster);
  assert.equal(doers.json.completed.length, 1);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner);
  assert.equal(await balance(t.db, did), 30);
  assert.equal(await reserveAvailable(t.db), afterFund - 30);
  assert.equal(await reserveAvailable(t.db), 4800);
  t.close();
});

test('only the poster can see their doers; others are blocked', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const nosey = await t.makeUser('nosey@example.com');
  const id = (await makePost(t, poster)).json.id;
  await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'ok' }, owner);
  assert.equal((await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, nosey)).status, 404);
  assert.equal((await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster)).status, 200);
  t.close();
});

test('poster can edit their task within an hour of going live, not after; only the owner', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster-edit@example.com');
  const made = await makePost(t, poster, { title: 'First title' });
  const id = made.json.id;
  assert.equal((await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'paid' }, owner)).status, 200);
  const ok = await t.call('POST', '/api/post/edit', { taskId: id, title: 'Fixed title', description: 'Fixed description' }, poster);
  assert.equal(ok.status, 200);
  const mine = await t.call('GET', '/api/post/mine', undefined, poster);
  assert.equal(mine.json.tasks[0].title, 'Fixed title');
  const other = await t.makeUser('other-edit@example.com');
  assert.equal((await t.call('POST', '/api/post/edit', { taskId: id, title: 'X', description: 'Y' }, other)).status, 404);
  await t.db.prepare('UPDATE tasks SET went_live_at = ? WHERE id = ?').run(new Date(Date.now() - 2 * 3600_000).toISOString(), id);
  assert.equal((await t.call('POST', '/api/post/edit', { taskId: id, title: 'Too late', description: 'Too late' }, poster)).status, 403);
  t.close();
});
KREDILO_WAVE_EOF
echo "  server/test/posts.test.ts"
mkdir -p "server/test"
cat > "server/test/adminData.test.ts" <<'KREDILO_WAVE_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { creditReward } from '../src/ledger.ts';

const OWNER = 'owner@example.com';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;

async function reviewer(t: any, owner: string, email = 'rev@example.com') {
  const r = await t.call('POST', '/api/admin/invites', { email, role: 'reviewer' }, owner);
  const token = new URL(r.json.inviteUrl).searchParams.get('token')!;
  const c = await t.makeUser(email);
  await t.call('POST', '/api/admin/invites/accept', { token }, c);
  return c;
}

test('overview returns live counts for an admin, blocked for a normal user', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  await t.makeUser('a@example.com');
  await t.makeUser('b@example.com');
  await t.call('POST', '/api/admin/tasks', { title: 'T', description: 'D', category: 'Other', reward: 30, proofType: 'none', maxCompletions: 5 }, owner);
  const o = await t.call('GET', '/api/admin/overview', undefined, owner);
  assert.equal(o.status, 200);
  assert.equal(o.json.users, 2);
  assert.equal(o.json.liveTasks, 1);
  assert.equal(o.json.reserveTokens, 4800);
  assert.equal((await t.call('GET', '/api/admin/overview', undefined, await t.makeUser('x@example.com'))).status, 403);
  t.close();
});

test('users list shows balances; owner can suspend; suspended user is logged out and cannot log in', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  const uid = await meId(t, u);
  await creditReward(t.db, { userId: uid, tokens: 50, refType: 'x', refId: '1', idempotencyKey: 'k1', fromReserve: false });
  const list = await t.call('GET', '/api/admin/users', undefined, owner);
  const row = list.json.users.find((x: any) => x.email === 'u@example.com');
  assert.equal(row.balance, 50);
  assert.equal((await t.call('POST', '/api/admin/users/status', { userId: uid, suspend: true }, owner)).status, 200);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, u)).json.user, null);
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'u@example.com', password: 'correct horse battery' })).status, 403);
  assert.equal((await t.call('POST', '/api/admin/users/status', { userId: uid, suspend: false }, owner)).status, 200);
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'u@example.com', password: 'correct horse battery' })).status, 200);
  t.close();
});

test('owner cannot suspend themselves or another owner', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const ownerId = await meId(t, owner);
  assert.equal((await t.call('POST', '/api/admin/users/status', { userId: ownerId, suspend: true }, owner)).status, 400);
  t.close();
});

test('role gating: reviewer blocked from users/funding/ledger/audit; can see fraud', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const rev = await reviewer(t, owner);
  assert.equal((await t.call('GET', '/api/admin/users', undefined, rev)).status, 403);
  assert.equal((await t.call('GET', '/api/admin/funding', undefined, rev)).status, 403);
  assert.equal((await t.call('GET', '/api/admin/ledger', undefined, rev)).status, 403);
  assert.equal((await t.call('GET', '/api/admin/audit', undefined, rev)).status, 403);
  assert.equal((await t.call('GET', '/api/admin/fraud', undefined, rev)).status, 200);
  t.close();
});

test('funding breakdown reflects the seeded reserve and issued rewards', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('d@example.com');
  const tid = (await t.call('POST', '/api/admin/tasks', { title: 'T', description: 'D', category: 'Other', reward: 30, proofType: 'screenshot', maxCompletions: 2 }, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId: tid }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId: tid, image: PNG }, doer);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner);
  const f = (await t.call('GET', '/api/admin/funding', undefined, owner)).json;
  assert.equal(f.fundedTokens, 4800);
  assert.equal(f.issuedTokens, 30);
  assert.equal(f.availableTokens, 4770);
  t.close();
});

test('audit log endpoint returns recent actions for the owner', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  await t.call('POST', '/api/admin/tasks', { title: 'T', description: 'D', category: 'Other', reward: 30, proofType: 'none', maxCompletions: 1 }, owner);
  const a = await t.call('GET', '/api/admin/audit', undefined, owner);
  assert.ok(a.json.entries.length > 0);
  assert.ok(a.json.entries.some((e: any) => e.action === 'task.create'));
  t.close();
});

test('fraud endpoint returns the expected shape', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const f = (await t.call('GET', '/api/admin/fraud', undefined, owner)).json;
  assert.equal(typeof f.reusedScreenshots, 'number');
  assert.ok(Array.isArray(f.reusedHandles));
  assert.ok(Array.isArray(f.reusedBankAccounts));
  assert.equal(typeof f.notReceivedCount, 'number');
  t.close();
});

test('owner sends an announcement, sees it in history, and editing it updates what users see', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const reader = await t.makeUser('reader@example.com');
  const sent = await t.call('POST', '/api/admin/announce', { title: 'Withdrawals open', body: 'They open Friday' }, owner);
  assert.equal(sent.status, 200);
  assert.ok(sent.json.sent >= 1);
  const notifs = await t.call('GET', '/api/notifications', undefined, reader);
  assert.equal(notifs.json.notifications[0].title, 'Withdrawals open');
  const hist = await t.call('GET', '/api/admin/announcements', undefined, owner);
  assert.equal(hist.status, 200);
  assert.equal(hist.json.announcements[0].title, 'Withdrawals open');
  const annId = hist.json.announcements[0].id;
  assert.equal((await t.call('POST', '/api/admin/announcements/update', { id: annId, title: 'Withdrawals open now', body: 'They open today' }, owner)).status, 200);
  const after = await t.call('GET', '/api/notifications', undefined, reader);
  assert.equal(after.json.notifications[0].title, 'Withdrawals open now');
  assert.equal((await t.call('GET', '/api/admin/announcements', undefined, reader)).status, 403);
  t.close();
});

test('admin overview reports activity counts', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('active@example.com');
  // make a request as u so a last_seen row is written
  await t.call('GET', '/api/auth/me', undefined, u);
  const o = await t.call('GET', '/api/admin/overview', undefined, owner);
  assert.equal(o.status, 200);
  assert.ok(typeof o.json.usersActive === 'number');
  assert.ok(typeof o.json.usersRecent === 'number');
  t.close();
});
KREDILO_WAVE_EOF
echo "  server/test/adminData.test.ts"
mkdir -p "server/test"
cat > "server/test/games.test.ts" <<'KREDILO_WAVE_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { balance } from '../src/ledger.ts';

const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;

test('games pay once per day up to their cap, including the three new games', async () => {
  const t = await setup();
  const u = await t.makeUser('gamer@example.com');
  const status = await t.call('GET', '/api/games/status', undefined, u);
  assert.equal(status.status, 200);
  for (const g of ['stroop', 'math', 'tiles']) assert.ok(g in status.json.caps, `${g} missing from caps`);
  const cap = status.json.caps.stroop as number;
  const first = await t.call('POST', '/api/games/claim', { game: 'stroop', score: 9999 }, u);
  assert.equal(first.status, 200);
  assert.equal(first.json.already, false);
  assert.equal(first.json.kreds, cap);
  assert.equal(await balance(t.db, await meId(t, u)), cap);
  const second = await t.call('POST', '/api/games/claim', { game: 'stroop', score: 9999 }, u);
  assert.equal(second.json.already, true);
  assert.equal((await t.call('POST', '/api/games/claim', { game: 'nope', score: 5 }, u)).status, 400);
  t.close();
});
KREDILO_WAVE_EOF
echo "  server/test/games.test.ts"
mkdir -p "src/pages/games"
cat > "src/pages/games/ColorMatch.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' },
];
const SECONDS = 30;

type Prompt = { word: string; ink: string; match: boolean };
function nextPrompt(): Prompt {
  const wi = Math.floor(Math.random() * COLORS.length);
  const shouldMatch = Math.random() < 0.5;
  const ii = shouldMatch ? wi : (wi + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
  return { word: COLORS[wi].name, ink: COLORS[ii].hex, match: wi === ii };
}

export default function ColorMatch() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [prompt, setPrompt] = useState<Prompt>(nextPrompt);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setPrompt(nextPrompt()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const answer = (said: boolean) => {
    if (state !== 'playing') return;
    const correct = said === prompt.match;
    if (correct) setScore((s) => s + 1);
    setFlash(correct ? 'ok' : 'no');
    window.setTimeout(() => setFlash(null), 150);
    setPrompt(nextPrompt());
  };

  return (
    <GameShell title="Color Match" goal="Does the WORD match the COLOUR it is written in? Answer as many as you can in 30 seconds.">
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-40 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 'ok' ? 'border-emerald-400' : flash === 'no' ? 'border-red-400' : 'border-white/15'}`}>
            <span style={{ color: prompt.ink }}>{prompt.word}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => answer(true)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">Match</button>
            <button onClick={() => answer(false)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">No match</button>
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">correct in {SECONDS}s</p></div>
          <GameResult game="stroop" score={score * 2} headline={`You matched ${score} correctly!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/games/ColorMatch.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/MathSprint.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 30;
type Problem = { text: string; answer: number; options: number[] };

function makeProblem(): Problem {
  const ops = ['+', '-', '\u00d7'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  let answer: number;
  if (op === '+') answer = a + b;
  else if (op === '-') { if (b > a) { const tmp = a; a = b; b = tmp; } answer = a - b; }
  else answer = a * b;
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = Math.floor(Math.random() * 9) - 4;
    const cand = answer + delta + (delta === 0 ? 1 : 0);
    if (cand >= 0) set.add(cand);
  }
  const options = [...set].sort(() => Math.random() - 0.5);
  return { text: `${a} ${op} ${b}`, answer, options };
}

export default function MathSprint() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [problem, setProblem] = useState<Problem>(makeProblem);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setProblem(makeProblem()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const pick = (v: number) => {
    if (state !== 'playing') return;
    if (v === problem.answer) setScore((s) => s + 1);
    setFlash(v === problem.answer ? 1 : 0);
    window.setTimeout(() => setFlash(null), 120);
    setProblem(makeProblem());
  };

  return (
    <GameShell title="Math Sprint" goal="Solve as many as you can in 30 seconds. Tap the correct answer.">
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-32 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 1 ? 'border-emerald-400' : flash === 0 ? 'border-red-400' : 'border-white/15'}`}>{problem.text}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {problem.options.map((o) => (
              <button key={o} onClick={() => pick(o)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-xl font-extrabold hover:bg-white/10">{o}</button>
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">solved in {SECONDS}s</p></div>
          <GameResult game="math" score={score * 2} headline={`You solved ${score}!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/games/MathSprint.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/TapTiles.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 20;
const TILES = 9;

export default function TapTiles() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [active, setActive] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [miss, setMiss] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setActive(Math.floor(Math.random() * TILES)); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const tap = (i: number) => {
    if (state !== 'playing') return;
    if (i === active) {
      setScore((s) => s + 1);
      setActive((cur) => { let n = cur; while (n === cur) n = Math.floor(Math.random() * TILES); return n; });
    } else {
      setMiss(true); window.setTimeout(() => setMiss(false), 120);
    }
  };

  return (
    <GameShell title="Tap Tiles" goal="Tap the emerald tile as fast as you can. You have 20 seconds.">
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className={miss ? 'text-red-400' : 'text-white/50'}>{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: TILES }).map((_, i) => (
              <button key={i} onClick={() => tap(i)} aria-label="tile" className={`pressable aspect-square rounded-2xl border transition ${i === active ? 'border-emerald-400 bg-emerald-500/80' : 'border-white/15 bg-white/[0.04] hover:bg-white/10'}`} />
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">taps in {SECONDS}s</p></div>
          <GameResult game="tiles" score={score} headline={`You tapped ${score} tiles!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/games/TapTiles.tsx"
mkdir -p "src/pages/games"
cat > "src/pages/games/TriviaQuiz.tsx" <<'KREDILO_WAVE_EOF'
import { useMemo, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

type Q = { q: string; options: string[]; answer: number };

const BANK: Q[] = [
  { q: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], answer: 1 },
  { q: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
  { q: 'What is the chemical formula for water?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'In what year did Nigeria become independent?', options: ['1957', '1960', '1963', '1970'], answer: 1 },
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which Nigerian city is known as the “Centre of Excellence”?', options: ['Abuja', 'Lagos', 'Port Harcourt', 'Enugu'], answer: 1 },
  { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'], answer: 1 },
  { q: 'Which animal is known as the king of the jungle?', options: ['Tiger', 'Elephant', 'Lion', 'Leopard'], answer: 2 },
  { q: 'What is the currency of Nigeria?', options: ['Cedi', 'Naira', 'Franc', 'Shilling'], answer: 1 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'Which river is the longest in the world?', options: ['Amazon', 'Nile', 'Niger', 'Congo'], answer: 1 },
  { q: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit'], answer: 1 },
  { q: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { q: 'Who wrote “Things Fall Apart”?', options: ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Chimamanda Adichie'], answer: 1 },
  { q: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2 },
  { q: 'Which is NOT a primary colour?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 2 },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2 },
  { q: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], answer: 2 },
  { q: 'Who was the first President of Nigeria?', options: ['Nnamdi Azikiwe', 'Tafawa Balewa', 'Obafemi Awolowo', 'Yakubu Gowon'], answer: 0 },
  { q: 'What is the tallest mountain in Africa?', options: ['Mount Kenya', 'Mount Kilimanjaro', 'Mount Cameroon', 'Table Mountain'], answer: 1 },
  { q: 'Which country is the most populous in Africa?', options: ['Egypt', 'Ethiopia', 'Nigeria', 'South Africa'], answer: 2 },
  { q: 'What is the largest desert in the world?', options: ['Sahara', 'Gobi', 'Kalahari', 'Antarctic'], answer: 3 },
  { q: 'Which ocean lies to the south of Nigeria?', options: ['Indian', 'Atlantic', 'Pacific', 'Arctic'], answer: 1 },
  { q: 'What does WWW stand for?', options: ['World Wide Web', 'Web Wide World', 'Wide World Web', 'World Web Wide'], answer: 0 },
  { q: 'Which company makes the iPhone?', options: ['Samsung', 'Google', 'Apple', 'Nokia'], answer: 2 },
  { q: 'In football, how many players are on the pitch per team?', options: ['9', '10', '11', '12'], answer: 2 },
  { q: 'Which country won the 2022 FIFA World Cup?', options: ['France', 'Brazil', 'Argentina', 'Germany'], answer: 2 },
  { q: 'What does FC in a football club name usually mean?', options: ['Football Club', 'Final Cup', 'First Class', 'Field Centre'], answer: 0 },
  { q: 'Which Nigerian won a Nobel Prize in Literature?', options: ['Chinua Achebe', 'Wole Soyinka', 'Ben Okri', 'Femi Osofisan'], answer: 1 },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2 },
  { q: 'How many colours are in a rainbow?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { q: 'What is the main ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Pepper', 'Onion'], answer: 1 },
  { q: 'In anime, what is the ninja village of Naruto called?', options: ['Konoha', 'Suna', 'Kiri', 'Iwa'], answer: 0 },
  { q: 'Which anime features pirates searching for the One Piece?', options: ['Bleach', 'Naruto', 'One Piece', 'Fairy Tail'], answer: 2 },
  { q: 'In Dragon Ball, what is Goku\u2019s race?', options: ['Namekian', 'Saiyan', 'Human', 'Android'], answer: 1 },
  { q: 'What colour is Pikachu?', options: ['Red', 'Blue', 'Yellow', 'Green'], answer: 2 },
  { q: 'Which social app is known for short videos?', options: ['LinkedIn', 'TikTok', 'Reddit', 'Pinterest'], answer: 1 },
  { q: 'What does GPS stand for?', options: ['Global Positioning System', 'General Position Service', 'Global Position Service', 'Grid Point System'], answer: 0 },
  { q: 'How many minutes are in a full football match (excluding stoppage)?', options: ['80', '90', '100', '120'], answer: 1 },
  { q: 'What is the capital of Ghana?', options: ['Accra', 'Kumasi', 'Lagos', 'Lome'], answer: 0 },
  { q: 'Which is the longest river in Africa?', options: ['Niger', 'Congo', 'Nile', 'Zambezi'], answer: 2 },
  { q: 'What is 9 squared?', options: ['72', '81', '90', '99'], answer: 1 },
  { q: 'Which metal is liquid at room temperature?', options: ['Iron', 'Mercury', 'Aluminium', 'Copper'], answer: 1 },
  { q: 'What is the national sport most loved in Nigeria?', options: ['Cricket', 'Football', 'Rugby', 'Tennis'], answer: 1 },
  { q: 'Which artist sang \u201cEssence\u201d with Tems?', options: ['Burna Boy', 'Wizkid', 'Davido', 'Rema'], answer: 1 },
  { q: 'What does ATM stand for?', options: ['Automated Teller Machine', 'Any Time Money', 'Automatic Transfer Machine', 'Account Transaction Mode'], answer: 0 },
  { q: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], answer: 1 },
  { q: 'Which continent is Egypt in?', options: ['Asia', 'Europe', 'Africa', 'South America'], answer: 2 },
  { q: 'What is the boiling point of water in Celsius?', options: ['90', '100', '110', '120'], answer: 1 },
  { q: 'Which planet has the most rings?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  { q: 'What is the first letter of the Greek alphabet?', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: 0 },
];

const ROUND = 10;

function pickRound(): Q[] {
  const d = [...BANK];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d.slice(0, ROUND);
}

export default function TriviaQuiz() {
  const [round, setRound] = useState<Q[]>(pickRound);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const questions = round;
  const done = index >= questions.length;
  const cur = useMemo(() => questions[index], [questions, index]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[index].answer) setScore((s) => s + 1);
  };

  const restart = () => { setRound(pickRound()); setIndex(0); setPicked(null); setScore(0); };

  if (done) {
    return (
      <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
          <div className="text-6xl font-extrabold">{score}/{questions.length}</div>
          <p className="mt-2 text-white/60">correct answers</p>
        </div>
        <GameResult game="trivia" score={score * 4} headline={`You got ${score} of ${questions.length} right!`} />
        <button onClick={restart} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
      </GameShell>
    );
  }

  return (
    <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Question {index + 1}/{questions.length}</span>
        <span className="text-white/50">Score: {score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <h2 className="text-xl font-extrabold leading-snug">{cur.q}</h2>
      <div className="mt-4 space-y-2.5">
        {cur.options.map((o, i) => {
          const right = picked !== null && i === cur.answer;
          const wrong = picked === i && i !== cur.answer;
          return (
            <button
              key={o}
              onClick={() => pick(i)}
              className={`flex min-h-14 w-full items-center rounded-2xl border px-5 text-left text-sm font-bold transition ${
                right ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : wrong ? 'border-red-400 bg-red-500/15 text-red-300' : 'border-white/20 bg-white/[0.03] hover:bg-white/10'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          onClick={() => { setIndex((n) => n + 1); setPicked(null); }}
          className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
        >
          {index + 1 === questions.length ? 'See Result' : 'Next Question'}
        </button>
      )}
    </GameShell>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/games/TriviaQuiz.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/GamesHub.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Check, Flame, Gamepad2, LayoutGrid, ListChecks, Loader2, MousePointerClick, Palette, Target } from 'lucide-react';
import { getGamesStatus } from '../../lib/games';
import { claimStreak, getStreak } from '../../lib/streak';
import type { StreakStatus } from '../../lib/streak';
import { Kred } from '../../components/Kred';
import { SectionHeader } from '../../components/SectionHeader';

const games = [
  { key: 'snake', icon: Gamepad2, name: 'Snake', path: '/games/snake', max: 50, desc: 'Guide the snake, eat food and grow your score.', tile: 'from-emerald-500/25 to-emerald-500/[0.04]', fg: 'text-emerald-300' },
  { key: 'memory', icon: LayoutGrid, name: 'Memory Match', path: '/games/memory', max: 50, desc: 'Find matching pairs and complete the grid.', tile: 'from-violet-500/25 to-violet-500/[0.04]', fg: 'text-violet-300' },
  { key: 'reaction', icon: MousePointerClick, name: 'Reaction Test', path: '/games/reaction', max: 30, desc: 'Tap as fast as you can when the signal appears.', tile: 'from-amber-500/25 to-amber-500/[0.04]', fg: 'text-amber-300' },
  { key: 'trivia', icon: ListChecks, name: 'Trivia Quiz', path: '/games/trivia', max: 40, desc: 'Answer questions and test your knowledge.', tile: 'from-sky-500/25 to-sky-500/[0.04]', fg: 'text-sky-300' },
  { key: 'stroop', icon: Palette, name: 'Color Match', path: '/games/color', max: 40, desc: 'Does the word match its colour? Beat the clock.', tile: 'from-rose-500/25 to-rose-500/[0.04]', fg: 'text-rose-300' },
  { key: 'math', icon: Calculator, name: 'Math Sprint', path: '/games/math', max: 40, desc: 'Solve as many problems as you can in 30 seconds.', tile: 'from-indigo-500/25 to-indigo-500/[0.04]', fg: 'text-indigo-300' },
  { key: 'tiles', icon: Target, name: 'Tap Tiles', path: '/games/tiles', max: 30, desc: 'Tap the emerald tile as fast as you can.', tile: 'from-teal-500/25 to-teal-500/[0.04]', fg: 'text-teal-300' },
];

// Which day of the current 7-day cycle the streak is on (0 when the streak is broken).
const dayInWeek = (streak: number) => (streak <= 0 ? 0 : ((streak - 1) % 7) + 1);

// Flame with a ring that fills across the week; tap to open the streak details.
function StreakBadge({ streak, open, onToggle }: { streak: StreakStatus; open: boolean; onToggle: () => void }) {
  const s = streak.streak;
  const diw = dayInWeek(s);
  const R = 18;
  const C = 2 * Math.PI * R;
  const weeks = Math.floor(s / 7);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={onToggle} aria-label="Your streak" aria-expanded={open} className="pressable relative flex h-12 w-12 items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
          <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
          <circle cx="24" cy="24" r={R} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - diw / 7)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
        </svg>
        <Flame size={20} className={s > 0 ? 'text-emerald-400' : 'text-white/35'} fill={s > 0 ? 'currentColor' : 'none'} />
      </button>

      {open && <div className="fixed inset-0 z-20" onClick={onToggle} />}
      <div className={`absolute right-0 top-14 z-30 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#0e0e0e] p-4 shadow-[0_14px_44px_-14px_rgba(0,0,0,0.95)] transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
        <div className="flex items-center gap-2 text-lg font-extrabold"><Flame size={20} className="text-emerald-400" fill="currentColor" /> {s}-day streak</div>
        <p className="mt-0.5 text-xs text-white/50">{streak.claimedToday ? 'Claimed today — nice! 🔥' : 'Claim today to keep it alive'}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-white/40">
          <span>This week</span><span>Day {diw} / 7</span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < diw ? 'bg-emerald-400' : 'bg-white/10'}`} />
          ))}
        </div>
        {weeks >= 1 && <div className="mt-2.5 text-xs font-bold text-emerald-300">🎉 {weeks} full week{weeks === 1 ? '' : 's'} completed</div>}
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">Miss a day and your streak resets to zero.</p>
      </div>
    </div>
  );
}

// Only shows when there's a reward to claim; disappears once claimed and returns tomorrow.
function ClaimCard({ streak, onClaimed }: { streak: StreakStatus; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const claim = async () => {
    setBusy(true); setErr('');
    try { await claimStreak(); onClaimed(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not claim.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="animate-[popin_260ms_ease-out] overflow-hidden rounded-[1.75rem] border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.14] to-transparent p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Flame size={26} fill="currentColor" /></span>
          <div>
            <div className="text-lg font-extrabold">Daily reward ready</div>
            <div className="text-sm text-white/60">Claim +{streak.todayReward} kreds and grow your streak</div>
          </div>
        </div>
        <button type="button" onClick={claim} disabled={busy} className="pressable shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Claim'}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}

export default function GamesHub() {
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const loadStreak = () => getStreak().then(setStreak).catch(() => {});
  useEffect(() => {
    getGamesStatus().then((s) => setClaimed(s.claimed)).catch(() => {});
    loadStreak();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Games"
        info="Play built-in games and earn kreds — once a day per game. Play your best round, then claim your reward."
        right={streak ? <StreakBadge streak={streak} open={badgeOpen} onToggle={() => setBadgeOpen((o) => !o)} /> : undefined}
      />

      {streak && !streak.claimedToday && <ClaimCard streak={streak} onClaimed={loadStreak} />}

      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((g) => {
          const done = g.key in claimed;
          return (
            <Link key={g.key} to={g.path} className="pressable flex flex-col rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/35">
              <span className={`relative flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br ${g.tile}`}>
                <g.icon size={44} strokeWidth={1.5} className={g.fg} />
                {done && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-black"><Check size={11} /> Done today</span>}
              </span>
              <h2 className="mt-3 text-xl font-extrabold">{g.name}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-white/55">{g.desc}</p>
              <span className="mt-3 flex min-h-11 items-center justify-between rounded-full border border-white/20 px-4 text-xs font-bold">
                <span className="flex items-center gap-1">{done ? `Earned ${claimed[g.key]}` : `Up to ${g.max}`} <Kred size={12} /></span>
                <ArrowRight size={15} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/dashboard/GamesHub.tsx"
mkdir -p "src"
cat > "src/App.tsx" <<'KREDILO_WAVE_EOF'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import PostTask from './pages/dashboard/PostTask';
import AdminPayments from './pages/admin/AdminPayments';
import { DashboardLayout } from './components/DashboardLayout';
import Home from './pages/Home';
import { AuthProvider } from './lib/auth';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import HowItWorks from './pages/HowItWorks';
import Games from './pages/Games';
import FAQ from './pages/FAQ';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AccountRecovery from './pages/auth/AccountRecovery';
import RegistrationSuccess from './pages/auth/RegistrationSuccess';
import Dashboard from './pages/dashboard/Dashboard';
import Wallet from './pages/dashboard/Wallet';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import TaskDetails from './pages/dashboard/TaskDetails';
import GamesHub from './pages/dashboard/GamesHub';
import SnakeGame from './pages/games/Snake';
import MemoryMatch from './pages/games/MemoryMatch';
import ReactionTest from './pages/games/ReactionTest';
import TriviaQuiz from './pages/games/TriviaQuiz';
import ColorMatch from './pages/games/ColorMatch';
import MathSprint from './pages/games/MathSprint';
import TapTiles from './pages/games/TapTiles';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import RewardPolicy from './pages/RewardPolicy';
import { AdminLayout } from './components/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminTasks from './pages/admin/AdminTasks';
import AdminFunding from './pages/admin/AdminFunding';
import AdminTeam from './pages/admin/AdminTeam';
import AcceptInvite from './pages/admin/AcceptInvite';
import AdminSection from './pages/admin/AdminSection';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLedger from './pages/admin/AdminLedger';
import AdminAudit from './pages/admin/AdminAudit';
import AdminFraud from './pages/admin/AdminFraud';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/explore" element={<Navigate to="/signup" replace />} />
          <Route path="/tasks" element={<Navigate to="/signup" replace />} />
          <Route path="/games" element={<Games />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/rewards-policy" element={<RewardPolicy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/recover" element={<AccountRecovery />} />
          <Route path="/welcome" element={<RegistrationSuccess />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin-invite" element={<AcceptInvite />} />
        </Route>

        {/* User Dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tasks" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/tasks/:id" element={<TaskDetails />} />
          <Route path="/dashboard/my-tasks" element={<Navigate to="/dashboard?tab=mine" replace />} />
          <Route path="/dashboard/wallet" element={<Wallet />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/dashboard/post" element={<PostTask />} />
          <Route path="/dashboard/games" element={<GamesHub />} />
          <Route path="/games/snake" element={<SnakeGame />} />
          <Route path="/games/memory" element={<MemoryMatch />} />
          <Route path="/games/reaction" element={<ReactionTest />} />
          <Route path="/games/trivia" element={<TriviaQuiz />} />
          <Route path="/games/color" element={<ColorMatch />} />
          <Route path="/games/math" element={<MathSprint />} />
          <Route path="/games/tiles" element={<TapTiles />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="tasks" element={<AdminTasks />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="funding" element={<AdminFunding />} />
          <Route path="ledger" element={<AdminLedger />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="fraud" element={<AdminFraud />} />
          <Route path="team" element={<AdminTeam />} />
          <Route path=":section" element={<AdminSection />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter></AuthProvider>
  );
}

export default App;
KREDILO_WAVE_EOF
echo "  src/App.tsx"
mkdir -p "src/lib"
cat > "src/lib/adminData.ts" <<'KREDILO_WAVE_EOF'
import { apiRequest } from './auth';

export type Overview = {
  users: number; admins: number; liveTasks: number; pendingReviews: number;
  pendingPosts: number; openWithdrawals: number; usersActive: number; usersRecent: number; reserveTokens: number; reserveNaira: number; reserveLow: boolean;
};
export type AdminUser = { id: string; email: string; role: string; status: string; emailVerified: boolean; balance: number; createdAt: string; avatar: string | null; lastSeen: string | null };
export type Funding = {
  rate: { tokens: number; naira: number };
  fundedTokens: number; fundedNaira: number; issuedTokens: number; issuedNaira: number;
  availableTokens: number; availableNaira: number; heldForWithdrawalTokens: number; heldForWithdrawalNaira: number;
};
export type LedgerEntry = { amount: number; reason: string; refType: string | null; email: string; at: string };
export type AuditEntry = { action: string; target: string | null; meta: string | null; actor: string | null; at: string };
export type Fraud = { reusedScreenshots: number; reusedHandles: { handle: string; accounts: number }[]; reusedBankAccounts: { bank: string; last4: string; accounts: number }[]; notReceivedCount: number };

export const getOverview = () => apiRequest<Overview>('/api/admin/overview');
export const getUsers = (q?: string) => apiRequest<{ users: AdminUser[] }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.users);
export const setUserStatus = (userId: string, suspend: boolean) => apiRequest('/api/admin/users/status', { userId, suspend });
export const getFunding = () => apiRequest<Funding>('/api/admin/funding');
export const addFunding = (tokens: number) => apiRequest<{ availableTokens: number; availableNaira: number }>('/api/admin/funding', { tokens });
export const setExchangeRate = (kreds: number, naira: number) => apiRequest<{ rate: { tokens: number; naira: number } }>('/api/admin/rate', { kreds, naira });
export type Announcement = { id: string; title: string; body: string | null; image: string | null; sentCount: number; createdAt: string; updatedAt: string | null; sender: string | null };
export const sendAnnouncement = (title: string, body: string, image?: string) => apiRequest<{ sent: number }>('/api/admin/announce', { title, body, image });
export const getAnnouncements = () => apiRequest<{ announcements: Announcement[] }>('/api/admin/announcements').then((r) => r.announcements);
export const updateAnnouncement = (id: string, title: string, body: string) => apiRequest('/api/admin/announcements/update', { id, title, body });
export const getLedger = () => apiRequest<{ entries: LedgerEntry[] }>('/api/admin/ledger').then((r) => r.entries);
export const getAudit = () => apiRequest<{ entries: AuditEntry[] }>('/api/admin/audit').then((r) => r.entries);
export const getFraud = () => apiRequest<Fraud>('/api/admin/fraud');
KREDILO_WAVE_EOF
echo "  src/lib/adminData.ts"
mkdir -p "src/lib"
cat > "src/lib/admin.ts" <<'KREDILO_WAVE_EOF'
import { apiRequest } from './auth';

export type AdminTask = {
  id: string; title: string; category: string; reward: number; proofType: string;
  needsHandle: boolean; remaining: number; maxCompletions: number; approvedCount: number; status: string;
};
export type PendingSubmission = {
  id: string; taskId: string; title: string; reward: number; handle: string | null;
  proofFile: string | null; proofText: string | null; submittedAt: string | null;
};

export const createTask = (body: {
  title: string; description: string; category: string; reward: number; proofType: string; needsHandle: boolean;
  maxCompletions: number; photo?: string; link?: string;
}) => apiRequest<{ task: AdminTask }>('/api/admin/tasks', body);

export const updateTask = (taskId: string, body: {
  title: string; description: string; category: string; reward: number; proofType: string; needsHandle: boolean;
  maxCompletions: number; photo?: string; link?: string;
}) => apiRequest<{ task: AdminTask }>('/api/admin/tasks/update', { taskId, ...body });

export const listPendingSubmissions = () => apiRequest<{ submissions: PendingSubmission[] }>('/api/admin/submissions').then((r) => r.submissions);
export const approveSubmission = (submissionId: string) => apiRequest('/api/admin/submissions/approve', { submissionId });
export const rejectSubmission = (submissionId: string, reason: string) => apiRequest('/api/admin/submissions/reject', { submissionId, reason });
export const deleteTask = (taskId: string) => apiRequest('/api/admin/tasks/delete', { taskId });
export const closeTask = (taskId: string) => apiRequest('/api/admin/tasks/close', { taskId });
KREDILO_WAVE_EOF
echo "  src/lib/admin.ts"
mkdir -p "src/lib"
cat > "src/lib/posts.ts" <<'KREDILO_WAVE_EOF'
import { apiRequest } from './auth';

export type PostPricing = {
  perDayNaira: number;
  perDayTokens: number;
  maxDays: number;
  categories: string[];
  payTo: { bankName: string; accountName: string; accountNumber: string };
};
export type PostedTask = {
  id: string; title: string; description: string; category: string; reward: number; needsHandle: boolean;
  photo: string | null; link: string | null; days: number | null; priceNaira: number | null; maxCompletions: number;
  approvedCount: number; status: string; paymentNote: string | null; expiresAt: string | null; canEdit: boolean;
};
export type Doer = { id: string; status: string; handle: string | null; proofFile: string | null; submittedAt: string | null };
export type AdminPost = {
  id: string; title: string; description: string; category: string; reward: number; maxCompletions: number;
  days: number | null; priceNaira: number | null; pool: number; photo: string | null; receipt: string | null; link: string | null; createdAt: string;
};

export const getPostPricing = () => apiRequest<PostPricing>('/api/post/pricing');
export const createPost = (body: { title: string; description: string; category: string; days: number; maxCompletions: number; needsHandle: boolean; photo: string; receipt: string; link?: string }) =>
  apiRequest<{ id: string; status: string; priceNaira: number; reward: number; pool: number }>('/api/post/create', body);
export const listMyPosts = () => apiRequest<{ tasks: PostedTask[] }>('/api/post/mine').then((r) => r.tasks);
export const editPost = (body: { taskId: string; title: string; description: string; link?: string; photo?: string }) => apiRequest('/api/post/edit', body);
export const getPostDoers = (taskId: string) => apiRequest<{ ongoing: Doer[]; completed: Doer[] }>(`/api/post/doers?taskId=${encodeURIComponent(taskId)}`);

export const listAdminPosts = () => apiRequest<{ posts: AdminPost[] }>('/api/admin/posts').then((r) => r.posts);
export const confirmPost = (taskId: string, note: string) => apiRequest('/api/admin/posts/confirm', { taskId, note });
export const rejectPost = (taskId: string, note: string) => apiRequest('/api/admin/posts/reject', { taskId, note });
export const setPostRate = (perDayNaira: number, perDayTokens: number) => apiRequest<{ perDayNaira: number; perDayTokens: number }>('/api/admin/post-rate', { perDayNaira, perDayTokens });

export const postStatusLabel: Record<string, string> = {
  pending_payment: 'Awaiting payment confirmation',
  live: 'Live',
  closed: 'Finished',
  rejected: 'Rejected',
};
KREDILO_WAVE_EOF
echo "  src/lib/posts.ts"
mkdir -p "src/lib"
cat > "src/lib/notifications.ts" <<'KREDILO_WAVE_EOF'
import { apiRequest } from './auth';

export type Notification = {
  id: string; type: string; title: string; body: string | null;
  refType: string | null; refId: string | null; image: string | null; read: boolean; createdAt: string;
};

export const listNotifications = () => apiRequest<{ notifications: Notification[]; unread: number }>('/api/notifications');
export const getUnreadCount = () => apiRequest<{ unread: number }>('/api/notifications/unread').then((r) => r.unread);
export const markRead = (id?: string) => apiRequest<{ unread: number }>('/api/notifications/read', id ? { id } : {});

// Where a notification should take the user when tapped. null = not tappable
// (e.g. broadcast announcements, which have no target).
export function notificationHref(n: Notification): string | null {
  switch (n.type) {
    case 'task_approved':
      // The task is usually gone once completed — send them to their earnings.
      return '/dashboard/wallet';
    case 'task_rejected':
      // Still live for a resubmit in most cases.
      return n.refId ? `/dashboard/tasks/${n.refId}` : '/dashboard/wallet';
    case 'referral_bonus':
      return '/dashboard/profile';
    case 'post_submission':
    case 'post_live':
    case 'post_rejected':
      return '/dashboard/post';
    case 'withdrawal_paid':
    case 'withdrawal_cancelled':
      return '/dashboard/wallet';
    default:
      return null;
  }
}

// Short relative time like "3h ago", "2d ago", "just now".
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
KREDILO_WAVE_EOF
echo "  src/lib/notifications.ts"
mkdir -p "src/pages/admin"
cat > "src/pages/admin/AdminTasks.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ClipboardList, ImageUp, Link2, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { createTask, deleteTask, updateTask } from '../../lib/admin';
import { fileToDataUrl, listTasks } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';
import { Kred } from '../../components/Kred';
import { Field, FormSection, SelectInput, Toggle, inputCls } from '../../components/Field';

const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reward, setReward] = useState('30');
  const [proofType, setProofType] = useState('screenshot');
  const [needsHandle, setNeedsHandle] = useState(false);
  const [maxCompletions, setMaxCompletions] = useState('50');
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => listTasks().then(setTasks).catch(() => setTasks([]));
  useEffect(() => { void load(); }, []);

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try { setPhoto(await fileToDataUrl(f)); setError(''); } catch { setError('Could not read that image.'); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory(CATEGORIES[0]); setReward('30'); setProofType('screenshot');
    setNeedsHandle(false); setMaxCompletions('50'); setLink(''); setPhoto(''); setEditingId(null);
  };
  const startEdit = (t: Task) => {
    setEditingId(t.id); setTitle(t.title); setDescription(t.description); setCategory(t.category);
    setReward(String(t.reward)); setProofType(t.proofType); setNeedsHandle(t.needsHandle);
    setMaxCompletions(String(t.maxCompletions)); setLink(t.link ?? ''); setPhoto(''); setError(''); setOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { title, description, category, reward: Number(reward), proofType, needsHandle, maxCompletions: Number(maxCompletions), link: link || undefined, photo: photo || undefined };
    try {
      if (editingId) await updateTask(editingId, body);
      else await createTask(body);
      setOpen(false); resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally { setBusy(false); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Delete "${t.title}"? This removes the task and all its submissions. This cannot be undone.`)) return;
    setRemoving(t.id); setError('');
    try { await deleteTask(t.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the task.'); }
    finally { setRemoving(''); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks"
        info="Create tasks and set their rewards. Rewards are funded from the reserve."
        right={
          <button onClick={() => { if (open) { setOpen(false); } else { resetForm(); setOpen(true); } }} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
            <Plus size={16} /> {open ? 'Close' : 'New task'}
          </button>
        }
      />

      {open && (
        <form onSubmit={submit} className="animate-[popin_240ms_ease-out] space-y-4">
          {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {editingId && <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300">Editing an existing task</p>}

          <FormSection title="Task details" subtitle="What should the doer do?" icon={<ClipboardList size={18} />}>
            <Field label="Task title"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow our X account" className={inputCls} /></Field>
            <Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Clear step-by-step instructions" className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category"><SelectInput value={category} onChange={setCategory} ariaLabel="Category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput></Field>
              <Field label="Proof type"><SelectInput value={proofType} onChange={setProofType} ariaLabel="Proof type">
                <option value="screenshot">Screenshot proof</option>
                <option value="link">Link proof</option>
                <option value="text">Text proof</option>
                <option value="none">No proof</option>
              </SelectInput></Field>
            </div>
          </FormSection>

          <FormSection title="Reward & limits" icon={<Settings2 size={18} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reward (kreds)"><input required type="number" min="1" value={reward} onChange={(e) => setReward(e.target.value)} className={inputCls} /></Field>
              <Field label="Max completions"><input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={inputCls} /></Field>
            </div>
            <Toggle on={needsHandle} onChange={setNeedsHandle} label="Require a social handle" />
          </FormSection>

          <FormSection title="Link & image" subtitle="Optional" icon={<Link2 size={18} />}>
            <Field label="Link to complete the task" hint="For tasks done on another site."><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://..." className={inputCls} /></Field>
            <Field label="Task image">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="pressable flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 bg-black/30 text-sm text-white/55 hover:border-white/45">
                {photo ? <img src={photo} alt="" className="max-h-32 rounded-xl" /> : <><ImageUp size={24} /> Tap to add an image</>}
              </button>
            </Field>
          </FormSection>

          <button disabled={busy} className="pressable min-h-14 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">{busy ? 'Saving...' : editingId ? 'Save changes' : 'Create & publish task'}</button>
        </form>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Live tasks</h2>
        <div className="mt-3 divide-y divide-white/5">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{t.title}</div>
                <div className="text-xs text-white/45">{t.category} · {t.approvedCount}/{t.maxCompletions} done · {t.proofType}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-400"><Kred size={14} /> {t.reward}</div>
                <button onClick={() => startEdit(t)} aria-label="Edit task" className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(t)} disabled={removing === t.id} aria-label="Delete task" className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-3 text-sm text-white/45">No live tasks yet. Create one above.</p>}
        </div>
      </section>
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/admin/AdminTasks.tsx"
mkdir -p "src/pages/admin"
cat > "src/pages/admin/AdminSettings.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, ImageUp, Loader2, Lock, Megaphone, Pencil } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getWithdrawalSettings, setWithdrawalOpen } from '../../lib/withdrawals';
import { getPostPricing, setPostRate } from '../../lib/posts';
import { getAnnouncements, sendAnnouncement, updateAnnouncement } from '../../lib/adminData';
import type { Announcement } from '../../lib/adminData';
import { fileToDataUrl } from '../../lib/tasks';
import { Kred } from '../../components/Kred';

// Blast a notification to every user, with an optional image, plus an editable history.
function Announce() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = () => getAnnouncements().then(setHistory).catch(() => {});
  useEffect(() => { void loadHistory(); }, []);

  const onImage = async (f: File | undefined) => {
    if (!f) return;
    try { setImage(await fileToDataUrl(f, 1280)); } catch { setNote('Could not read that image.'); }
  };
  const send = async () => {
    setBusy(true); setNote('');
    try {
      const r = await sendAnnouncement(title.trim(), body.trim(), image || undefined);
      setTitle(''); setBody(''); setImage('');
      setNote(`Sent to ${r.sent} user${r.sent === 1 ? '' : 's'}.`);
      await loadHistory();
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not send.'); }
    finally { setBusy(false); }
  };
  const saveEdit = async (id: string) => {
    try { await updateAnnouncement(id, editTitle.trim(), editBody.trim()); setEditId(null); await loadHistory(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not update.'); }
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Megaphone size={20} /></span>
        <div>
          <h2 className="font-extrabold">Announcement</h2>
          <p className="text-xs text-white/50">Send one notification to every user at once.</p>
        </div>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Withdrawals open Friday!)" className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message (optional)" className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-white/40" />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/5"><ImageUp size={16} /> {image ? 'Image added' : 'Add image (optional)'}</button>
          {image && <img src={image} alt="" className="h-11 w-11 rounded-xl object-cover" />}
          {image && <button type="button" onClick={() => setImage('')} className="text-xs font-bold text-white/50 underline">Remove</button>}
        </div>
        <button disabled={busy || !title.trim()} onClick={send} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Send to everyone
        </button>
        {note && <span className="ml-3 text-xs text-white/60">{note}</span>}

        {history.length > 0 && (
          <div className="mt-2 border-t border-white/[0.06] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Past announcements</h3>
            <div className="mt-2 space-y-2">
              {history.map((a) => (
                <div key={a.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  {editId === a.id ? (
                    <div className="space-y-2">
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/40" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(a.id)} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{a.title}</div>
                        {a.body && <div className="mt-0.5 text-xs text-white/55">{a.body}</div>}
                        <div className="mt-1 text-[11px] text-white/35">Sent to {a.sentCount} · {new Date(a.createdAt).toLocaleDateString()}{a.updatedAt ? ' · edited' : ''}</div>
                      </div>
                      <button onClick={() => { setEditId(a.id); setEditTitle(a.title); setEditBody(a.body ?? ''); }} aria-label="Edit announcement" className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10"><Pencil size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniCountdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(diff / 86_400_000), h = Math.floor((diff % 86_400_000) / 3_600_000), m = Math.floor((diff % 3_600_000) / 60_000), s = Math.floor((diff % 60_000) / 1000);
  const parts: [number, string][] = [[d, 'd'], [h, 'h'], [m, 'm'], [s, 's']];
  return (
    <span className="tabular-nums font-extrabold">
      {parts.map(([v, l]) => `${v}${l}`).join(' ')}
    </span>
  );
}

function Withdrawals() {
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => getWithdrawalSettings().then((s) => { setOpensAt(s.opensAt); setIsOpen(s.isOpen); if (s.opensAt) setValue(s.opensAt.slice(0, 16)); }).catch(() => {});
  useEffect(() => { void load(); }, []);

  const save = async (iso: string | null) => {
    setBusy(true); setNote('');
    try { await setWithdrawalOpen(iso); await load(); setNote('Saved.'); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><CalendarClock size={20} /></span>
        <div>
          <h2 className="font-extrabold">Withdrawals</h2>
          <p className="text-xs text-white/50">Set when payouts open to everyone.</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-400/15 text-amber-300'}`}>
          {isOpen ? <><Check size={14} /> Open now</> : <><Lock size={14} /> Closed</>}
        </div>
        {!isOpen && opensAt && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
            <div className="text-white/50">Opens in</div>
            <div className="mt-0.5 text-lg"><MiniCountdown to={opensAt} /></div>
            <div className="mt-1 text-xs text-white/45">{new Date(opensAt).toLocaleString()}</div>
          </div>
        )}
        <label className="mt-4 block text-sm font-bold">Go-live date & time</label>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy || !value} onClick={() => save(new Date(value).toISOString())} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Set open date</button>
          <button disabled={busy} onClick={() => save(null)} className="pressable min-h-11 rounded-full border border-white/20 px-6 text-sm font-bold">Close withdrawals</button>
        </div>
        {note && <p className="mt-2 text-xs text-white/60">{note}</p>}
      </div>
    </section>
  );
}

function PostingRate() {
  const [naira, setNaira] = useState('');
  const [tokens, setTokens] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => getPostPricing().then((p) => { setNaira(String(p.perDayNaira)); setTokens(String(p.perDayTokens)); }).catch(() => {});
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setBusy(true); setNote('');
    try { await setPostRate(Number(naira), Number(tokens)); setNote('Saved.'); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <div>
          <h2 className="font-extrabold">Posting rate</h2>
          <p className="text-xs text-white/50">What users pay per day to post a task, and the kreds each doer earns per day.</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <label className="mb-1 block text-xs text-white/50">Price per day (₦)</label>
          <input type="number" min="1" value={naira} onChange={(e) => setNaira(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs text-white/50">Kreds per day <Kred size={11} /></label>
          <input type="number" min="1" value={tokens} onChange={(e) => setTokens(e.target.value)} className="h-12 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm outline-none transition focus:border-white/40" />
        </div>
        <div className="sm:col-span-2">
          <button disabled={busy || !naira || !tokens} onClick={save} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Save rate</button>
          {note && <span className="ml-3 text-xs text-white/60">{note}</span>}
        </div>
      </div>
    </section>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" info="Platform controls." />
      <div className="stagger space-y-4">
        <Withdrawals />
        <PostingRate />
        <Announce />
      </div>
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/admin/AdminSettings.tsx"
mkdir -p "src/pages/admin"
cat > "src/pages/admin/AdminUsers.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getUsers, setUserStatus } from '../../lib/adminData';
import type { AdminUser } from '../../lib/adminData';
import { useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';

// Activity colour: emerald = seen in the last 5 minutes, amber = within the hour, red = older or never.
function activity(lastSeen: string | null): { color: string; label: string } {
  if (!lastSeen) return { color: 'bg-red-500', label: 'inactive' };
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 5) return { color: 'bg-emerald-400', label: 'active now' };
  if (mins < 60) return { color: 'bg-amber-400', label: 'recently active' };
  return { color: 'bg-red-500', label: 'inactive' };
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => getUsers(q).then(setUsers).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [q]);

  const toggle = async (u: AdminUser) => {
    setBusy(u.id); setError('');
    try { await setUserStatus(u.id, u.status !== 'suspended'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Users" info="Everyone with a Kredilo account." />
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email..." className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-white/30" />
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!users && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      <div className="space-y-2">
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative shrink-0">
                <Avatar src={u.avatar} name={u.email} size={40} />
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0e0e0e] ${activity(u.lastSeen).color}`} title={activity(u.lastSeen).label} />
              </span>
              <div className="min-w-0">
              <div className="truncate font-bold">{u.email}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span>{u.role === 'user' ? 'member' : u.role}</span>
                <span>· {u.balance.toLocaleString()} kreds</span>
                {u.emailVerified ? <span className="text-emerald-400">· verified</span> : <span className="text-amber-300">· unverified</span>}
                {u.status === 'suspended' && <span className="text-red-400">· suspended</span>}
                <span>· {activity(u.lastSeen).label}</span>
              </div>
              </div>
            </div>
            {user?.role === 'owner' && u.role !== 'owner' && (
              <button disabled={busy === u.id} onClick={() => toggle(u)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold disabled:opacity-50 ${u.status === 'suspended' ? 'border-emerald-400/40 text-emerald-300' : 'border-white/20'}`}>
                {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
              </button>
            )}
          </div>
        ))}
        {users && users.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No users found.</p>}
      </div>
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/admin/AdminUsers.tsx"
mkdir -p "src/pages/admin"
cat > "src/pages/admin/AdminOverview.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getOverview } from '../../lib/adminData';
import type { Overview } from '../../lib/adminData';

export default function AdminOverview() {
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getOverview().then(setO).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  const cards = o ? [
    { label: 'Users', value: o.users.toLocaleString(), to: '/admin/users' },
    { label: 'Active now', value: o.usersActive.toLocaleString(), to: '/admin/users' },
    { label: 'Admins', value: o.admins.toLocaleString(), to: '/admin/team' },
    { label: 'Live tasks', value: o.liveTasks.toLocaleString(), to: '/admin/tasks' },
    { label: 'Pending reviews', value: o.pendingReviews.toLocaleString(), to: '/admin/submissions' },
    { label: 'Posted tasks to confirm', value: o.pendingPosts.toLocaleString(), to: '/admin/payments' },
    { label: 'Open withdrawals', value: o.openWithdrawals.toLocaleString(), to: '/admin/withdrawals' },
  ] : [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Admin" info="Live operations overview." />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!o && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}

      {o && (
        <>
          {o.reserveLow && (
            <Link to="/admin/funding" className="flex items-start gap-3 rounded-3xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200 transition hover:bg-amber-400/15">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-extrabold">Reward reserve is running low</div>
                <div className="mt-0.5 text-amber-200/80">Only {o.reserveTokens.toLocaleString()} kreds left. Top up in Funding before rewards start failing for users.</div>
              </div>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
                <div className="text-sm font-semibold text-white/50">{c.label}</div>
                <div className="mt-1 text-3xl font-extrabold">{c.value}</div>
              </Link>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
            <div className="text-sm font-semibold text-white/50">Reward reserve remaining</div>
            <div className="mt-1 text-4xl font-extrabold">{o.reserveTokens.toLocaleString()} kreds</div>
            <div className="mt-1 text-sm text-white/45">≈ ₦{o.reserveNaira.toLocaleString()} left to fund rewards</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
            <div className="text-sm font-semibold text-white/50">User activity</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> {o.usersActive.toLocaleString()} active now</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> {o.usersRecent.toLocaleString()} recently active</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {Math.max(0, o.users - o.usersActive - o.usersRecent).toLocaleString()} inactive</span>
            </div>
            <div className="mt-2 text-xs text-white/40">Active = seen in the last 5 minutes. Recently active = within the hour.</div>
          </div>
        </>
      )}
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/admin/AdminOverview.tsx"
mkdir -p "src/pages/admin"
cat > "src/pages/admin/AdminTeam.tsx" <<'KREDILO_WAVE_EOF'
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Trash2, UserPlus } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { SelectInput } from '../../components/Field';
import { apiRequest } from '../../lib/auth';

type Member = { id: string; email: string; role: string; createdAt: string };
type Invite = { id: string; email: string; role: string; expiresAt: string; createdAt: string };
type InviteRole = 'reviewer' | 'support';

const roleText: Record<string, string> = {
  owner: 'Owner: everything, including funding and settings',
  reviewer: 'Reviewer: reviews submissions and fraud flags',
  support: 'Support: read-only access to users',
};

export default function AdminTeam() {
  const [team, setTeam] = useState<{ members: Member[]; invites: Invite[] } | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('reviewer');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeam(await apiRequest<{ members: Member[]; invites: Invite[] }>('/api/admin/team'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the team.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const sendInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLink('');
    setCopied(false);
    await act(async () => {
      const r = await apiRequest<{ inviteUrl: string }>('/api/admin/invites', { email, role });
      setLink(r.inviteUrl);
      setEmail('');
    });
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Team" info="Only the owner can add or remove admins. Every change is written to the audit log." />

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><UserPlus size={20} /> Invite an admin</h2>
        <form onSubmit={sendInvite} className="mt-4 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their email address"
            className="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none placeholder:text-white/35 focus:border-white/50"
          />
          <SelectInput
            value={role}
            onChange={(v) => setRole(v as InviteRole)}
            ariaLabel="Role"
            triggerClassName="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none flex items-center justify-between gap-2 text-left"
          >
            <option value="reviewer">Reviewer</option>
            <option value="support">Support</option>
          </SelectInput>
          <p className="text-xs text-white/45">{roleText[role]}</p>
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
            {busy ? 'Creating...' : 'Create invitation link'}
          </button>
        </form>

        {link && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-sm font-bold">Send this link to them. It is shown only once and works for 7 days.</p>
            <p className="mt-2 break-all rounded-xl bg-black/50 p-3 text-xs text-white/80">{link}</p>
            <button onClick={copy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
              <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <p className="mt-2 text-xs text-white/45">They must sign in with this exact email address, and verify it, to accept.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Admins</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-extrabold text-emerald-300">{m.email[0]?.toUpperCase() ?? '?'}</span>
                <div className="min-w-0">
                  <div className="truncate font-bold">{m.email}</div>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${m.role === 'owner' ? 'bg-emerald-500/15 text-emerald-300' : m.role === 'reviewer' ? 'bg-sky-500/15 text-sky-300' : 'bg-white/10 text-white/60'}`}>{m.role === 'owner' ? 'Owner' : m.role === 'reviewer' ? 'Reviewer' : 'Support'}</span>
                </div>
              </div>
              {m.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  <SelectInput
                    value={m.role}
                    ariaLabel={`Role for ${m.email}`}
                    onChange={(v) => act(() => apiRequest('/api/admin/team/role', { userId: m.id, role: v }))}
                    align="right"
                    triggerClassName="h-10 rounded-full border border-white/20 bg-black/40 px-4 text-sm outline-none flex items-center justify-between gap-2"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="support">Support</option>
                  </SelectInput>
                  <button
                    aria-label={`Remove ${m.email}`}
                    onClick={() => window.confirm(`Remove admin access for ${m.email}?`) && act(() => apiRequest('/api/admin/team/remove', { userId: m.id }))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!team && !error && <p className="py-3 text-sm text-white/45">Loading...</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Pending invitations</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{i.email}</div>
                <div className="text-xs text-white/45">{i.role === 'reviewer' ? 'Reviewer' : 'Support'} · expires {new Date(i.expiresAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => act(() => apiRequest('/api/admin/invites/revoke', { id: i.id }))} className="min-h-10 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/5">
                Revoke
              </button>
            </div>
          ))}
          {team && team.invites.length === 0 && <p className="py-3 text-sm text-white/45">No pending invitations.</p>}
        </div>
      </section>
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/admin/AdminTeam.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/PostTask.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarClock, Check, ClipboardList, Copy, ImageUp, Link2, Loader2, Receipt, Users } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { createPost, getPostPricing, listMyPosts, getPostDoers, editPost, postStatusLabel } from '../../lib/posts';
import type { Doer, PostedTask, PostPricing } from '../../lib/posts';
import { fileToDataUrl } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';
import { Field, FormSection, SelectInput, Toggle, inputCls } from '../../components/Field';
import { ViewableImage } from '../../components/ViewableImage';

type Tab = 'new' | 'mine';

function ImagePick({ value, onPick }: { value: string; onPick: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  return (
    <div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { onPick(await fileToDataUrl(f)); setErr(''); } catch { setErr('Could not read that image.'); }
      }} />
      <button type="button" onClick={() => ref.current?.click()} className="pressable flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-black/30 text-sm text-white/55 hover:border-white/45">
        {value ? <img src={value} alt="" className="max-h-36 rounded-xl" /> : <><ImageUp size={26} /> Tap to choose an image</>}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}

function NewPost({ pricing }: { pricing: PostPricing }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(pricing.categories[0]);
  const [days, setDays] = useState(1);
  const [maxCompletions, setMaxCompletions] = useState('10');
  const [needsHandle, setNeedsHandle] = useState(true);
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState('');
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ priceNaira: number } | null>(null);

  const people = Math.max(0, Number(maxCompletions) || 0);
  const price = days * pricing.perDayNaira;
  const rewardEach = days * pricing.perDayTokens;
  const pool = rewardEach * people;
  const pay = pricing.payTo;
  const [copied, setCopied] = useState(false);
  const copyAcct = async () => {
    try { await navigator.clipboard.writeText(pay.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) return setError('Add a photo for your task.');
    if (!receipt) return setError('Attach your payment receipt.');
    setBusy(true); setError('');
    try {
      const r = await createPost({ title, description, category, days, maxCompletions: people, needsHandle, photo, receipt, link: link || undefined });
      setDone({ priceNaira: r.priceNaira });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your task.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="animate-[popin_300ms_ease-out] rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
        <h2 className="text-xl font-extrabold text-emerald-300">Task submitted 🎉</h2>
        <p className="mt-2 text-sm text-white/70">Your task is awaiting payment confirmation. Once we confirm your ₦{done.priceNaira.toLocaleString()} transfer, it goes live for doers.</p>
        <button onClick={() => setDone(null)} className="pressable mt-5 min-h-11 rounded-full border border-white/25 px-6 text-sm font-bold">Post another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Task details" subtitle="What should doers do?" icon={<ClipboardList size={18} />}>
        <Field label="Task title"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow my TikTok" className={inputCls} /></Field>
        <Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe exactly what doers must do" className="w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60" /></Field>
        <Field label="Category"><SelectInput value={category} onChange={setCategory} ariaLabel="Category">{pricing.categories.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput></Field>
      </FormSection>

      <FormSection title="Reach & duration" subtitle="How many people, and for how long" icon={<Users size={18} />}>
        <Field label="How many people can do it"><input required type="number" min="1" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)} className={inputCls} /></Field>
        <div>
          <div className="mb-2 flex items-end justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white/75"><CalendarClock size={15} /> How long should it run?</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-extrabold text-emerald-300">{days} {days === 1 ? 'day' : 'days'}</span>
          </div>
          <input type="range" min={1} max={pricing.maxDays} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-emerald-400" />
          <div className="mt-1 flex justify-between text-[11px] text-white/35"><span>1 day</span><span>{pricing.maxDays} days</span></div>
        </div>
      </FormSection>

      <FormSection title="Options" icon={<Link2 size={18} />}>
        <Toggle on={needsHandle} onChange={setNeedsHandle} label="Ask doers for their social handle" />
        <Field label="Link to complete (optional)" hint="Add a link if doers must visit another site to finish."><input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://..." className={inputCls} /></Field>
        <Field label="Task image"><ImagePick value={photo} onPick={setPhoto} /></Field>
      </FormSection>

      <FormSection title="Payment" subtitle="Pay, then upload your receipt" icon={<Receipt size={18} />}>
        <div className="space-y-2 rounded-2xl bg-black/30 p-4 text-sm">
          <div className="flex justify-between"><span className="text-white/60">Each doer earns</span><span className="flex items-center gap-1 font-bold text-emerald-400">{rewardEach} <Kred size={13} /></span></div>
          <div className="flex justify-between"><span className="text-white/60">{people} people × {days} {days === 1 ? 'day' : 'days'}</span><span className="flex items-center gap-1 font-bold">{pool.toLocaleString()} <Kred size={13} /> pool</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base"><span className="font-bold">You pay</span><span className="font-extrabold">₦{price.toLocaleString()}</span></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
          <div className="text-xs font-semibold text-white/45">Transfer ₦{price.toLocaleString()} to</div>
          {pay.bankName || pay.accountNumber ? (
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold">{pay.accountName}</div>
                <div className="truncate text-white/70">{pay.bankName} · {pay.accountNumber}</div>
              </div>
              {pay.accountNumber && (
                <button type="button" onClick={copyAcct} aria-label="Copy account number" className="pressable flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              )}
            </div>
          ) : (<div className="mt-1 text-white/50">Payment details will show here once set up by the admin.</div>)}
        </div>
        <Field label="Upload your payment receipt"><ImagePick value={receipt} onPick={setReceipt} /></Field>
        <p className="text-xs text-white/40">Your task goes live only after we confirm the money has arrived. A receipt alone isn’t payment.</p>
      </FormSection>

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
        {busy ? <Loader2 size={18} className="animate-spin" /> : null} Submit task for ₦{price.toLocaleString()}
      </button>
    </form>
  );
}

function DoerList({ taskId }: { taskId: string }) {
  const [data, setData] = useState<{ ongoing: Doer[]; completed: Doer[] } | null>(null);
  useEffect(() => { getPostDoers(taskId).then(setData).catch(() => setData({ ongoing: [], completed: [] })); }, [taskId]);
  if (!data) return <p className="py-2 text-sm text-white/45">Loading doers...</p>;
  const row = (d: Doer) => (
    <div key={d.id} className="flex items-center gap-3 border-t border-white/5 py-2 first:border-t-0">
      {d.proofFile ? <ViewableImage src={`/api/uploads?file=${encodeURIComponent(d.proofFile)}`} alt="proof" className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs text-white/40">—</div>}
      <div className="text-sm"><div className="font-semibold">{d.handle ?? 'No handle'}</div><div className="text-xs text-white/45">{d.status === 'approved' ? 'Approved' : d.status === 'pending_review' ? 'Submitted' : 'In progress'}</div></div>
    </div>
  );
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div><div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/45">Ongoing ({data.ongoing.length})</div>{data.ongoing.length ? data.ongoing.map(row) : <p className="py-2 text-sm text-white/40">Nobody yet.</p>}</div>
      <div><div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/45">Completed ({data.completed.length})</div>{data.completed.length ? data.completed.map(row) : <p className="py-2 text-sm text-white/40">None yet.</p>}</div>
    </div>
  );
}

function PostEditor({ post, onDone }: { post: PostedTask; onDone: () => void }) {
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description);
  const [link, setLink] = useState(post.link ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try { await editPost({ taskId: post.id, title: title.trim(), description: description.trim(), link: link || undefined }); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your changes.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs text-white/50">Spotted a mistake? You can fix the wording for a short while after your task goes live.</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/40" />
      <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https:// (optional)" className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black disabled:opacity-50">{busy ? 'Saving...' : 'Save changes'}</button>
        <button onClick={onDone} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold">Cancel</button>
      </div>
    </div>
  );
}

function MyPosts() {
  const [posts, setPosts] = useState<PostedTask[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const reload = () => listMyPosts().then(setPosts).catch(() => setPosts([]));
  useEffect(() => { reload(); }, []);
  if (!posts) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>;
  if (posts.length === 0) return <p className="rounded-3xl border border-white/10 p-10 text-center text-sm text-white/45">You haven’t posted any tasks yet.</p>;
  return (
    <div className="stagger space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-extrabold">{p.title}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-white/45">{p.approvedCount}/{p.maxCompletions} done · {p.reward} <Kred size={11} /> each</div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${p.status === 'live' ? 'bg-emerald-500/15 text-emerald-400' : p.status === 'rejected' ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-300'}`}>{postStatusLabel[p.status] ?? p.status}</span>
          </div>
          {p.paymentNote && p.status === 'rejected' && <p className="mt-2 text-sm text-red-400">Reason: {p.paymentNote}</p>}
          {p.canEdit && (editing === p.id
            ? <PostEditor post={p} onDone={() => { setEditing(null); reload(); }} />
            : <button onClick={() => setEditing(p.id)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300 underline underline-offset-4">Edit task</button>)}
          {p.status === 'live' && (
            <>
              <button onClick={() => setOpen(open === p.id ? null : p.id)} className="mt-3 text-sm font-bold underline underline-offset-4">{open === p.id ? 'Hide doers' : 'View doers & proof'}</button>
              {open === p.id && <DoerList taskId={p.id} />}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostTask() {
  const [tab, setTab] = useState<Tab>('new');
  const [pricing, setPricing] = useState<PostPricing | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getPostPricing().then(setPricing).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeader title="Post a Task" info="Pay to post a task and have Kredilo users complete it." />
      <Tabs tabs={[{ id: 'new' as Tab, label: 'New Task' }, { id: 'mine' as Tab, label: 'My Posted Tasks' }]} value={tab} onChange={setTab} />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {tab === 'new' ? (pricing ? <NewPost pricing={pricing} /> : !error && <div className="skeleton h-96 rounded-3xl" />) : <MyPosts />}
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/dashboard/PostTask.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Notifications.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, X } from 'lucide-react';
import { listNotifications, markRead, notificationHref, timeAgo } from '../../lib/notifications';
import type { Notification } from '../../lib/notifications';
import { EmptyState } from '../../components/EmptyState';

export default function Notifications() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = () => listNotifications().then((r) => setItems(r.notifications)).catch((e) => setError(e instanceof Error ? e.message : 'Could not load notifications.'));
  useEffect(() => {
    void load();
    // Mark everything read once the page has been opened.
    markRead().then(() => window.dispatchEvent(new Event('notifications-read'))).catch(() => { /* ignore */ });
  }, []);

  const markAll = async () => {
    try { await markRead(); setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev); window.dispatchEvent(new Event('notifications-read')); } catch { /* ignore */ }
  };

  const openDetail = (n: Notification) => {
    setSelected(n);
    if (!n.read) { setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev); markRead(n.id).catch(() => { /* ignore */ }); }
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const hasUnread = items?.some((n) => !n.read);

  // Shared inner layout for a notification, used by both the tappable (Link)
  // and non-tappable (div) variants.
  const Inner = ({ n, tappable }: { n: Notification; tappable: boolean }) => (
    <>
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-white/20' : 'bg-emerald-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{n.title}</div>
        {n.body && <div className="mt-0.5 text-sm text-white/60">{n.body}</div>}
        <div className="mt-1 text-xs text-white/40">{timeAgo(n.createdAt)}</div>
      </div>
      {tappable && <ChevronRight size={18} className="mt-1 shrink-0 text-white/30" />}
    </>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold">Notifications</h1>
        {hasUnread && (
          <button onClick={markAll} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!items && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}

      {items && items.length === 0 && (
        <EmptyState icon={Bell} title="You’re all caught up" text="Approvals, rejections and withdrawal updates will show up here as they happen." />
      )}

      <div className="space-y-3">
        {items?.map((n) => {
          const base = `flex w-full items-start gap-3 rounded-3xl border p-4 text-left ${n.read ? 'border-white/10 bg-[#0e0e0e]' : 'border-white/20 bg-white/[0.04]'}`;
          return (
            <button key={n.id} onClick={() => openDetail(n)} className={`pressable ${base} transition hover:border-white/30 hover:bg-white/[0.07]`}>
              <Inner n={n} tappable />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm animate-[fadein_160ms_ease-out] sm:items-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 shadow-2xl animate-[popin_240ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold leading-snug">{selected.title}</h2>
              <button onClick={() => setSelected(null)} aria-label="Close" className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 hover:bg-white/10"><X size={18} /></button>
            </div>
            <div className="mt-1 text-xs text-white/40">{timeAgo(selected.createdAt)}</div>
            {selected.image && <img src={`/api/uploads?file=${encodeURIComponent(selected.image)}`} alt="" className="mt-4 w-full rounded-2xl object-cover" />}
            {selected.body && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75">{selected.body}</p>}
            {notificationHref(selected) && (
              <Link to={notificationHref(selected)!} onClick={() => setSelected(null)} className="pressable mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">View details <ChevronRight size={16} /></Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/dashboard/Notifications.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Profile.tsx" <<'KREDILO_WAVE_EOF'
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Bell, Camera, Check, ChevronRight, Copy, FileText, Gift, LifeBuoy, LogOut, Megaphone, MessageCircle, Pencil, ShieldCheck, Share2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiRequest, changeUsername, removeAvatar, uploadAvatar, useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';
import { Kred } from '../../components/Kred';
import { SocialLinks } from '../../components/SocialLinks';
import { configuredSocials } from '../../lib/socials';
import { fileToDataUrl } from '../../lib/tasks';
import { getReferral } from '../../lib/referral';
import type { ReferralInfo } from '../../lib/referral';

function Row({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="pressable flex min-h-16 items-center gap-4 border-t border-white/5 py-3 first:border-t-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-white/50">{text}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-white/40" />
    </Link>
  );
}

function ReferralCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  useEffect(() => { getReferral().then(setInfo).catch(() => setInfo(null)); }, []);
  if (!info) return <div className="skeleton h-40 rounded-3xl" />;

  const link = `${window.location.origin}/signup?ref=${info.code}`;
  const copy = async (what: 'code' | 'link', value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Join me on Kredilo', text: `Use my code ${info.code} to join Kredilo and earn kreds.`, url: link }); } catch { copy('link', link); }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.12] to-transparent p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Gift size={18} /> Invite friends, earn {info.bonus} <Kred size={14} /></div>
      <p className="mt-1 text-sm text-white/55">You get {info.bonus} kreds automatically each time someone you invite completes their first task. Look out for the Invite a Friend task too for an extra reward.</p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="text-xs font-semibold text-white/45">Your referral code</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-2xl font-extrabold tracking-[0.2em]">{info.code}</div>
          <button onClick={() => copy('code', info.code)} className="pressable flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5">
            {copied === 'code' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => copy('link', link)} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
          {copied === 'link' ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
        </button>
        <button onClick={share} className="pressable flex min-h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
          <Share2 size={16} /> Share
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="text-xl font-extrabold">{info.count}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Invited</div>
        </div>
        <div className="flex-1 rounded-2xl bg-white/5 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-emerald-400">{info.earned} <Kred size={15} /></div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Earned</div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [viewAvatar, setViewAvatar] = useState(false);

  useEffect(() => {
    if (!viewAvatar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewAvatar(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [viewAvatar]);

  if (!user) return null;

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try { await uploadAvatar(await fileToDataUrl(file, 512)); await refresh(); } catch { /* ignore */ }
    finally { setAvatarBusy(false); }
  };
  const clearAvatar = async () => { setAvatarBusy(true); try { await removeAvatar(); await refresh(); } finally { setAvatarBusy(false); } };

  const resend = async () => {
    setNote('');
    try { await apiRequest('/api/auth/resend-verification', {}); setNote('A new verification link has been sent.'); }
    catch (err) { setNote(err instanceof Error ? err.message : 'Could not send the link.'); }
  };

  const saveName = async () => {
    const u = newName.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setNameErr('3-20 chars: lowercase letters, numbers or underscores.');
    setSavingName(true); setNameErr('');
    try { await changeUsername(u); await refresh(); setEditing(false); }
    catch (e) { setNameErr(e instanceof Error ? e.message : 'Could not update username.'); }
    finally { setSavingName(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Profile</h1>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user.avatar ? (
              <button type="button" onClick={() => setViewAvatar(true)} aria-label="View profile photo" className="pressable block rounded-full">
                <Avatar src={user.avatar} name={user.username} size={64} />
              </button>
            ) : (
              <Avatar src={user.avatar} name={user.username} size={64} />
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label="Change photo" className="pressable absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black text-white disabled:opacity-50">
              <Camera size={14} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div>
                <div className="flex items-center gap-2">
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={user.username} className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm outline-none focus:border-white/40" />
                  <button onClick={saveName} disabled={savingName} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditing(false); setNameErr(''); }} className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-xs font-bold">Cancel</button>
                </div>
                {nameErr && <p className="mt-1 text-xs text-red-400">{nameErr}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-extrabold">{user.username}</span>
                {user.role !== 'user' && <BadgeCheck size={17} className="shrink-0 text-emerald-400" aria-label="Admin" />}
                <button onClick={() => { setNewName(user.username); setEditing(true); }} aria-label="Edit username" className="pressable shrink-0 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><Pencil size={14} /></button>
              </div>
            )}
            <div className="truncate text-sm text-white/50">{user.email}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
              <span>ID: {user.id.slice(0, 8)} · {user.role === 'user' ? 'member' : user.role}</span>
              {user.avatar && <button onClick={clearAvatar} disabled={avatarBusy} className="font-bold text-white/50 underline underline-offset-4 disabled:opacity-50">Remove photo</button>}
            </div>
          </div>
        </div>

        {/* Verification notice ONLY while unverified */}
        {!user.emailVerified && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              Your email isn’t verified yet. Verify it to unlock rewards and withdrawals.
              <button onClick={resend} className="mt-2 block min-h-10 font-bold underline underline-offset-4">Send a new link</button>
              {note && <div className="mt-1 text-white/80">{note}</div>}
            </div>
          </div>
        )}

        {user.role !== 'user' && (
          <Link to="/admin" className="pressable mt-4 flex min-h-12 items-center justify-center rounded-full border border-white/20 text-sm font-bold hover:bg-white/5">
            Open Admin
          </Link>
        )}
      </div>

      <ReferralCard />

      <Link to="/dashboard/post" className="pressable flex min-h-16 items-center gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-3 hover:border-white/25">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Megaphone size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Post a Task</span><span className="block text-sm text-white/50">Pay to have Kredilo users do a task for you</span></span>
        <ChevronRight size={18} className="shrink-0 text-white/40" />
      </Link>

      <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <Row to="/dashboard/notifications" icon={Bell} title="Notifications" text="Task approvals, rejections and updates" />
        <Row to="/forgot-password" icon={ShieldCheck} title="Change password" text="Get a link to set a new password" />
      </div>

      <section id="help" className="rounded-3xl border border-white/10 bg-[#0e0e0e] px-5 py-2">
        <h2 className="pb-1 pt-3 text-sm font-extrabold uppercase tracking-wider text-white/45">Help &amp; Support</h2>
        <Row to="/faq" icon={LifeBuoy} title="FAQ" text="Answers about tasks, rewards and withdrawals" />
        <Row to="/contact" icon={MessageCircle} title="Contact Support" text="Report a problem or ask a question" />
        <Row to="/terms" icon={FileText} title="Terms of Service" text="The rules for using Kredilo" />
        <Row to="/privacy" icon={FileText} title="Privacy Policy" text="How your data is handled" />
      </section>

      {configuredSocials().length > 0 && (
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Follow Kredilo</span>
          <SocialLinks />
        </div>
      )}

      <button
        onClick={async () => { await logout(); navigate('/'); }}
        className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-bold hover:bg-white/5"
      >
        <LogOut size={18} /> Log out
      </button>

      {viewAvatar && user.avatar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-[fadein_160ms_ease-out]" onClick={() => setViewAvatar(false)}>
          <button type="button" aria-label="Close" onClick={() => setViewAvatar(false)} className="pressable absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-white/10">
            <X size={22} />
          </button>
          <img src={user.avatar} alt="Your profile photo" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-3xl object-contain animate-[popin_200ms_ease-out]" />
        </div>
      )}
    </div>
  );
}
KREDILO_WAVE_EOF
echo "  src/pages/dashboard/Profile.tsx"
mkdir -p "src/components"
cat > "src/components/BottomDock.tsx" <<'KREDILO_WAVE_EOF'
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, LayoutDashboard, User, Wallet } from 'lucide-react';

// Four essentials only. Everything else lives inside one of these:
//  Dashboard = Explore Tasks + My Tasks, Wallet = Withdraw + Transactions,
//  Games = all games, Profile = settings + notifications + Help & Support.
const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard/tasks', '/dashboard/my-tasks'], exact: '/dashboard' },
  { to: '/dashboard/wallet', label: 'Wallet', icon: Wallet, match: ['/dashboard/wallet'] },
  { to: '/dashboard/games', label: 'Games', icon: Gamepad2, match: ['/dashboard/games', '/games/'] },
  { to: '/dashboard/profile', label: 'Profile', icon: User, match: ['/dashboard/profile', '/dashboard/notifications'] },
];

export function BottomDock() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full border border-white/10 bg-[#0c0c0c]/90 p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.exact === pathname || item.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.3rem] px-2 text-[11px] font-bold transition-all duration-300 ${
                active ? 'text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {active && <span className="absolute inset-0 -z-0 rounded-[1.3rem] bg-emerald-400 shadow-[0_6px_22px_-6px_rgba(16,185,129,0.85)] animate-[popin_220ms_ease-out]" />}
              <item.icon size={20} strokeWidth={active ? 2.6 : 1.8} className={`relative z-10 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : 'group-active:scale-90'}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
KREDILO_WAVE_EOF
echo "  src/components/BottomDock.tsx"

echo ""
echo "Done. Next:"
echo "  1) cd server && npm test     # expect 78 pass, 0 fail"
echo "  2) cd ..     && npm run build # type-check + build"
echo "  3) git add -A && git commit -m 'feature wave: editing, notifications, announcements, activity, games, redesign' && git push"
