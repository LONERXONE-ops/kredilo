import { createHash } from 'node:crypto';

// Minimal Cloudinary client using only Node built-ins (no SDK). Enabled when all three keys are set.
const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? '';
const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';

export const cloudinaryOn = () => !!(cloud && apiKey && apiSecret);

function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

// Cloudinary signed-delivery signature: base64url(sha1(path + secret)) truncated to 8 chars.
// `path` is the public_id WITH its format extension (matches the delivered URL exactly).
function deliverySig(path: string): string {
  return createHash('sha1').update(path + apiSecret).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
}

// Uploads raw image bytes. type 'authenticated' = private; 'upload' = public. Returns the public_id.
export async function cloudinaryUpload(bytes: Buffer, opts: { folder: string; type: 'authenticated' | 'upload'; publicId: string }): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: opts.folder, public_id: opts.publicId, timestamp, type: opts.type };
  const form = new FormData();
  form.append('file', `data:application/octet-stream;base64,${bytes.toString('base64')}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', opts.folder);
  form.append('public_id', opts.publicId);
  form.append('type', opts.type);
  form.append('signature', sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
  const data = (await res.json()) as { public_id?: string; type?: string; error?: { message: string } };
  if (!res.ok || !data.public_id) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.public_id;
}

// Server-side authenticated fetch of a PRIVATE image's bytes (so we can stream it through our own
// permission-checked /api/uploads route; the browser never touches Cloudinary for private files).
export async function cloudinaryFetchPrivate(publicId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  // Step 1: look up the resource's format via the Admin API (Basic auth with key:secret).
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const info = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/authenticated/${encodeURIComponent(publicId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!info.ok) return null;
  const meta = (await info.json()) as { format?: string };
  const fmt = meta.format;
  if (!fmt) return null;

  // Step 2: build a *signed* authenticated-delivery URL ourselves. The Admin API's secure_url has
  // no s--signature-- segment, so Cloudinary rejects it (401). The signature is computed over the
  // delivered path including the extension: s--<sig>--/<public_id>.<format>.
  const path = `${publicId}.${fmt}`;
  const url = `https://res.cloudinary.com/${cloud}/image/authenticated/s--${deliverySig(path)}--/${path}`;

  const img = await fetch(url);
  if (!img.ok) return null;
  const buf = Buffer.from(await img.arrayBuffer());
  return { bytes: buf, contentType: img.headers.get('content-type') ?? `image/${fmt}` };
}

// Public delivery URL for a public (avatar) image — the browser loads this directly.
export const cloudinaryPublicUrl = (publicId: string) => `https://res.cloudinary.com/${cloud}/image/upload/${publicId}`;
