import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { creditReward, balance } from '../src/ledger.ts';

const OWNER = 'owner@example.com';
const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

async function fund(t: any, userId: string, tokens: number, n = 0) {
  await creditReward(t.db, { userId, tokens, refType: 'test', refId: `f${n}`, idempotencyKey: `f:${userId}:${n}`, fromReserve: false });
}
const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;
const open = (t: any, owner: string, when = past()) => t.call('POST', '/api/admin/withdrawals/settings', { opensAt: when }, owner);
const req = (t: any, cookie: string, over: Record<string, unknown> = {}) =>
  t.call('POST', '/api/withdrawals/request', { bankName: 'Opay', accountName: 'Wisdom T', accountNumber: '9125007478', amountTokens: 2000, ...over }, cookie);

test('withdrawals are closed until an admin sets a past/now open date', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  await fund(t,await meId(t, u), 3000);
  assert.equal((await t.call('GET', '/api/withdrawals', undefined, u)).json.open, false);
  assert.equal((await req(t, u)).status, 403);
  await open(t, owner, future());
  assert.equal((await t.call('GET', '/api/withdrawals', undefined, u)).json.open, false);
  assert.equal((await req(t, u)).status, 403);
  await open(t, owner);
  assert.equal((await t.call('GET', '/api/withdrawals', undefined, u)).json.open, true);
  assert.equal((await req(t, u)).status, 200);
  t.close();
});

test('only admins can change the open date', async () => {
  const t = await setup();
  await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  assert.equal((await t.call('POST', '/api/admin/withdrawals/settings', { opensAt: past() }, u)).status, 403);
  t.close();
});

test('request holds tokens, enforces minimum and balance, validates bank fields', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  const uid = await meId(t, u);
  await fund(t,uid, 2500);
  await open(t, owner);
  assert.equal((await req(t, u, { amountTokens: 1999 })).status, 400);
  assert.equal((await req(t, u, { amountTokens: 3000 })).status, 400);
  assert.equal((await req(t, u, { accountNumber: 'abc' })).status, 400);
  assert.equal((await req(t, u, { bankName: '' })).status, 400);
  assert.equal(await balance(t.db, uid), 2500);
  assert.equal((await req(t, u, { amountTokens: 2000 })).status, 200);
  assert.equal(await balance(t.db, uid), 500);
  t.close();
});

test('only one open request at a time', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  await fund(t,await meId(t, u), 5000);
  await open(t, owner);
  assert.equal((await req(t, u)).status, 200);
  assert.equal((await req(t, u)).status, 409);
  t.close();
});

test('bank details are encrypted at rest; admin sees them decrypted, lists show last4', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  await fund(t,await meId(t, u), 2500);
  await open(t, owner);
  await req(t, u, { accountNumber: '9125007478', accountName: 'Wisdom T' });
  const raw = JSON.stringify(await t.db.prepare('SELECT * FROM withdrawals').all());
  assert.equal(raw.includes('9125007478'), false);
  assert.equal(raw.includes('Wisdom T'), false);
  const adminList = await t.call('GET', '/api/admin/withdrawals', undefined, owner);
  assert.equal(adminList.json.withdrawals[0].accountNumber, '9125007478');
  assert.equal(adminList.json.withdrawals[0].accountName, 'Wisdom T');
  const mine = await t.call('GET', '/api/withdrawals', undefined, u);
  assert.equal(mine.json.withdrawals[0].accountLast4, '7478');
  assert.equal(JSON.stringify(mine.json).includes('9125007478'), false);
  t.close();
});

test('admin marks paid (needs a ref); tokens stay spent; user can flag not received', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  const uid = await meId(t, u);
  await fund(t,uid, 2500);
  await open(t, owner);
  const id = (await req(t, u)).json.id;
  assert.equal(await balance(t.db, uid), 500);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/paid', { id }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/paid', { id, transferRef: 'TRX123' }, owner)).status, 200);
  assert.equal(await balance(t.db, uid), 500);
  const mine = (await t.call('GET', '/api/withdrawals', undefined, u)).json.withdrawals[0];
  assert.equal(mine.status, 'paid');
  assert.equal(mine.transferRef, 'TRX123');
  assert.equal((await t.call('POST', '/api/withdrawals/not-received', { id }, u)).status, 200);
  t.close();
});

test('cancel voids tokens by default, or returns them when asked; both need a reason', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  const uid = await meId(t, u);
  await fund(t,uid, 5000);
  await open(t, owner);
  const id1 = (await req(t, u)).json.id;
  assert.equal(await balance(t.db, uid), 3000);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/cancel', { id: id1 }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/cancel', { id: id1, reason: 'Suspected fraud' }, owner)).status, 200);
  assert.equal(await balance(t.db, uid), 3000);
  const id2 = (await req(t, u)).json.id;
  assert.equal(await balance(t.db, uid), 1000);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/cancel', { id: id2, reason: 'Wrong details', returnTokens: true }, owner)).status, 200);
  assert.equal(await balance(t.db, uid), 3000);
  assert.equal((await req(t, u)).status, 200);
  t.close();
});

test('normal users cannot see the admin withdrawal queue or settle requests', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const u = await t.makeUser('u@example.com');
  await fund(t,await meId(t, u), 2500);
  await open(t, owner);
  const id = (await req(t, u)).json.id;
  assert.equal((await t.call('GET', '/api/admin/withdrawals', undefined, u)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/paid', { id, transferRef: 'x' }, u)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/cancel', { id, reason: 'x' }, u)).status, 403);
  t.close();
});

test('only the owner can set the go-live date; other admins can view but not change it', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const r = await t.call('POST', '/api/admin/invites', { email: 'rev@example.com', role: 'reviewer' }, owner);
  const token = new URL(r.json.inviteUrl).searchParams.get('token')!;
  const rev = await t.makeUser('rev@example.com');
  await t.call('POST', '/api/admin/invites/accept', { token }, rev);
  assert.equal((await t.call('GET', '/api/admin/withdrawals/settings', undefined, rev)).status, 200);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/settings', { opensAt: past() }, rev)).status, 403);
  assert.equal((await t.call('POST', '/api/admin/withdrawals/settings', { opensAt: past() }, owner)).status, 200);
  t.close();
});
