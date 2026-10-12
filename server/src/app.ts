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

type Handler = (c: Ctx) => Promise<unknown>;

export function createApp(db: Db, o: AppOptions): Server {
  const routes = new Map<string, Handler>();
  const route = (method: string, path: string, h: Handler) => routes.set(`${method} ${path}`, h);
  const maxAge = SESSION_DAYS * 86_400;
  const setSession = (c: Ctx, token: string) =>
    c.res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, token, { maxAgeSec: maxAge, secure: o.isProd }));
  const clearSession = (c: Ctx) => c.res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', { maxAgeSec: 0, secure: o.isProd }));
  const currentUser = (c: Ctx): UserRow | null => sessionUser(db, c.cookies[SESSION_COOKIE]);
  const requireUser = (c: Ctx): UserRow => {
    const u = currentUser(c);
    if (!u) throw new HttpError(401, 'Please log in.');
    return u;
  };
  const tooMany = () => new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');

  // First owner: only the configured OWNER_EMAIL, only after it is verified, only if no owner exists yet.
  const maybePromoteOwner = (u: UserRow) => {
    if (!o.ownerEmail || u.email !== o.ownerEmail) return;
    db.exec('BEGIN IMMEDIATE');
    try {
      const has = db.prepare("SELECT 1 FROM users WHERE role = 'owner'").get();
      if (!has) {
        db.prepare("UPDATE users SET role = 'owner' WHERE id = ? AND email_verified_at IS NOT NULL").run(u.id);
        audit(db, u.id, 'owner.bootstrap', u.id);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  const sendVerify = (u: UserRow) => {
    const token = createEmailToken(db, u.id, 'verify_email');
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
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists.');
    if (chosen && usernameTaken(db, chosen)) throw new HttpError(409, 'That username is already taken.');
    const username = chosen ?? autoUsername(db, email);
    // Referral is optional — but if a code IS entered, it must be a real one.
    const refRaw = typeof c.body.referralCode === 'string' ? c.body.referralCode.trim() : '';
    let referrer: UserRow | undefined;
    if (refRaw) {
      referrer = findByReferralCode(db, refRaw);
      if (!referrer) throw new HttpError(400, 'That referral code isn’t valid. Leave it blank if no one invited you.');
    }
    const id = newId();
    db.prepare('INSERT INTO users (id, email, username, password_hash, referred_by) VALUES (?, ?, ?, ?, ?)')
      .run(id, email, username, await hashPassword(c.body.password as string), referrer?.id ?? null);
    ensureReferralCode(db, id);
    audit(db, id, 'user.signup', id, referrer ? { referredBy: referrer.id } : undefined);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
    sendVerify(user);
    setSession(c, createSession(db, id));
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/login', async (c) => {
    const email = validEmail(c.body.email);
    const password = typeof c.body.password === 'string' ? c.body.password : '';
    if (limited(`login-ip:${c.ip}`, 30, 900_000) || (email && limited(`login-email:${email}`, 8, 900_000))) throw tooMany();
    const user = email ? (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined) : undefined;
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
    if (user.status !== 'active') throw new HttpError(403, 'This account is suspended.');
    setSession(c, createSession(db, user.id));
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/logout', async (c) => {
    deleteSession(db, c.cookies[SESSION_COOKIE]);
    clearSession(c);
    return { ok: true };
  });

  route('GET', '/api/auth/me', async (c) => {
    const u = currentUser(c);
    return { user: u ? publicUser(u) : null };
  });

  route('POST', '/api/auth/verify', async (c) => {
    if (limited(`verify:${c.ip}`, 20, 900_000)) throw tooMany();
    const token = typeof c.body.token === 'string' ? c.body.token : '';
    const userId = consumeEmailToken(db, token, 'verify_email');
    if (!userId) throw new HttpError(400, 'This link is invalid or has expired.');
    db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL').run(new Date().toISOString(), userId);
    audit(db, userId, 'user.email_verified', userId);
    maybePromoteOwner(db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow);
    return { ok: true };
  });

  route('POST', '/api/auth/resend-verification', async (c) => {
    const u = requireUser(c);
    if (limited(`resend:${u.id}`, 3, 3_600_000)) throw tooMany();
    if (!u.email_verified_at) sendVerify(u);
    return { ok: true };
  });

  route('POST', '/api/auth/forgot', async (c) => {
    if (limited(`forgot:${c.ip}`, 10, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    const user = email ? (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined) : undefined;
    if (user) {
      const token = createEmailToken(db, user.id, 'reset_password');
      o.sendMail({ to: user.email, subject: 'Reset your Kredilo password', text: `Open this link to set a new password:\n${o.appOrigin}/reset-password?token=${token}` });
    }
    return { ok: true }; // same answer whether or not the email exists
  });

  route('POST', '/api/auth/reset', async (c) => {
    if (limited(`reset:${c.ip}`, 10, 900_000)) throw tooMany();
    const token = typeof c.body.token === 'string' ? c.body.token : '';
    const peeked = peekEmailToken(db, token, 'reset_password');
    if (!peeked) throw new HttpError(400, 'This link is invalid or has expired.');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(peeked) as UserRow;
    const problem = passwordProblem(c.body.password, user.email);
    if (problem) throw new HttpError(400, problem);
    const userId = consumeEmailToken(db, token, 'reset_password');
    if (!userId) throw new HttpError(400, 'This link is invalid or has expired.');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(c.body.password as string), userId);
    deleteUserSessions(db, userId);
    audit(db, userId, 'user.password_reset', userId);
    return { ok: true };
  });

  route('POST', '/api/auth/username', async (c) => {
    const u = requireUser(c);
    if (limited(`username:${u.id}`, 5, 3_600_000)) throw tooMany();
    const username = validUsername(c.body.username);
    if (!username) throw new HttpError(400, 'Username must be 3-20 characters: lowercase letters, numbers or underscores.');
    if (usernameTaken(db, username, u.id)) throw new HttpError(409, 'That username is already taken.');
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, u.id);
    audit(db, u.id, 'user.username', u.id, { username });
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id) as UserRow) };
  });

  route('GET', '/api/referral', async (c) => {
    const u = requireUser(c);
    const code = ensureReferralCode(db, u.id);
    const count = (db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?').get(u.id) as { n: number }).n;
    const credited = (db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ? AND referral_bonus_paid = 1').get(u.id) as { n: number }).n;
    return { code, count, credited, earned: credited * REFERRAL_BONUS, bonus: REFERRAL_BONUS };
  });

  adminRoutes({ db, route, requireUser, options: o });
  walletRoutes({ db, route, requireUser });
  taskRoutes({ db, route, requireUser });
  postRoutes({ db, route, requireUser });
  withdrawalRoutes({ db, route, requireUser });
  adminDataRoutes({ db, route, requireUser });
  avatarRoutes({ db, route, requireUser });
  notificationRoutes({ db, route, requireUser });
  gameRoutes({ db, route, requireUser });
  socialRoutes({ db, route, requireUser });

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const h = routes.get(`${method} ${url.pathname}`);
      if (!h) throw new HttpError(404, 'Not found');
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
