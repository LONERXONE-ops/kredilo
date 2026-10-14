import type { Db } from './db.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { readLocalAvatar, saveAvatar } from './uploads.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function avatarRoutes({ db, route, requireUser }: Deps) {
  // Upload or replace your own profile picture.
  route('POST', '/api/avatar', async (c) => {
    const u = await requireUser(c);
    const { ref } = await saveAvatar(c.body.image, u.id);
    await db.prepare('UPDATE users SET avatar_ref = ? WHERE id = ?').run(ref, u.id);
    return { ok: true };
  });

  route('POST', '/api/avatar/remove', async (c) => {
    const u = await requireUser(c);
    await db.prepare('UPDATE users SET avatar_ref = NULL WHERE id = ?').run(u.id);
    return { ok: true };
  });

  // Serve a locally-stored avatar (public, so no auth needed; Cloudinary avatars load directly).
  route('GET', '/api/avatar', async (c) => {
    const file = str(c.query.file, 100);
    const img = readLocalAvatar(file);
    if (!img) throw new HttpError(404, 'Not found.');
    c.res.writeHead(200, { 'Content-Type': img.contentType, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    c.res.end(img.bytes);
    return undefined;
  });
}
