import { audit } from './db.ts';
import type { Db, Queryable } from './db.ts';

// All money lives in two append-only tables:
//   ledger  — per-user token entries; a user's balance is the SUM of their rows.
//   reserve — tokens the owner has set aside to fund rewards; SUM is what's left to issue.
// Nothing here edits or deletes a row. Corrections are new, opposite rows.

export type Rate = { num: number; den: number }; // num tokens are worth den naira

export async function currentSettings(db: Queryable): Promise<{ rate: Rate; minWithdrawalTokens: number }> {
  const row = (await db
    .prepare('SELECT tokens_per_naira_num AS n, tokens_per_naira_den AS d, min_withdrawal_tokens AS m FROM settings ORDER BY id DESC LIMIT 1')
    .get()) as { n: number; d: number; m: number } | undefined;
  if (!row) throw new Error('settings missing');
  return { rate: { num: row.n, den: row.d }, minWithdrawalTokens: row.m };
}

// Tokens -> naira, rounded down to whole naira for display.
export function tokensToNaira(tokens: number, rate: Rate): number {
  return Math.floor((tokens * rate.den) / rate.num);
}

export async function balance(db: Queryable, userId: string): Promise<number> {
  const r = (await db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM ledger WHERE user_id = ?').get(userId)) as { b: number };
  return r.b;
}

export async function reserveAvailable(db: Queryable): Promise<number> {
  const r = (await db.prepare('SELECT COALESCE(SUM(amount), 0) AS a FROM reserve').get()) as { a: number };
  return r.a;
}

export class LedgerError extends Error {
  code: 'duplicate' | 'reserve_exhausted' | 'insufficient';
  constructor(code: 'duplicate' | 'reserve_exhausted' | 'insufficient', message: string) {
    super(message);
    this.code = code;
  }
}

type Entry = { userId: string; amount: number; reason: string; refType?: string; refId?: string; rate?: Rate; idempotencyKey?: string };

// Low-level append. Caller is responsible for being inside a transaction when atomicity matters.
async function append(db: Queryable, e: Entry): Promise<number> {
  try {
    const res = await db
      .prepare('INSERT INTO ledger (user_id, amount, reason, ref_type, ref_id, rate_num, rate_den, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(e.userId, e.amount, e.reason, e.refType ?? null, e.refId ?? null, e.rate?.num ?? null, e.rate?.den ?? null, e.idempotencyKey ?? null);
    return res.lastInsertRowid;
  } catch (err) {
    if (String(err).includes('UNIQUE') && e.idempotencyKey) throw new LedgerError('duplicate', 'This reward was already credited.');
    throw err;
  }
}

// Credit a task reward. Atomic: checks the reserve, draws it down and credits the user together,
// and the idempotency key guarantees the same completion can never pay twice (even under a race).
export async function creditReward(
  db: Db,
  opts: { userId: string; tokens: number; refType: string; refId: string; idempotencyKey: string; fromReserve?: boolean; actorId?: string | null },
): Promise<{ ledgerId: number }> {
  if (opts.tokens <= 0) throw new Error('reward must be positive');
  const fromReserve = opts.fromReserve !== false; // default: draw from the shared reserve

  const tx = await db.begin();
  try {
    const { rate } = await currentSettings(tx);
    // Block a duplicate before touching the reserve.
    const dupe = await tx.prepare('SELECT 1 FROM ledger WHERE idempotency_key = ?').get(opts.idempotencyKey);
    if (dupe) throw new LedgerError('duplicate', 'This reward was already credited.');

    if (fromReserve) {
      const available = await reserveAvailable(tx);
      if (available < opts.tokens) throw new LedgerError('reserve_exhausted', 'Reward funding is exhausted. No new rewards can be issued right now.');
      await tx.prepare('INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?)').run(-opts.tokens, 'reward_issued', opts.refType, opts.refId);
    }

    const ledgerId = await append(tx, {
      userId: opts.userId,
      amount: opts.tokens,
      reason:
        opts.refType === 'referral' ? 'referral' : opts.refType === 'game' ? 'game_reward' : opts.refType === 'follow' ? 'follow_bonus' : opts.refType === 'streak' ? 'streak_bonus' : 'task_reward',
      refType: opts.refType,
      refId: opts.refId,
      rate,
      idempotencyKey: opts.idempotencyKey,
    });
    await audit(tx, opts.actorId ?? null, 'reward.credit', opts.userId, { tokens: opts.tokens, ref: `${opts.refType}:${opts.refId}` });
    await tx.commit();
    return { ledgerId };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

// Add funding to the reward reserve (e.g. a confirmed post-a-task payment, or the owner topping up).
export async function addFunding(db: Db, tokens: number, reason: string, refType?: string, refId?: string, actorId?: string | null): Promise<void> {
  if (tokens <= 0) throw new Error('funding must be positive');
  const tx = await db.begin();
  try {
    await tx.prepare('INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?)').run(tokens, reason, refType ?? null, refId ?? null);
    await audit(tx, actorId ?? null, 'reserve.fund', refId ?? null, { tokens, reason });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

// Hold tokens for a withdrawal request: subtract now so the same balance can't be requested twice.
export async function holdForWithdrawal(db: Db, userId: string, tokens: number, withdrawalId: string): Promise<void> {
  const tx = await db.begin();
  try {
    if ((await balance(tx, userId)) < tokens) throw new LedgerError('insufficient', 'Your available balance is not enough for this withdrawal.');
    await append(tx, { userId, amount: -tokens, reason: 'withdrawal_hold', refType: 'withdrawal', refId: withdrawalId, idempotencyKey: `hold:${withdrawalId}` });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

// Return held tokens to the user exactly once (cancelled or failed withdrawal).
export async function releaseWithdrawal(db: Db, userId: string, tokens: number, withdrawalId: string, actorId?: string | null): Promise<void> {
  const tx = await db.begin();
  try {
    await append(tx, { userId, amount: tokens, reason: 'withdrawal_release', refType: 'withdrawal', refId: withdrawalId, idempotencyKey: `release:${withdrawalId}` });
    await audit(tx, actorId ?? null, 'withdrawal.release', userId, { tokens, withdrawalId });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    if (e instanceof LedgerError && e.code === 'duplicate') return; // already released; releasing again is a no-op, never a double credit
    throw e;
  }
}
