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
