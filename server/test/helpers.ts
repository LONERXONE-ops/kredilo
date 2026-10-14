import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import { resetLimits } from '../src/http.ts';

// Tests run hermetically against the local filesystem — never a real Cloudinary
// account — even when the dev .env has Cloudinary keys set. (cloudinary.ts reads
// these live, so clearing them here forces the local upload/serve path.)
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

export type Mail = { to: string; subject: string; text: string };
export const ORIGIN = 'http://localhost:5173';
export const PW = 'correct horse battery';

export async function setup(ownerEmail = 'owner@example.com') {
  resetLimits();
  const db = await openDb({ url: ':memory:' });
  const mails: Mail[] = [];
  const server = createApp(db, { ownerEmail, appOrigin: ORIGIN, allowedOrigins: [ORIGIN], isProd: false, sendMail: (m) => void mails.push(m) });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function call(method: string, path: string, body?: unknown, cookie?: string) {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const setCookie = res.headers.get('set-cookie') ?? '';
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
    const json = isJson ? ((await res.json()) as any) : null;
    if (!isJson) await res.arrayBuffer();
    return { status: res.status, json, cookie: setCookie.split(';')[0] };
  }
  const tokenFrom = (m: Mail) => new URL(m.text.split('\n').find((l) => l.startsWith('http'))!).searchParams.get('token')!;

  async function makeUser(email: string, verify = true) {
    const r = await call('POST', '/api/auth/signup', { email, password: PW });
    if (verify) {
      const mail = [...mails].reverse().find((m) => m.to === email && m.subject.startsWith('Verify'))!;
      await call('POST', '/api/auth/verify', { token: tokenFrom(mail) });
    }
    return r.cookie;
  }
  const close = () => { server.closeAllConnections(); server.close(); };
  return { db, mails, call, tokenFrom, makeUser, close };
}
