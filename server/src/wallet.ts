import type { Db } from './db.ts';
import type { UserRow } from './auth.ts';
import type { Ctx } from './http.ts';
import { balance, currentSettings, tokensToNaira } from './ledger.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

export function walletRoutes({ db, route, requireUser }: Deps) {
  // The browser never computes its own balance; it reads the authoritative value here.
  route('GET', '/api/wallet', async (c) => {
    const u = requireUser(c);
    const { rate, minWithdrawalTokens } = currentSettings(db);
    const bal = balance(db, u.id);
    const rows = db
      .prepare('SELECT amount, reason, ref_type, ref_id, created_at FROM ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50')
      .all(u.id) as { amount: number; reason: string; ref_type: string | null; ref_id: string | null; created_at: string }[];
    return {
      balanceTokens: bal,
      balanceNaira: tokensToNaira(bal, rate),
      rate: { tokens: rate.num, naira: rate.den },
      minWithdrawalTokens,
      minWithdrawalNaira: tokensToNaira(minWithdrawalTokens, rate),
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
