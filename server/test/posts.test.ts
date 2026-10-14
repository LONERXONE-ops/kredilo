import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { reserveAvailable, balance } from '../src/ledger.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const RCPT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OWNER = 'owner@example.com';

async function makePost(t: any, cookie: string, over: Record<string, unknown> = {}) {
  return t.call('POST', '/api/post/create', { title: 'Follow me', description: 'Follow my page', category: 'Social Media', days: 1, maxCompletions: 3, needsHandle: true, photo: PNG, receipt: RCPT, ...over }, cookie);
}

test('pricing is exposed to signed-in users as a daily rate', async () => {
  const t = await setup();
  const u = await t.makeUser('u@example.com');
  assert.equal((await t.call('GET', '/api/post/pricing')).status, 401);
  const r = await t.call('GET', '/api/post/pricing', undefined, u);
  assert.equal(r.status, 200);
  assert.equal(r.json.perDayNaira, 1000);
  assert.equal(r.json.perDayTokens, 30);
  assert.equal(r.json.maxDays, 10);
  t.close();
});

test('a posted task starts pending_payment, is NOT live, and funds no reserve yet', async () => {
  const t = await setup();
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const r = await makePost(t, poster);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'pending_payment');
  assert.equal(r.json.pool, 90);
  assert.equal(await reserveAvailable(t.db), before);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 0);
  t.close();
});

test('bad posts are rejected: missing photo, missing receipt, bad duration', async () => {
  const t = await setup();
  const poster = await t.makeUser('poster@example.com');
  assert.equal((await makePost(t, poster, { photo: undefined })).status, 400);
  assert.equal((await makePost(t, poster, { receipt: undefined })).status, 400);
  assert.equal((await makePost(t, poster, { days: 11 })).status, 400);
  assert.equal((await makePost(t, poster, { maxCompletions: 0 })).status, 400);
  t.close();
});

test('admin confirms payment: task goes live and its pool funds the reserve exactly once', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const id = (await makePost(t, poster)).json.id;
  const queue = await t.call('GET', '/api/admin/posts', undefined, owner);
  assert.equal(queue.json.posts.length, 1);
  assert.equal(queue.json.posts[0].pool, 90);
  assert.equal((await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'Seen in bank' }, owner)).status, 200);
  assert.equal(await reserveAvailable(t.db), before + 90);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 1);
  assert.equal((await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'x' }, owner)).status, 409);
  assert.equal(await reserveAvailable(t.db), before + 90);
  t.close();
});

test('rejecting a post needs a reason and never funds the reserve', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const before = await reserveAvailable(t.db);
  const id = (await makePost(t, poster)).json.id;
  assert.equal((await t.call('POST', '/api/admin/posts/reject', { taskId: id }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/posts/reject', { taskId: id, note: 'Payment not received' }, owner)).status, 200);
  assert.equal(await reserveAvailable(t.db), before);
  const doer = await t.makeUser('doer@example.com');
  assert.equal((await t.call('GET', '/api/tasks', undefined, doer)).json.tasks.length, 0);
  t.close();
});

test('doers complete a posted task; reward comes from the funded pool, poster sees doers but not emails', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const doer = await t.makeUser('doer@example.com');
  const did = (await t.call('GET', '/api/auth/me', undefined, doer)).json.user.id;
  const id = (await makePost(t, poster, { maxCompletions: 1 })).json.id;
  await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'ok' }, owner);
  const afterFund = await reserveAvailable(t.db);
  await t.call('POST', '/api/tasks/accept', { taskId: id }, doer);
  let doers = await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster);
  assert.equal(doers.json.ongoing.length, 1);
  assert.equal(JSON.stringify(doers.json).includes('doer@example.com'), false);
  await t.call('POST', '/api/tasks/submit', { taskId: id, image: PNG, handle: '@someone' }, doer);
  doers = await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster);
  assert.equal(doers.json.completed.length, 1);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner);
  assert.equal(await balance(t.db, did), 30);
  assert.equal(await reserveAvailable(t.db), afterFund - 30);
  assert.equal(await reserveAvailable(t.db), 4800);
  t.close();
});

test('only the poster can see their doers; others are blocked', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const poster = await t.makeUser('poster@example.com');
  const nosey = await t.makeUser('nosey@example.com');
  const id = (await makePost(t, poster)).json.id;
  await t.call('POST', '/api/admin/posts/confirm', { taskId: id, note: 'ok' }, owner);
  assert.equal((await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, nosey)).status, 404);
  assert.equal((await t.call('GET', `/api/post/doers?taskId=${id}`, undefined, poster)).status, 200);
  t.close();
});
