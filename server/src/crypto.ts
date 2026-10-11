import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

// Symmetric encryption for bank details at rest. The key comes from DATA_KEY in .env (any passphrase);
// we hash it to 32 bytes. If no key is set, a per-process key is used (dev only) so nothing crashes,
// but then encrypted values won't survive a restart — set DATA_KEY in production.
const keySource = process.env.DATA_KEY ?? '';
const key = keySource ? createHash('sha256').update(keySource).digest() : randomBytes(32);

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(blob: string): string {
  try {
    const [ivB, tagB, encB] = blob.split('.');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
