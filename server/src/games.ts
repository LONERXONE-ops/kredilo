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

// Max kreds per game, per day. Each game is claimable once per calendar day.
const CAPS: Record<string, number> = { snake: 50, memory: 50, reaction: 30, trivia: 40 };
const today = () => new Date().toISOString().slice(0, 10);

export function gameRoutes({ db, route, requireUser }: Deps) {
  route('GET', '/api/games/status', async (c) => {
    const u = requireUser(c);
    const day = today();
    const rows = db.prepare('SELECT game, kreds FROM game_claims WHERE user_id = ? AND day = ?').all(u.id, day) as { game: string; kreds: number }[];
    const claimed: Record<string, number> = {};
    for (const r of rows) claimed[r.game] = r.kreds;
    return { day, caps: CAPS, claimed };
  });

  route('POST', '/api/games/claim', async (c) => {
    const u = requireUser(c);
    const game = typeof c.body.game === 'string' ? c.body.game : '';
    if (!(game in CAPS)) throw new HttpError(400, 'Unknown game.');
    const raw = typeof c.body.score === 'number' && Number.isFinite(c.body.score) ? c.body.score : 0;
    const cap = CAPS[game];
    const kreds = Math.max(0, Math.min(cap, Math.round(raw)));
    const day = today();

    const existing = db.prepare('SELECT kreds FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').get(u.id, game, day) as { kreds: number } | undefined;
    if (existing) return { already: true, kreds: existing.kreds, cap };
    if (kreds <= 0) return { already: false, kreds: 0, cap };

    // Reserve the daily slot first (unique constraint stops races), then credit. If credit fails, release it.
    const ins = db.prepare('INSERT OR IGNORE INTO game_claims (id, user_id, game, day, kreds) VALUES (?, ?, ?, ?, ?)').run(newId(), u.id, game, day, kreds);
    if (ins.changes === 0) {
      const ex = db.prepare('SELECT kreds FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').get(u.id, game, day) as { kreds: number };
      return { already: true, kreds: ex.kreds, cap };
    }
    try {
      creditReward(db, {
        userId: u.id, tokens: kreds, refType: 'game', refId: `${game}:${day}`,
        idempotencyKey: `game:${u.id}:${game}:${day}`, fromReserve: true, actorId: u.id,
      });
    } catch (e) {
      db.prepare('DELETE FROM game_claims WHERE user_id = ? AND game = ? AND day = ?').run(u.id, game, day);
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Game rewards are temporarily unavailable. Try again later.');
      throw e;
    }
    audit(db, u.id, 'game.claim', game, { kreds, day });
    return { already: false, kreds, cap };
  });
}
