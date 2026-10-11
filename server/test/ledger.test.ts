import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import {
  addFunding, balance, creditReward, currentSettings, holdForWithdrawal, LedgerError,
  releaseWithdrawal, reserveAvailable, tokensToNaira,
} from '../src/ledger.ts';
import type { Db } from '../src/db.ts';

function freshUser(db: Db, id = 'u1'): string {
  db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'x')").run(id, `${id}@example.com`);
  return id;
}

test('default settings: 100 tokens = 50 naira, min withdrawal 2000 tokens', () => {
  const db = openDb(':memory:');
  const s = currentSettings(db);
  assert.deepEqual(s.rate, { num: 100, den: 50 });
  assert.equal(s.minWithdrawalTokens, 2000);
  assert.equal(tokensToNaira(2000, s.rate), 1000);
  assert.equal(tokensToNaira(30, s.rate), 15);
});

test('reserve seeded at 4800 tokens (₦2,400)', () => {
  const db = openDb(':memory:');
  assert.equal(reserveAvailable(db), 4800);
  assert.equal(tokensToNaira(reserveAvailable(db), currentSettings(db).rate), 2400);
});

test('a reward credits the user and draws down the reserve by the same amount', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' });
  assert.equal(balance(db, u), 30);
  assert.equal(reserveAvailable(db), 4800 - 30);
  assert.equal(tokensToNaira(balance(db, u), currentSettings(db).rate), 15);
});

test('the same completion can never be credited twice (idempotency key)', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' });
  assert.throws(
    () => creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:u1:t1' }),
    (e) => e instanceof LedgerError && e.code === 'duplicate',
  );
  assert.equal(balance(db, u), 30);
  assert.equal(reserveAvailable(db), 4770);
});

test('rewards stop when the reserve is exhausted, and nothing partial is written', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  for (let i = 0; i < 160; i++) creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: `t${i}`, idempotencyKey: `c:${i}` });
  assert.equal(reserveAvailable(db), 0);
  assert.equal(balance(db, u), 4800);
  assert.throws(
    () => creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 'tX', idempotencyKey: 'c:X' }),
    (e) => e instanceof LedgerError && e.code === 'reserve_exhausted',
  );
  assert.equal(balance(db, u), 4800);
  assert.equal(reserveAvailable(db), 0);
});

test('adding funding lets more rewards be issued', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  for (let i = 0; i < 160; i++) creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: `t${i}`, idempotencyKey: `c:${i}` });
  assert.equal(reserveAvailable(db), 0);
  addFunding(db, 60, 'post_payment', 'posted_task', 'p1');
  creditReward(db, { userId: u, tokens: 30, refType: 'posted_task', refId: 'p1', idempotencyKey: 'pc:1' });
  assert.equal(reserveAvailable(db), 30);
  assert.equal(balance(db, u), 4830);
});

test('a reward not drawn from the reserve (e.g. game) does not touch it', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 10, refType: 'game', refId: 'g1', idempotencyKey: 'g:1', fromReserve: false });
  assert.equal(balance(db, u), 10);
  assert.equal(reserveAvailable(db), 4800);
});

test('withdrawal hold removes tokens; too-large hold is refused with nothing written', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 2000, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  holdForWithdrawal(db, u, 2000, 'w1');
  assert.equal(balance(db, u), 0);
  assert.throws(
    () => holdForWithdrawal(db, u, 1, 'w2'),
    (e) => e instanceof LedgerError && e.code === 'insufficient',
  );
  assert.equal(balance(db, u), 0);
});

test('releasing a withdrawal returns tokens exactly once', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 2000, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  holdForWithdrawal(db, u, 2000, 'w1');
  releaseWithdrawal(db, u, 2000, 'w1');
  assert.equal(balance(db, u), 2000);
  releaseWithdrawal(db, u, 2000, 'w1');
  assert.equal(balance(db, u), 2000);
});

test('ledger and reserve are append-only', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 30, refType: 'task', refId: 't1', idempotencyKey: 'c:1' });
  assert.throws(() => db.prepare('UPDATE ledger SET amount = 999').run(), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM ledger').run(), /append-only/);
  assert.throws(() => db.prepare('UPDATE reserve SET amount = 999').run(), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM reserve').run(), /append-only/);
});

test('balance never silently changes when the rate changes later', () => {
  const db = openDb(':memory:');
  const u = freshUser(db);
  creditReward(db, { userId: u, tokens: 100, refType: 'task', refId: 't1', idempotencyKey: 'c:1', fromReserve: false });
  db.prepare('INSERT INTO settings (tokens_per_naira_num, tokens_per_naira_den, min_withdrawal_tokens) VALUES (200, 50, 2000)').run();
  assert.equal(balance(db, u), 100);
  const row = db.prepare("SELECT rate_num AS n, rate_den AS d FROM ledger WHERE reason = 'task_reward'").get() as { n: number; d: number };
  assert.deepEqual([row.n, row.d], [100, 50]);
});
