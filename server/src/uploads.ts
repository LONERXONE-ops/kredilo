import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './config.ts';
import { HttpError } from './http.ts';
import { cloudinaryFetchPrivate, cloudinaryOn, cloudinaryPublicUrl, cloudinaryUpload } from './cloudinary.ts';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(root, 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'webp', test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
];

function checkImage(dataUrl: unknown): { bytes: Buffer; ext: string; hash: string } {
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
  return { bytes, ext: match.ext, hash: createHash('sha256').update(bytes).digest('hex') };
}

export async function saveImage(dataUrl: unknown): Promise<{ file: string; hash: string }> {
  const { bytes, ext, hash } = checkImage(dataUrl);
  if (cloudinaryOn()) {
    const publicId = await cloudinaryUpload(bytes, { folder: 'kredilo/private', type: 'authenticated', publicId: hash });
    return { file: `cld:${publicId}`, hash };
  }
  const file = `${hash}.${ext}`;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(path.join(UPLOAD_DIR, file), bytes);
  return { file, hash };
}

export async function saveAvatar(dataUrl: unknown, userId: string): Promise<{ ref: string }> {
  const { bytes, ext } = checkImage(dataUrl);
  if (cloudinaryOn()) {
    const publicId = await cloudinaryUpload(bytes, { folder: 'kredilo/avatars', type: 'upload', publicId: `u_${userId}` });
    return { ref: cloudinaryPublicUrl(publicId) };
  }
  const file = `avatar_${userId}.${ext}`;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(path.join(UPLOAD_DIR, file), bytes);
  return { ref: `local:${file}` };
}

export async function readPrivateImage(ref: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (ref.startsWith('cld:')) {
    return cloudinaryFetchPrivate(ref.slice(4));
  }
  const full = path.join(UPLOAD_DIR, ref);
  if (!existsSync(full)) return null;
  const bytes = readFileSync(full);
  const contentType = ref.endsWith('.png') ? 'image/png' : ref.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return { bytes, contentType };
}

export function avatarUrl(ref: string | null): string | null {
  if (!ref) return null;
  if (ref.startsWith('http')) return ref;
  if (ref.startsWith('local:')) return `/api/avatar?file=${encodeURIComponent(ref.slice(6))}`;
  return null;
}

export function readLocalAvatar(file: string): { bytes: Buffer; contentType: string } | null {
  if (!/^avatar_[A-Za-z0-9-]+\.(png|jpg|webp)$/.test(file)) return null;
  const full = path.join(UPLOAD_DIR, file);
  if (!existsSync(full)) return null;
  const bytes = readFileSync(full);
  const contentType = file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return { bytes, contentType };
}
