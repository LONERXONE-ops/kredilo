import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('a user can upload, see, and remove their avatar; it appears in /me', async () => {
  const t = await setup();
  const u = await t.makeUser('u@example.com');
  assert.equal((await t.call('GET', '/api/auth/me', undefined, u)).json.user.avatar, null);
  assert.equal((await t.call('POST', '/api/avatar', { image: PNG }, u)).status, 200);
  const me = (await t.call('GET', '/api/auth/me', undefined, u)).json.user;
  assert.ok(typeof me.avatar === 'string' && me.avatar.length > 0);
  assert.equal((await t.call('POST', '/api/avatar/remove', {}, u)).status, 200);
  assert.equal((await t.call('GET', '/api/auth/me', undefined, u)).json.user.avatar, null);
  t.close();
});

test('avatar upload rejects non-images; requires login', async () => {
  const t = await setup();
  const u = await t.makeUser('u@example.com');
  const notImage = 'data:text/plain;base64,' + Buffer.from('nope not an image here').toString('base64');
  assert.equal((await t.call('POST', '/api/avatar', { image: notImage }, u)).status, 415);
  assert.equal((await t.call('POST', '/api/avatar', { image: PNG })).status, 401);
  t.close();
});

test('the locally-served avatar file streams back as an image', async () => {
  const t = await setup();
  const u = await t.makeUser('u@example.com');
  await t.call('POST', '/api/avatar', { image: PNG }, u);
  const url = (await t.call('GET', '/api/auth/me', undefined, u)).json.user.avatar as string;
  const file = new URL('http://x' + url).searchParams.get('file')!;
  assert.equal((await t.call('GET', `/api/avatar?file=${encodeURIComponent(file)}`, undefined, u)).status, 200);
  assert.equal((await t.call('GET', `/api/avatar?file=../secret`, undefined, u)).status, 404);
  t.close();
});
