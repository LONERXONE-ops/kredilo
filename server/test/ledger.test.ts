import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import {
  addFunding, balance, creditReward, currentSettings, holdForWithdrawal, LedgerError,
  releaseWithdrawal, reserveAvailable, tokensToNaira,
} from '../src/ledger.ts';
import type { Db } from '../src/db.ts';

const fresh = () => openDb({ url: ':memory:' });

async function freshUser(db: Db, id = 'u1'): Promise<string> {
  await db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'x')").run(id, `${id}@example.com`);
  return id;
}

test('default settings: 100 tokens = 50 naira, min withdrawal 2000 tokens', async () => {
  const db = await fresh();
  const s = await currentSettings(db);
  assert.deepEqual(s.rate, { num: 100, den: 50 });
  assert.equal(s.minWithdrawalTokens, 2000);
  assert.equal(tokensToNaira(2000, s.rate), 1000);
  assert.equal(tokensToNaira(30, s.rate), 15);
});

test('reserve seeded at 4800 tokens (₦2,400)', async () => {
  const db = await fresh();
  assert.equal(await reserveAvailable(db), 4800);
  assert.equal(tokensToNaira(await reserveAvailable(db), (await currentSettings(db)).rate), 2400);
});

test('a reward credits the user and draws down the reserve by the same amount', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' });
  assert.equal(await balance(db, u), 30);
  assert.equal(await reserveAvailable(db), 4800 - 30);
  assert.equal(tokensToNaira(await balance(db, u), (await currentSettings(db)).rate), 15);
});

test('the same completion can never be credited twice (idempotency key)', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' });
  await assert.rejects(
    creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' }),
    (e) => e instanceof LedgerError && e.code === 'duplicate',
  );
  assert.equal(await balance(db, u), 30);
  assert.equal(await reserveAvailable(db), 4770);
});

test('rewards stop when the reserve is exhausted, and nothing partial is written', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  for (let i = 0; i < 160; i++) await creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: `t${i}`, idempotencyKey: `c:${i}` });
  assert.equal(await reserveAvailable(db), 0);
  assert.equal(await balance(db, u), 4800);
  await assert.rejects(
    creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 'tX', idempotencyKey: 'c:X' }),
    (e) => e instanceof LedgerError && e.code === 'reserve_exhausted',
  );
  assert.equal(await balance(db, u), 4800);
  assert.equal(await reserveAvailable(db), 0);
});

test('adding funding lets more rewards be issued', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  for (let i = 0; i < 160; i++) await creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: `t${i}`, idempotencyKey: `c:${i}` });
  assert.equal(await reserveAvailable(db), 0);
  await addFunding(db, 60, 'post_payment', 'posted_task', 'p1');
  await creditReward(db, { userId: u, tokens: 30, refType: 'posted_task', refId: 'p1', idempotencyKey: 'pc:1' });
  assert.equal(await reserveAvailable(db), 30);
  assert.equal(await balance(db, u), 4830);
});

test('a reward not drawn from the reserve (e.g. game) does not touch it', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 10, refType: 'game', refId: 'g1', idempotencyKey: 'g:1', fromReserve: false });
  assert.equal(await balance(db, u), 10);
  assert.equal(await reserveAvailable(db), 4800);
});

test('withdrawal hold removes tokens; too-large hold is refused with nothing written', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 2000, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  await holdForWithdrawal(db, u, 2000, 'w1');
  assert.equal(await balance(db, u), 0);
  await assert.rejects(
    holdForWithdrawal(db, u, 1, 'w2'),
    (e) => e instanceof LedgerError && e.code === 'insufficient',
  );
  assert.equal(await balance(db, u), 0);
});

test('releasing a withdrawal returns tokens exactly once', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 2000, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  await holdForWithdrawal(db, u, 2000, 'w1');
  await releaseWithdrawal(db, u, 2000, 'w1');
  assert.equal(await balance(db, u), 2000);
  await releaseWithdrawal(db, u, 2000, 'w1');
  assert.equal(await balance(db, u), 2000);
});

test('ledger and reserve are append-only', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:1' });
  await assert.rejects(db.prepare('UPDATE ledger SET amount = 999').run(), /append-only/);
  await assert.rejects(db.prepare('DELETE FROM ledger').run(), /append-only/);
  await assert.rejects(db.prepare('UPDATE reserve SET amount = 999').run(), /append-only/);
  await assert.rejects(db.prepare('DELETE FROM reserve').run(), /append-only/);
});

test('balance never silently changes when the rate changes later', async () => {
  const db = await fresh();
  const u = await freshUser(db);
  await creditReward(db, { userId: u, tokens: 100, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  await db.prepare('INSERT INTO settings (tokens_per_naira_num, tokens_per_naira_den, min_withdrawal_tokens) VALUES (200, 50, 2000)').run();
  assert.equal(await balance(db, u), 100);
  const row = (await db.prepare("SELECT rate_num AS n, rate_den AS d FROM ledger WHERE reason = 'task_reward'").get()) as { n: number; d: number };
  assert.deepEqual([row.n, row.d], [100, 50]);
});
