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
