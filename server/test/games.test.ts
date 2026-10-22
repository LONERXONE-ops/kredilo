import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';
import { balance } from '../src/ledger.ts';

const meId = async (t: any, cookie: string) => (await t.call('GET', '/api/auth/me', undefined, cookie)).json.user.id as string;

test('games pay once per day up to their cap, including the three new games', async () => {
  const t = await setup();
  const u = await t.makeUser('gamer@example.com');
  const status = await t.call('GET', '/api/games/status', undefined, u);
  assert.equal(status.status, 200);
  for (const g of ['stroop', 'math', 'tiles']) assert.ok(g in status.json.caps, `${g} missing from caps`);
  const cap = status.json.caps.stroop as number;
  const first = await t.call('POST', '/api/games/claim', { game: 'stroop', score: 9999 }, u);
  assert.equal(first.status, 200);
  assert.equal(first.json.already, false);
  assert.equal(first.json.kreds, cap);
  assert.equal(await balance(t.db, await meId(t, u)), cap);
  const second = await t.call('POST', '/api/games/claim', { game: 'stroop', score: 9999 }, u);
  assert.equal(second.json.already, true);
  assert.equal((await t.call('POST', '/api/games/claim', { game: 'nope', score: 5 }, u)).status, 400);
  t.close();
});
