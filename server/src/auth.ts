import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from './db.ts';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'kredilo_session';
export const SESSION_DAYS = 7;

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'owner' | 'reviewer' | 'support';
  status: 'active' | 'suspended';
  email_verified_at: string | null;
  created_at: string;
};

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

export function createSession(db: Db, userId: string): string {
  const token = newToken();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), userId, inDays(SESSION_DAYS));
  return token;
}

export function sessionUser(db: Db, token: string | undefined): UserRow | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
    )
    .get(hashToken(token), new Date().toISOString()) as UserRow | undefined;
  return row ?? null;
}

export function deleteSession(db: Db, token: string | undefined) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: string) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function createEmailToken(db: Db, userId: string, purpose: 'verify_email' | 'reset_password'): string {
  const token = newToken();
  const minutes = purpose === 'verify_email' ? 60 * 24 : 60;
  db.prepare('INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, purpose, inMinutes(minutes));
  return token;
}

// Checks a token without using it up (so a rejected form does not burn the link).
export function peekEmailToken(db: Db, token: string, purpose: 'verify_email' | 'reset_password'): string | null {
  const row = db
    .prepare('SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?')
    .get(hashToken(token), purpose, new Date().toISOString()) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

// Returns the user id if the token is valid, unused and unexpired, and marks it used. One use only.
export function consumeEmailToken(db: Db, token: string, purpose: 'verify_email' | 'reset_password'): string | null {
  const row = db
    .prepare('SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?')
    .get(hashToken(token), purpose, new Date().toISOString()) as { user_id: string } | undefined;
  if (!row) return null;
  const res = db.prepare('UPDATE email_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').run(new Date().toISOString(), hashToken(token));
  return res.changes === 1 ? row.user_id : null;
}

export const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  emailVerified: u.email_verified_at !== null,
  createdAt: u.created_at,
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
