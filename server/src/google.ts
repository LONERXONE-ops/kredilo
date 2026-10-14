import { randomBytes } from 'node:crypto';
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { autoUsername, createSession, ensureReferralCode, hashPassword, newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError, cookie } from './http.ts';
import type { Ctx } from './http.ts';
import type { AppOptions } from './config.ts';

// "Sign in with Google" — standard OAuth 2.0 authorization-code flow, using only built-in fetch.
// Enabled only when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set. In Google Cloud, the OAuth
// client's authorised redirect URI must be exactly:  <APP_ORIGIN>/api/auth/google/callback

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  options: AppOptions;
  setSession: (c: Ctx, token: string) => void;
  maybePromoteOwner: (u: UserRow) => Promise<void>;
};

const STATE_COOKIE = 'kredilo_g_state';

export function googleRoutes({ db, route, options, setSession, maybePromoteOwner }: Deps) {
  const clientId = () => (process.env.GOOGLE_CLIENT_ID ?? '').trim();
  const clientSecret = () => (process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
  const redirectUri = `${options.appOrigin}/api/auth/google/callback`;
  const enabled = () => !!(clientId() && clientSecret());

  const redirect = (c: Ctx, path: string) => {
    c.res.writeHead(302, { Location: path.startsWith('http') ? path : `${options.appOrigin}${path}` });
    c.res.end();
  };

  // The frontend uses this to decide whether to show the "Continue with Google" button.
  route('GET', '/api/auth/google/enabled', async () => ({ enabled: enabled() }));

  // Step 1: send the browser to Google's consent screen.
  route('GET', '/api/auth/google', async (c) => {
    if (!enabled()) throw new HttpError(404, 'Google sign-in is not enabled.');
    const state = randomBytes(16).toString('hex');
    c.res.setHeader('Set-Cookie', cookie(STATE_COOKIE, state, { maxAgeSec: 600, secure: options.isProd }));
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    redirect(c, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    return undefined;
  });

  // Step 2: Google redirects back here with a code. Exchange it, look up the profile, then
  // find-or-create the Kredilo account and start a session.
  route('GET', '/api/auth/google/callback', async (c) => {
    if (!enabled()) throw new HttpError(404, 'Google sign-in is not enabled.');
    const code = typeof c.query.code === 'string' ? c.query.code : '';
    const state = typeof c.query.state === 'string' ? c.query.state : '';
    const expected = c.cookies[STATE_COOKIE];
    if (!code || !state || !expected || state !== expected) return (redirect(c, '/login?error=google'), undefined);

    // Exchange the authorization code for an access token.
    let accessToken = '';
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri, grant_type: 'authorization_code',
        }).toString(),
      });
      if (!res.ok) return (redirect(c, '/login?error=google'), undefined);
      const t = (await res.json()) as { access_token?: string };
      accessToken = typeof t.access_token === 'string' ? t.access_token : '';
    } catch {
      return (redirect(c, '/login?error=google'), undefined);
    }
    if (!accessToken) return (redirect(c, '/login?error=google'), undefined);

    // Fetch the verified email + name from Google.
    let email = '';
    let verified = true;
    try {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return (redirect(c, '/login?error=google'), undefined);
      const p = (await res.json()) as { email?: string; email_verified?: boolean };
      email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
      verified = p.email_verified !== false;
    } catch {
      return (redirect(c, '/login?error=google'), undefined);
    }
    if (!email || !verified) return (redirect(c, '/login?error=google'), undefined);

    // Find or create the account.
    let user = (await db.prepare('SELECT * FROM users WHERE email = ?').get(email)) as UserRow | undefined;
    if (user) {
      if (user.status !== 'active') return (redirect(c, '/login?error=suspended'), undefined);
      if (!user.email_verified_at) await db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    } else {
      const id = newId();
      const username = await autoUsername(db, email);
      // They sign in via Google; store a random unusable password so the row is well-formed.
      const pwHash = await hashPassword(randomBytes(24).toString('base64'));
      await db.prepare('INSERT INTO users (id, email, username, password_hash, email_verified_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, email, username, pwHash, new Date().toISOString());
      await ensureReferralCode(db, id);
      await audit(db, id, 'user.signup', id, { via: 'google' });
      user = (await db.prepare('SELECT * FROM users WHERE id = ?').get(id)) as UserRow;
    }

    // Same owner-bootstrap path as email verification (Google emails are pre-verified).
    await maybePromoteOwner(user);

    setSession(c, await createSession(db, user.id));
    redirect(c, '/dashboard');
    return undefined;
  });
}
