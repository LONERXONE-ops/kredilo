import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './config.ts';
import { HttpError } from './http.ts';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(root, 'uploads');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic-byte signatures: we trust the real bytes, never the filename or the client's content-type.
const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'webp', test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
];

// Accepts a base64 data URL or bare base64 string, verifies it is really an image, and saves it.
export function saveImage(dataUrl: unknown): { file: string; hash: string } {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0) throw new HttpError(400, 'No image provided.');
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, 'base64');
  } catch {
    throw new HttpError(400, 'The image could not be read.');
  }
  if (bytes.length === 0) throw new HttpError(400, 'The image is empty.');
  if (bytes.length > MAX_BYTES) throw new HttpError(413, 'The image is too large (max 5 MB).');

  const match = SIGNATURES.find((s) => s.test(bytes));
  if (!match) throw new HttpError(415, 'Only JPG, PNG or WebP images are allowed.');

  const hash = createHash('sha256').update(bytes).digest('hex');
  const file = `${hash}.${match.ext}`;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(path.join(UPLOAD_DIR, file), bytes); // same bytes -> same filename, so storage de-dupes
  return { file, hash };
}
