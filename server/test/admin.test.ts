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
