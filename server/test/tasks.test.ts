import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { balance, reserveAvailable } from '../src/ledger.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OWNER = 'owner@example.com';

async function adminTask(t: any, owner: string, over: Record<string, unknown> = {}) {
  return t.call('POST', '/api/admin/tasks', { title: 'Follow us', description: 'Follow and screenshot', category: 'Social Media', reward: 30, proofType: 'screenshot', maxCompletions: 2, ...over }, owner);
}
const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;

test('only admins can create tasks; validation is enforced', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const member = await t.makeUser('m@example.com');
  assert.equal((await adminTask(t, member)).status, 403);
  assert.equal((await adminTask(t, '')).status, 401);
  assert.equal((await adminTask(t, owner, { reward: 0 })).status, 400);
  assert.equal((await adminTask(t, owner, { title: '' })).status, 400);
  assert.equal((await adminTask(t, owner, { maxCompletions: 0 })).status, 400);
  const ok = await adminTask(t, owner);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.task.reward, 30);
  assert.equal(ok.json.task.remaining, 2);
  t.close();
});

test('full doer flow: accept, submit, admin approves, tokens credited once', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const did = await meId(t, doer);
  const taskId = (await adminTask(t, owner)).json.task.id;
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, doer)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, doer)).status, 409);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer)).json.status, 'pending_review');
  const queue = await t.call('GET', '/api/admin/submissions', undefined, owner);
  assert.equal(queue.json.submissions.length, 1);
  const subId = queue.json.submissions[0].id;
  assert.equal(await balance(t.db, did), 0);
  assert.equal((await t.call('GET', '/api/tasks/mine', undefined, doer)).json.submissions[0].status, 'pending_review');
  assert.equal((await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner)).status, 200);
  assert.equal(await balance(t.db, did), 30);
  assert.equal(await reserveAvailable(t.db), 4800 - 30);
  assert.equal((await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner)).status, 409);
  assert.equal(await balance(t.db, did), 30);
  t.close();
});

test('reject records a reason, credits nothing, and the doer sees it', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const did = await meId(t, doer);
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  assert.equal((await t.call('POST', '/api/admin/submissions/reject', { submissionId: subId }, owner)).status, 400);
  assert.equal((await t.call('POST', '/api/admin/submissions/reject', { submissionId: subId, reason: 'Screenshot does not show a follow' }, owner)).status, 200);
  assert.equal(await balance(t.db, did), 0);
  const mine = (await t.call('GET', '/api/tasks/mine', undefined, doer)).json.submissions[0];
  assert.equal(mine.status, 'rejected');
  assert.equal(mine.rejectReason, 'Screenshot does not show a follow');
  t.close();
});

test('a task closes when it reaches its completion cap', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { maxCompletions: 1 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a);
  const subA = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subA }, owner);
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, b)).status, 404);
  assert.equal((await t.call('GET', '/api/tasks', undefined, b)).json.tasks.length, 0);
  t.close();
});

test('you cannot do your own task; non-image proof is rejected by type check', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner)).json.task.id;
  assert.equal((await t.call('POST', '/api/tasks/accept', { taskId }, owner)).status, 403);
  const doer = await t.makeUser('doer@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  const notImage = 'data:text/plain;base64,' + Buffer.from('hello not an image at all').toString('base64');
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: notImage }, doer)).status, 415);
  t.close();
});

test('the same screenshot cannot be reused by a second account on the same task', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { maxCompletions: 5 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/accept', { taskId }, b);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, b)).status, 409);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG2 }, b)).status, 200);
  t.close();
});

test('handle-required task: handle is mandatory and unique per task', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const taskId = (await adminTask(t, owner, { needsHandle: true, maxCompletions: 5 })).json.task.id;
  const a = await t.makeUser('a@example.com');
  const b = await t.makeUser('b@example.com');
  await t.call('POST', '/api/tasks/accept', { taskId }, a);
  await t.call('POST', '/api/tasks/accept', { taskId }, b);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, a)).status, 400);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG, handle: '@wisdom' }, a)).status, 200);
  assert.equal((await t.call('POST', '/api/tasks/submit', { taskId, image: PNG2, handle: '@wisdom' }, b)).status, 409);
  t.close();
});

test('uploaded screenshot is viewable by an admin and by the owner of it, not by a stranger', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const stranger = await t.makeUser('s@example.com');
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const file = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].proofFile as string;
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, owner)).status, 200);
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, doer)).status, 200);
  assert.equal((await t.call('GET', `/api/uploads?file=${file}`, undefined, stranger)).status, 403);
  assert.equal((await t.call('GET', `/api/uploads?file=../secret.txt`, undefined, owner)).status, 400);
  t.close();
});

test('wallet route reflects credited rewards and the real rate', async () => {
  const t = await setup();
  const owner = await t.makeUser(OWNER);
  const doer = await t.makeUser('doer@example.com');
  const taskId = (await adminTask(t, owner)).json.task.id;
  await t.call('POST', '/api/tasks/accept', { taskId }, doer);
  await t.call('POST', '/api/tasks/submit', { taskId, image: PNG }, doer);
  const subId = (await t.call('GET', '/api/admin/submissions', undefined, owner)).json.submissions[0].id;
  await t.call('POST', '/api/admin/submissions/approve', { submissionId: subId }, owner);
  const w = (await t.call('GET', '/api/wallet', undefined, doer)).json;
  assert.equal(w.balanceTokens, 30);
  assert.equal(w.balanceNaira, 15);
  assert.equal(w.minWithdrawalTokens, 2000);
  assert.equal(w.minWithdrawalNaira, 1000);
  assert.equal(w.transactions[0].reason, 'task_reward');
  t.close();
});
