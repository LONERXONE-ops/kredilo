import type { UserRow } from './auth.ts';
import { audit } from './db.ts';
import type { Db } from './db.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { creditReward, LedgerError } from './ledger.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

const BASE = 2;   // kreds on day 1
const CAP = 10;   // most you can earn from a single day's streak
const day = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// Reward for the Nth consecutive day: 2, 3, 4 ... capped at 10.
const rewardFor = (streak: number) => Math.min(BASE + (streak - 1), CAP);

type SRow = { streak: number; last_streak_day: string | null };

export function streakRoutes({ db, route, requireUser }: Deps) {
  const read = async (userId: string): Promise<SRow> =>
    (await db.prepare('SELECT streak, last_streak_day FROM users WHERE id = ?').get(userId)) as SRow;

  route('GET', '/api/streak/status', async (c) => {
    const u = await requireUser(c);
    const s = await read(u.id);
    const today = day(0), yesterday = day(-1);
    const claimedToday = s.last_streak_day === today;
    // The streak the user is actually on: broken (0) unless they claimed today or yesterday.
    const liveStreak = s.last_streak_day === today || s.last_streak_day === yesterday ? s.streak : 0;
    const nextStreak = claimedToday ? s.streak : s.last_streak_day === yesterday ? s.streak + 1 : 1;
    return { streak: liveStreak, claimedToday, todayReward: claimedToday ? 0 : rewardFor(nextStreak), cap: CAP };
  });

  route('POST', '/api/streak/claim', async (c) => {
    const u = await requireUser(c);
    const today = day(0), yesterday = day(-1);
    const s = await read(u.id);
    if (s.last_streak_day === today) return { already: true, streak: s.streak };

    const newStreak = s.last_streak_day === yesterday ? s.streak + 1 : 1;
    const kreds = rewardFor(newStreak);
    try {
      await creditReward(db, {
        userId: u.id, tokens: kreds, refType: 'streak', refId: today,
        idempotencyKey: `streak:${u.id}:${today}`, fromReserve: true, actorId: u.id,
      });
    } catch (e) {
      if (e instanceof LedgerError && e.code === 'duplicate') return { already: true, streak: s.streak };
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Daily rewards are temporarily unavailable. Try again later.');
      throw e;
    }
    await db.prepare('UPDATE users SET streak = ?, last_streak_day = ? WHERE id = ?').run(newStreak, today, u.id);
    await audit(db, u.id, 'streak.claim', today, { streak: newStreak, kreds });
    return { already: false, streak: newStreak, kreds };
  });
}
