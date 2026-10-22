#!/usr/bin/env bash
# Kredilo — Chunk 1: team dedupe, task ordering (done to bottom), dock overlap fix, avatar viewer.
# Run from your repo root:  cd ~/kredilo && bash apply-chunk1.sh
set -euo pipefail

if [ ! -f package.json ] || [ ! -d src ] || [ ! -d server ]; then
  echo "Run this from the kredilo repo root (where package.json, src/ and server/ live)." >&2
  exit 1
fi

echo "Writing Chunk 1 files..."
mkdir -p "server/src"
cat > "server/src/admin.ts" <<'KREDILO_CHUNK1_EOF'
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { hashToken, newId, newToken, validEmail } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError, limited } from './http.ts';
import type { Ctx } from './http.ts';
import type { AppOptions } from './config.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
  options: AppOptions;
};

const ADMIN_ROLES = ['reviewer', 'support'];
const isAdminRole = (v: unknown): v is 'reviewer' | 'support' => typeof v === 'string' && ADMIN_ROLES.includes(v);
const INVITE_DAYS = 7;

export function adminRoutes({ db, route, requireUser, options }: Deps) {
  // Every admin-team action is checked here, on the server, against the role stored in the database.
  const requireOwner = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can do this.');
    return u;
  };
  const tooMany = () => new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const findUser = async (id: string) => (await db.prepare('SELECT * FROM users WHERE id = ?').get(id)) as UserRow | undefined;

  route('GET', '/api/admin/team', async (c) => {
    await requireOwner(c);
    const rawMembers = (await db.prepare("SELECT id, email, role, created_at FROM users WHERE role != 'user' ORDER BY created_at").all()) as {
      id: string; email: string; role: string; created_at: string;
    }[];
    // Defensive de-duplication: collapse any accounts that share an email (case/space-insensitive)
    // into a single row, so an admin can never appear twice. Keeps the highest-privilege row.
    const roleRank = (r: string) => (r === 'owner' ? 3 : r === 'reviewer' ? 2 : 1);
    const byEmail = new Map<string, (typeof rawMembers)[number]>();
    for (const m of rawMembers) {
      const key = m.email.trim().toLowerCase();
      const kept = byEmail.get(key);
      if (!kept || roleRank(m.role) > roleRank(kept.role)) byEmail.set(key, m);
    }
    const members = [...byEmail.values()];
    const invites = (await db
      .prepare('SELECT id, email, role, expires_at, created_at FROM admin_invites WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC')
      .all(new Date().toISOString())) as { id: string; email: string; role: string; expires_at: string; created_at: string }[];
    return {
      members: members.map((m) => ({ id: m.id, email: m.email, role: m.role, createdAt: m.created_at })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at })),
    };
  });

  route('POST', '/api/admin/invites', async (c) => {
    const owner = await requireOwner(c);
    if (limited(`invite:${owner.id}`, 20, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    if (!email) throw new HttpError(400, 'Enter a valid email address.');
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const existing = (await db.prepare('SELECT role FROM users WHERE email = ?').get(email)) as { role: string } | undefined;
    if (existing && existing.role !== 'user') throw new HttpError(409, 'That person already has admin access.');

    const now = new Date().toISOString();
    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    const tx = await db.begin();
    try {
      await tx.prepare('UPDATE admin_invites SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(now, email);
      await tx.prepare('INSERT INTO admin_invites (id, email, role, token_hash, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newId(), email, c.body.role, hashToken(token), owner.id, expiresAt,
      );
      await audit(tx, owner.id, 'admin.invite.create', email, { role: c.body.role });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    const inviteUrl = `${options.appOrigin}/admin-invite?token=${token}`;
    options.sendMail({ to: email, subject: 'You have been invited to help run Kredilo', text: `Open this link, signed in with this email address, to accept:\n${inviteUrl}` });
    return { inviteUrl, expiresAt }; // shown to the owner once; only a hash is stored
  });

  route('POST', '/api/admin/invites/revoke', async (c) => {
    const owner = await requireOwner(c);
    const res = await db
      .prepare('UPDATE admin_invites SET revoked_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL')
      .run(new Date().toISOString(), str(c.body.id));
    if (res.changes !== 1) throw new HttpError(404, 'Invitation not found.');
    await audit(db, owner.id, 'admin.invite.revoke', str(c.body.id));
    return { ok: true };
  });

  route('POST', '/api/admin/invites/accept', async (c) => {
    const user = await requireUser(c);
    if (limited(`accept:${user.id}`, 10, 900_000)) throw tooMany();
    if (!user.email_verified_at) throw new HttpError(403, 'Verify your email first, then open the invitation again.');
    if (user.role === 'owner') throw new HttpError(400, 'You already have full access.');
    const row = (await db
      .prepare('SELECT id, email, role FROM admin_invites WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?')
      .get(hashToken(str(c.body.token)), new Date().toISOString())) as { id: string; email: string; role: 'reviewer' | 'support' } | undefined;
    if (!row) throw new HttpError(400, 'This invitation is invalid or has expired.');
    if (row.email !== user.email) throw new HttpError(403, 'This invitation was sent to a different email address.');

    const tx = await db.begin();
    try {
      const used = await tx.prepare('UPDATE admin_invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(new Date().toISOString(), row.id);
      if (used.changes !== 1) throw new HttpError(400, 'This invitation is invalid or has expired.');
      await tx.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'owner'").run(row.role, user.id);
      await audit(tx, user.id, 'admin.invite.accept', user.id, { role: row.role });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    return { role: row.role };
  });

  route('POST', '/api/admin/team/role', async (c) => {
    const owner = await requireOwner(c);
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const target = await findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(c.body.role, target.id);
    await audit(db, owner.id, 'admin.role.change', target.id, { from: target.role, to: c.body.role });
    return { ok: true };
  });

  route('POST', '/api/admin/team/remove', async (c) => {
    const owner = await requireOwner(c);
    const target = await findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    await db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(target.id);
    await audit(db, owner.id, 'admin.remove', target.id, { was: target.role });
    return { ok: true };
  });
}
KREDILO_CHUNK1_EOF
echo "  wrote server/src/admin.ts"
mkdir -p "server/test"
cat > "server/test/admin.test.ts" <<'KREDILO_CHUNK1_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';

const OWNER = 'owner@example.com';
const count = async (t: Awaited<ReturnType<typeof setup>>, action: string) =>
  ((await t.db.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE action = ?').get(action)) as { n: number }).n;

async function invite(t: Awaited<ReturnType<typeof setup>>, ownerCookie: string, email: string, role = 'reviewer') {
  const r = await t.call('POST', '/api/admin/invites', { email, role }, ownerCookie);
  const token = r.status === 200 ? new URL(r.json.inviteUrl).searchParams.get('token')! : '';
  return { r, token };
}

test('admin endpoints reject logged-out visitors and normal members', async () => {
  const t = await setup();
  const member = await t.makeUser('member@example.com');
  for (const [m, p, b] of [['GET', '/api/admin/team', undefined], ['POST', '/api/admin/invites', { email: 'x@example.com', role: 'reviewer' }]] as const) {
    assert.equal((await t.call(m, p, b)).status, 401);
    assert.equal((await t.call(m, p, b, member)).status, 403);
  }
  t.close();
});

test('owner invites someone; the link only works for that email and only once', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const { r, token } = await invite(t, owner, 'Helper@Example.com', 'reviewer');
  assert.equal(r.status, 200);
  assert.ok(token.length > 20);
  assert.equal(await count(t, 'admin.invite.create'), 1);

  const wrong = await t.makeUser('someone-else@example.com');
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token }, wrong)).status, 403);

  const helper = await t.makeUser('helper@example.com');
  const ok = await t.call('POST', '/api/admin/invites/accept', { token }, helper);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.role, 'reviewer');
  assert.equal((await t.call('GET', '/api/auth/me', undefined, helper)).json.user.role, 'reviewer');
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token }, helper)).status, 400);
  assert.equal(await count(t, 'admin.invite.accept'), 1);
  t.close();
});

test('invite token is stored hashed, never in plain text', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const { token } = await invite(t, owner, 'a@example.com');
  const rows = JSON.stringify(await t.db.prepare('SELECT * FROM admin_invites').all());
  assert.equal(rows.includes(token), false);
  t.close();
});

test('unverified email, unauthenticated, expired and revoked invitations are refused', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);

  const a = await invite(t, owner, 'unverified@example.com');
  const unverified = await t.makeUser('unverified@example.com', false);
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token: a.token }, unverified)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token: a.token })).status, 401);

  const b = await invite(t, owner, 'expired@example.com');
  const expired = await t.makeUser('expired@example.com');
  await t.db.prepare("UPDATE admin_invites SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = 'expired@example.com'").run();
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token: b.token }, expired)).status, 400);

  const c = await invite(t, owner, 'revoked@example.com');
  const revoked = await t.makeUser('revoked@example.com');
  const list = await t.call('GET', '/api/admin/team', undefined, owner);
  const id = list.json.invites.find((i: { email: string }) => i.email === 'revoked@example.com').id;
  assert.equal((await t.call('POST', '/api/admin/invites/revoke', { id }, owner)).status, 200);
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token: c.token }, revoked)).status, 400);
  assert.equal(await count(t, 'admin.invite.revoke'), 1);
  t.close();
});

test('re-inviting the same email cancels the older link', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const first = await invite(t, owner, 'a@example.com');
  const second = await invite(t, owner, 'a@example.com', 'support');
  const a = await t.makeUser('a@example.com');
  assert.equal((await t.call('POST', '/api/admin/invites/accept', { token: first.token }, a)).status, 400);
  const ok = await t.call('POST', '/api/admin/invites/accept', { token: second.token }, a);
  assert.equal(ok.json.role, 'support');
  t.close();
});

test('bad invite requests are rejected: owner role, bad email, already an admin', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  assert.equal((await invite(t, owner, 'a@example.com', 'owner')).r.status, 400);
  assert.equal((await invite(t, owner, 'not-an-email')).r.status, 400);
  assert.equal((await invite(t, owner, OWNER)).r.status, 409);
  t.close();
});

test('reviewers and support cannot invite, list the team, or change roles', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const { token } = await invite(t, owner, 'r@example.com', 'reviewer');
  const reviewer = await t.makeUser('r@example.com');
  await t.call('POST', '/api/admin/invites/accept', { token }, reviewer);
  assert.equal((await t.call('GET', '/api/admin/team', undefined, reviewer)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/invites', { email: 'x@example.com', role: 'support' }, reviewer)).status, 403);
  const me = (await t.call('GET', '/api/auth/me', undefined, reviewer)).json.user;
  assert.equal((await t.call('POST', '/api/admin/team/role', { userId: me.id, role: 'support' }, reviewer)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/team/remove', { userId: me.id }, reviewer)).status, 403);
  t.close();
});

test('owner can change a role and remove an admin; access ends immediately', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const ownerId = (await t.call('GET', '/api/auth/me', undefined, owner)).json.user.id as string;
  const { token } = await invite(t, owner, 'r@example.com', 'reviewer');
  const reviewer = await t.makeUser('r@example.com');
  await t.call('POST', '/api/admin/invites/accept', { token }, reviewer);
  const rid = (await t.call('GET', '/api/auth/me', undefined, reviewer)).json.user.id as string;

  assert.equal((await t.call('POST', '/api/admin/team/role', { userId: rid, role: 'support' }, owner)).status, 200);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, reviewer)).json.user.role, 'support');
  assert.equal((await t.call('POST', '/api/admin/team/role', { userId: rid, role: 'owner' }, owner)).status, 400);

  assert.equal((await t.call('POST', '/api/admin/team/remove', { userId: rid }, owner)).status, 200);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, reviewer)).json.user.role, 'user');
  assert.equal((await t.call('GET', '/api/admin/team', undefined, reviewer)).status, 403);

  // The owner cannot be demoted or removed through these endpoints, and plain users are not team members.
  assert.equal((await t.call('POST', '/api/admin/team/remove', { userId: ownerId }, owner)).status, 404);
  assert.equal((await t.call('POST', '/api/admin/team/role', { userId: ownerId, role: 'support' }, owner)).status, 404);
  assert.equal((await t.call('POST', '/api/admin/team/remove', { userId: rid }, owner)).status, 404);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, owner)).json.user.role, 'owner');
  assert.equal(await count(t, 'admin.role.change'), 1);
  assert.equal(await count(t, 'admin.remove'), 1);
  t.close();
});

test('team list shows members and only pending invitations', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const done = await invite(t, owner, 'done@example.com');
  await invite(t, owner, 'pending@example.com', 'support');
  const doneUser = await t.makeUser('done@example.com');
  await t.call('POST', '/api/admin/invites/accept', { token: done.token }, doneUser);
  const team = (await t.call('GET', '/api/admin/team', undefined, owner)).json;
  assert.deepEqual(team.members.map((m: { email: string }) => m.email).sort(), ['done@example.com', OWNER]);
  assert.deepEqual(team.invites.map((i: { email: string }) => i.email), ['pending@example.com']);
  assert.equal(JSON.stringify(team).includes('token'), false);
  t.close();
});

test('an invitation can never make a second owner', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const { token } = await invite(t, owner, 'a@example.com');
  const a = await t.makeUser('a@example.com');
  await t.call('POST', '/api/admin/invites/accept', { token }, a);
  assert.equal(((await t.db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").get()) as { n: number }).n, 1);
  t.close();
});

test('the team list collapses duplicate accounts that share an email', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  // Two legacy rows for the same person, differing only by email case (SQLite UNIQUE is case-sensitive).
  await t.db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES ('dupe1', 'Helper@Example.com', 'x', 'support')").run();
  await t.db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES ('dupe2', 'helper@example.com', 'x', 'reviewer')").run();
  const team = await t.call('GET', '/api/admin/team', undefined, owner);
  assert.equal(team.status, 200);
  const helpers = team.json.members.filter((m: { email: string }) => m.email.toLowerCase() === 'helper@example.com');
  assert.equal(helpers.length, 1);
  // Keeps the higher-privilege role (reviewer beats support).
  assert.equal(helpers[0].role, 'reviewer');
  t.close();
});
KREDILO_CHUNK1_EOF
echo "  wrote server/test/admin.test.ts"
mkdir -p "src/components"
cat > "src/components/DashboardLayout.tsx" <<'KREDILO_CHUNK1_EOF'
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Logo } from './Logo';
import { BottomDock } from './BottomDock';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { getUnreadCount } from '../lib/notifications';
import { anySocialConfigured } from '../lib/socials';
import { getFollowStatus } from '../lib/follow';
import { FollowGate } from './FollowGate';
import { OnboardingWalkthrough } from './OnboardingWalkthrough';
import { VerifyEmailBanner } from './VerifyEmailBanner';

// The four sections that live in the bottom dock. Any other screen shows a back button instead.
const DOCK_ROUTES = ['/dashboard', '/dashboard/wallet', '/dashboard/games', '/dashboard/profile'];

export function DashboardLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  // null = still deciding; true = must complete the follow gate before using the app.
  const [gate, setGate] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    getUnreadCount().then(setUnread).catch(() => { /* ignore */ });
    const clear = () => setUnread(0);
    window.addEventListener('notifications-read', clear);
    return () => window.removeEventListener('notifications-read', clear);
  }, [user, location.pathname]);

  useEffect(() => {
    // Only gate regular users, and only once social pages are configured. Admins and
    // the un-configured state pass straight through so nobody is ever trapped.
    if (!user || user.role !== 'user' || !anySocialConfigured()) { setGate(false); return; }
    getFollowStatus()
      .then((s) => setGate(!s.platforms.every((p) => s.claimed.includes(p))))
      .catch(() => setGate(false));
  }, [user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-white/50">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const name = user.username ?? user.email.split('@')[0];
  const isDock = DOCK_ROUTES.includes(location.pathname);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <div className="light-beam pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-60" />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          {isDock ? (
            <Link to="/dashboard" aria-label="Kredilo dashboard" className="transition active:scale-95">
              <Logo className="h-6 w-auto text-white" />
            </Link>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="-ml-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <Link to="/dashboard/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-90">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 animate-[kpop_240ms_ease-out] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link to="/dashboard/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/10 active:scale-95">
              <Avatar src={user.avatar} name={name} size={36} />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-bold">{name}</span>
                <span className="block text-[11px] text-white/40">ID: {user.id.slice(0, 8)}</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {gate ? (
        <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <FollowGate onDone={() => setGate(false)} />
        </main>
      ) : (
        <>
          <VerifyEmailBanner />
          <main className={`relative mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 ${isDock ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'pb-16'} animate-[fadeup_320ms_ease-out]`}>
            <Outlet />
          </main>
          {isDock && <BottomDock />}
          {user.role === 'user' && <OnboardingWalkthrough />}
        </>
      )}
    </div>
  );
}
KREDILO_CHUNK1_EOF
echo "  wrote src/components/DashboardLayout.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Dashboard.tsx" <<'KREDILO_CHUNK1_EOF'
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gamepad2, ImageIcon, ListChecks, Search, Sparkles, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getWallet, listMySubmissions, listTasks, statusLabel } from '../../lib/tasks';
import type { MySubmission, Task, Wallet } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';
import { Kred } from '../../components/Kred';
import { EmptyState } from '../../components/EmptyState';

type Tab = 'explore' | 'mine';

const statusChip: Record<MySubmission['status'], string> = {
  in_progress: 'bg-white/10 text-white/70',
  pending_review: 'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-300',
};

const proofLabel = (t: Task) =>
  t.proofType === 'screenshot' ? 'Screenshot proof' : t.proofType === 'none' ? 'No proof needed' : t.proofType === 'link' ? 'Link proof' : 'Proof required';

function TaskTile({ task }: { task: Task }) {
  return (
    <Link
      to={`/dashboard/tasks/${task.id}`}
      className="pressable group block overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e] transition hover:border-white/25"
    >
      {/* Image-forward banner, like the games cards — shown upfront so doers see it without opening */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-white/[0.07] to-transparent">
        {task.photo ? (
          <img
            src={`/api/uploads?file=${encodeURIComponent(task.photo)}`}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/15">
            <ImageIcon size={34} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{task.category}</span>
          <span className="rounded-full bg-emerald-500/80 px-2.5 py-1 text-[11px] font-bold text-black backdrop-blur">{task.remaining} left</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold">{task.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 font-extrabold text-emerald-400"><Kred size={15} /> {task.reward}</span>
            <span className="text-white/45">{proofLabel(task)}</span>
          </div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 transition group-hover:bg-white group-hover:text-black">
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  );
}

function ExploreList() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listTasks().then(setTasks).catch((e) => setError(e instanceof Error ? e.message : 'Could not load tasks.'));
    // Tasks the user has submitted or finished sink to the bottom of every tab; ones they
    // only started (in_progress) stay on top so they can still finish them.
    listMySubmissions()
      .then((subs) => setDoneIds(new Set(subs.filter((s) => s.status !== 'in_progress').map((s) => s.taskId))))
      .catch(() => { /* ordering is best-effort */ });
  }, []);

  if (error) return <p className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{error}</p>;
  if (!tasks)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}
      </div>
    );

  const categories = ['All', ...Array.from(new Set(tasks.map((t) => t.category)))];
  const filtered = tasks.filter((t) => (category === 'All' || t.category === category) && t.title.toLowerCase().includes(search.toLowerCase()));
  // Stable sort keeps the newest-first order within each group; done tasks move last.
  const ordered = [...filtered].sort((a, b) => Number(doneIds.has(a.id)) - Number(doneIds.has(b.id)));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-white/30"
        />
      </div>
      {categories.length > 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition active:scale-95 ${category === c ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:border-white/40'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        tasks.length === 0 ? (
          <EmptyState icon={Sparkles} title="No tasks yet" text="New tasks are added regularly. Check back soon — or earn some kreds with a game while you wait." action={{ to: '/dashboard/games', label: 'Play games' }} />
        ) : (
          <EmptyState icon={Search} title="No matches" text="No tasks match your search. Try a different word or category." />
        )
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {ordered.map((t) => <TaskTile key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

function MyTasksList() {
  const [subs, setSubs] = useState<MySubmission[] | null>(null);
  useEffect(() => {
    listMySubmissions().then(setSubs).catch(() => setSubs([]));
  }, []);
  if (!subs) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}</div>;
  if (subs.length === 0) return <EmptyState icon={ListChecks} title="No tasks started yet" text="Pick a task from Explore and your progress will show up here." action={{ to: '/dashboard', label: 'Explore tasks' }} />;
  return (
    <div className="stagger space-y-3">
      {subs.map((s) => (
        <Link key={s.id} to={`/dashboard/tasks/${s.taskId}`} className="pressable flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
          <div className="min-w-0">
            <h3 className="truncate font-extrabold">{s.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-400"><Kred size={14} /> {s.reward}</div>
            {s.rejectReason && <p className="mt-1 text-xs text-red-400">Reason: {s.rejectReason}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusChip[s.status]}`}>{statusLabel[s.status]}</span>
        </Link>
      ))}
    </div>
  );
}

// The emerald hero — balance up top, stat tiles below, styled like the referral card.
function BalanceHero({ user, wallet }: { user: { username: string } | null; wallet: Wallet | null }) {
  const balance = wallet?.balanceTokens ?? 0;
  const balanceNaira = wallet?.balanceNaira ?? 0;
  const tasks = wallet?.tasksThisCycle ?? 0;
  const earned = wallet?.transactions.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0) ?? 0;
  const rate = wallet?.rate;
  const earnedNaira = rate && rate.tokens > 0 ? Math.floor((earned * rate.naira) / rate.tokens) : 0;

  return (
    <section className="animate-[fadeup_320ms_ease-out] overflow-hidden rounded-[1.9rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.16] via-emerald-500/[0.05] to-transparent p-6 sm:p-7">
      <div>
        <p className="text-sm text-white/55">Good to see you again,</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{user?.username} 👋</h1>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
          <WalletIcon size={13} /> Available balance
        </div>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="flex items-center gap-2 text-5xl font-extrabold leading-none sm:text-6xl">
            {balance.toLocaleString()} <Kred size={32} className="text-emerald-400" />
          </span>
          <span className="pb-1 text-sm font-semibold text-white/50">≈ ₦{balanceNaira.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black/25 p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-emerald-400">{earned.toLocaleString()} <Kred size={15} /></div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Total earned</div>
          <div className="text-[10px] text-white/30">≈ ₦{earnedNaira.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-black/25 p-4 text-center">
          <div className="text-xl font-extrabold">{tasks.toLocaleString()}</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Tasks this cycle</div>
          <div className="text-[10px] text-white/30">completed</div>
        </div>
      </div>

      <Link
        to="/dashboard/wallet"
        className="pressable mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
      >
        <WalletIcon size={16} /> Open Wallet <ArrowRight size={15} />
      </Link>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : 'explore';
  const setTab = (t: Tab) => setParams(t === 'explore' ? {} : { tab: t }, { replace: true });

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const load = useCallback(() => {
    getWallet().then(setWallet).catch(() => setWallet(null));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-8">
      <BalanceHero user={user} wallet={wallet} />

      <section className="space-y-4">
        <Tabs
          tabs={[{ id: 'explore' as Tab, label: 'Explore Tasks' }, { id: 'mine' as Tab, label: 'My Tasks' }]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'explore' ? <ExploreList /> : <MyTasksList />}
      </section>

      <Link to="/dashboard/games" className="pressable flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent p-5 transition hover:border-white/25">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 size={24} /></div>
          <div>
            <div className="font-extrabold">Play Games, Earn Kreds</div>
            <div className="text-sm text-white/55">Snake, Memory Match, Reaction Test and Trivia Quiz.</div>
          </div>
        </div>
        <ArrowRight size={20} className="shrink-0" />
      </Link>
    </div>
  );
}
KREDILO_CHUNK1_EOF
echo "  wrote src/pages/dashboard/Dashboard.tsx"
mkdir -p "src/pages/dashboard"
cat > "src/pages/dashboard/Profile.tsx" <<'KREDILO_CHUNK1_EOF'
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
      <p className="mt-1 text-sm text-white/55">You get {info.bonus} kreds each time someone you invite completes their first task.</p>

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
KREDILO_CHUNK1_EOF
echo "  wrote src/pages/dashboard/Profile.tsx"

echo ""
echo "Chunk 1 written. Next:"
echo "  1) cd server && npm test          # should pass (includes a new dedupe test)"
echo "  2) cd ..     && npm run build      # type-check + build the frontend"
echo "  3) git add -A && git commit -m 'chunk1: team dedupe, task ordering, dock overlap, avatar viewer' && git push"
