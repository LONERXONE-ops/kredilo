import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import { resetLimits } from '../src/http.ts';

type Mail = { to: string; subject: string; text: string };
const ORIGIN = 'http://localhost:5173';

async function setup(ownerEmail = 'owner@example.com') {
  resetLimits();
  const db = openDb(':memory:');
  const mails: Mail[] = [];
  const server = createApp(db, {
    ownerEmail,
    appOrigin: ORIGIN,
    allowedOrigins: [ORIGIN],
    isProd: false,
    sendMail: (m) => void mails.push(m),
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function call(method: string, path: string, body?: unknown, o: { cookie?: string; origin?: string; type?: string; raw?: string } = {}) {
    const headers: Record<string, string> = {};
    if (o.cookie) headers.cookie = o.cookie;
    if (o.origin) headers.origin = o.origin;
    const payload = o.raw ?? (body === undefined ? undefined : JSON.stringify(body));
    if (payload !== undefined) headers['content-type'] = o.type ?? 'application/json';
    const res = await fetch(base + path, { method, headers, body: payload });
    const setCookie = res.headers.get('set-cookie') ?? '';
    return { status: res.status, json: (await res.json()) as any, setCookie, cookie: setCookie.split(';')[0] };
  }
  const tokenFrom = (m: Mail) => new URL(m.text.split('\n').find((l) => l.startsWith('http'))!).searchParams.get('token')!;
  return { db, mails, call, tokenFrom, close: () => { server.closeAllConnections(); server.close(); } };
}

const PW = 'correct horse battery';

test('signup creates an account, sets an HttpOnly cookie, and /me returns it', async () => {
  const t = await setup();
  const r = await t.call('POST', '/api/auth/signup', { email: ' New@Example.com ', password: PW });
  assert.equal(r.status, 200);
  assert.equal(r.json.user.email, 'new@example.com');
  assert.equal(r.json.user.emailVerified, false);
  assert.equal(r.json.user.role, 'user');
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);
  const me = await t.call('GET', '/api/auth/me', undefined, { cookie: r.cookie });
  assert.equal(me.json.user.email, 'new@example.com');
  assert.equal(JSON.stringify(r.json).includes(PW), false);
  t.close();
});

test('duplicate email (any case) is rejected; weak password and bad email are rejected', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  assert.equal((await t.call('POST', '/api/auth/signup', { email: 'A@EXAMPLE.com', password: PW })).status, 409);
  assert.equal((await t.call('POST', '/api/auth/signup', { email: 'b@example.com', password: 'short' })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/signup', { email: 'not-an-email', password: PW })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/signup', { email: 'c@example.com' })).status, 400);
  t.close();
});

test('password is stored hashed, never in plain text', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'h@example.com', password: PW });
  const row = t.db.prepare('SELECT password_hash FROM users').get() as { password_hash: string };
  assert.ok(row.password_hash.startsWith('scrypt$'));
  assert.equal(row.password_hash.includes(PW), false);
  t.close();
});

test('wrong password and unknown email give the same 401 message', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  const wrong = await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: 'nope-nope-nope' });
  const unknown = await t.call('POST', '/api/auth/login', { email: 'zzz@example.com', password: 'nope-nope-nope' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error);
  t.close();
});

test('login works and logout ends the session', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  const login = await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: PW });
  assert.equal(login.status, 200);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: login.cookie })).json.user.email, 'a@example.com');
  await t.call('POST', '/api/auth/logout', {}, { cookie: login.cookie });
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: login.cookie })).json.user, null);
  t.close();
});

test('email verification link works once only', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  const token = t.tokenFrom(t.mails[0]);
  assert.equal((await t.call('POST', '/api/auth/verify', { token })).status, 200);
  assert.equal((await t.call('POST', '/api/auth/verify', { token })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/verify', { token: 'garbage' })).status, 400);
  const login = await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: PW });
  assert.equal(login.json.user.emailVerified, true);
  t.close();
});

test('only the configured owner email becomes owner, and only after verifying', async () => {
  const t = await setup('owner@example.com');
  const other = await t.call('POST', '/api/auth/signup', { email: 'other@example.com', password: PW });
  await t.call('POST', '/api/auth/verify', { token: t.tokenFrom(t.mails[0]) });
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: other.cookie })).json.user.role, 'user');

  const owner = await t.call('POST', '/api/auth/signup', { email: 'Owner@Example.com', password: PW });
  assert.equal(owner.json.user.role, 'user'); // not owner until verified
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: owner.cookie })).json.user.role, 'user');
  await t.call('POST', '/api/auth/verify', { token: t.tokenFrom(t.mails[1]) });
  const me = await t.call('GET', '/api/auth/me', undefined, { cookie: owner.cookie });
  assert.equal(me.json.user.role, 'owner');
  assert.equal(t.db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'owner.bootstrap'").get()!.n, 1);
  t.close();
});

test('owner bootstrap never creates a second owner', async () => {
  const t = await setup('owner@example.com');
  const a = await t.call('POST', '/api/auth/signup', { email: 'first@example.com', password: PW });
  t.db.prepare("UPDATE users SET role = 'owner' WHERE email = 'first@example.com'").run();
  await t.call('POST', '/api/auth/signup', { email: 'owner@example.com', password: PW });
  await t.call('POST', '/api/auth/verify', { token: t.tokenFrom(t.mails[1]) });
  assert.equal(t.db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").get()!.n, 1);
  assert.equal(a.status, 200);
  t.close();
});

test('password reset: same answer for unknown email, one-time token, kills old sessions', async () => {
  const t = await setup();
  const signup = await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  t.mails.length = 0;
  assert.equal((await t.call('POST', '/api/auth/forgot', { email: 'nobody@example.com' })).status, 200);
  assert.equal(t.mails.length, 0);
  assert.equal((await t.call('POST', '/api/auth/forgot', { email: 'a@example.com' })).status, 200);
  assert.equal(t.mails.length, 1);
  const token = t.tokenFrom(t.mails[0]);
  assert.equal((await t.call('POST', '/api/auth/reset', { token, password: 'short' })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/reset', { token, password: 'a brand new passphrase' })).status, 200);
  assert.equal((await t.call('POST', '/api/auth/reset', { token, password: 'another new passphrase' })).status, 400);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: signup.cookie })).json.user, null);
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: PW })).status, 401);
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: 'a brand new passphrase' })).status, 200);
  t.close();
});

test('requests from a disallowed Origin are blocked', async () => {
  const t = await setup();
  const bad = await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW }, { origin: 'https://evil.example' });
  assert.equal(bad.status, 403);
  const good = await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW }, { origin: ORIGIN });
  assert.equal(good.status, 200);
  t.close();
});

test('login is rate limited', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  let last = 0;
  for (let i = 0; i < 10; i++) last = (await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: 'wrong-wrong' })).status;
  assert.equal(last, 429);
  t.close();
});

test('audit log is append-only', async () => {
  const t = await setup();
  await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  assert.ok((t.db.prepare('SELECT COUNT(*) AS n FROM audit_log').get() as { n: number }).n >= 1);
  assert.throws(() => t.db.prepare("UPDATE audit_log SET action = 'x'").run(), /append-only/);
  assert.throws(() => t.db.prepare('DELETE FROM audit_log').run(), /append-only/);
  t.close();
});

test('oversized and non-JSON bodies are refused', async () => {
  const t = await setup();
  assert.equal((await t.call('POST', '/api/auth/signup', undefined, { raw: 'x'.repeat(20_000), type: 'application/json' })).status, 413);
  assert.equal((await t.call('POST', '/api/auth/signup', undefined, { raw: 'email=a', type: 'text/plain' })).status, 415);
  assert.equal((await t.call('POST', '/api/auth/signup', undefined, { raw: '{bad', type: 'application/json' })).status, 400);
  t.close();
});

test('suspended users cannot log in and their sessions stop working', async () => {
  const t = await setup();
  const s = await t.call('POST', '/api/auth/signup', { email: 'a@example.com', password: PW });
  t.db.prepare("UPDATE users SET status = 'suspended'").run();
  assert.equal((await t.call('GET', '/api/auth/me', undefined, { cookie: s.cookie })).json.user, null);
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'a@example.com', password: PW })).status, 403);
  t.close();
});

test('unknown routes return 404 JSON', async () => {
  const t = await setup();
  const r = await t.call('GET', '/api/nope');
  assert.equal(r.status, 404);
  t.close();
});
