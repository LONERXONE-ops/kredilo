import type { Db } from './db.ts';
import type { UserRow } from './auth.ts';
import type { Ctx } from './http.ts';
import { balance, currentSettings, tokensToNaira } from './ledger.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
};

export function walletRoutes({ db, route, requireUser }: Deps) {
  // The browser never computes its own balance; it reads the authoritative value here.
  route('GET', '/api/wallet', async (c) => {
    const u = await requireUser(c);
    const { rate, minWithdrawalTokens } = await currentSettings(db);
    const bal = await balance(db, u.id);
    const rows = (await db
      .prepare('SELECT amount, reason, ref_type, ref_id, created_at FROM ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50')
      .all(u.id)) as { amount: number; reason: string; ref_type: string | null; ref_id: string | null; created_at: string }[];
    // Task tracker: approved tasks since the user's last paid withdrawal (resets each payout).
    const cycleStart = ((await db.prepare("SELECT COALESCE(MAX(updated_at), '1970-01-01') AS t FROM withdrawals WHERE user_id = ? AND status = 'paid'").get(u.id)) as { t: string }).t;
    const tasksThisCycle = ((await db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND status = 'approved' AND COALESCE(reviewed_at, created_at) >= ?").get(u.id, cycleStart)) as { n: number }).n;
    const tasksTotal = ((await db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND status = 'approved'").get(u.id)) as { n: number }).n;
    return {
      balanceTokens: bal,
      balanceNaira: tokensToNaira(bal, rate),
      rate: { tokens: rate.num, naira: rate.den },
      minWithdrawalTokens,
      minWithdrawalNaira: tokensToNaira(minWithdrawalTokens, rate),
      tasksThisCycle,
      tasksTotal,
      transactions: rows.map((r) => ({
        amount: r.amount,
        reason: r.reason,
        refType: r.ref_type,
        refId: r.ref_id,
        at: r.created_at,
      })),
    };
  });
}
