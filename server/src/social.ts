import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { creditReward, LedgerError } from './ledger.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

// Kreds earned for following each social platform (one-time, per platform).
export const FOLLOW_BONUS = 10;
const PLATFORMS = ['whatsapp', 'facebook', 'x', 'instagram'];

export function socialRoutes({ db, route, requireUser }: Deps) {
  route('GET', '/api/follow/status', async (c) => {
    const u = requireUser(c);
    const rows = db.prepare('SELECT platform FROM social_follows WHERE user_id = ?').all(u.id) as { platform: string }[];
    return { bonus: FOLLOW_BONUS, platforms: PLATFORMS, claimed: rows.map((r) => r.platform) };
  });

  route('POST', '/api/follow/claim', async (c) => {
    const u = requireUser(c);
    const platform = typeof c.body.platform === 'string' ? c.body.platform : '';
    if (!PLATFORMS.includes(platform)) throw new HttpError(400, 'Unknown platform.');

    const ins = db.prepare('INSERT OR IGNORE INTO social_follows (id, user_id, platform) VALUES (?, ?, ?)').run(newId(), u.id, platform);
    if (ins.changes === 0) {
      const rows = db.prepare('SELECT platform FROM social_follows WHERE user_id = ?').all(u.id) as { platform: string }[];
      return { already: true, claimed: rows.map((r) => r.platform) };
    }
    try {
      creditReward(db, {
        userId: u.id, tokens: FOLLOW_BONUS, refType: 'follow', refId: platform,
        idempotencyKey: `follow:${u.id}:${platform}`, fromReserve: true, actorId: u.id,
      });
    } catch (e) {
      db.prepare('DELETE FROM social_follows WHERE user_id = ? AND platform = ?').run(u.id, platform);
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Follow rewards are temporarily unavailable. Try again later.');
      throw e;
    }
    audit(db, u.id, 'follow.claim', platform, { kreds: FOLLOW_BONUS });
    const rows = db.prepare('SELECT platform FROM social_follows WHERE user_id = ?').all(u.id) as { platform: string }[];
    return { already: false, kreds: FOLLOW_BONUS, claimed: rows.map((r) => r.platform) };
  });
}
