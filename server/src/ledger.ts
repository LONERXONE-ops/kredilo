import { audit } from './db.ts';
import type { Db } from './db.ts';

// All money lives in two append-only tables:
//   ledger  — per-user token entries; a user's balance is the SUM of their rows.
//   reserve — tokens the owner has set aside to fund rewards; SUM is what's left to issue.
// Nothing here edits or deletes a row. Corrections are new, opposite rows.

export type Rate = { num: number; den: number }; // num tokens are worth den naira

export function currentSettings(db: Db): { rate: Rate; minWithdrawalTokens: number } {
  const row = db.prepare('SELECT tokens_per_naira_num AS n, tokens_per_naira_den AS d, min_withdrawal_tokens AS m FROM settings ORDER BY id DESC LIMIT 1').get() as
    | { n: number; d: number; m: number }
    | undefined;
  if (!row) throw new Error('settings missing');
  return { rate: { num: row.n, den: row.d }, minWithdrawalTokens: row.m };
}

// Tokens -> naira, rounded down to whole naira for display.
export function tokensToNaira(tokens: number, rate: Rate): number {
  return Math.floor((tokens * rate.den) / rate.num);
}

export function balance(db: Db, userId: string): number {
  const r = db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM ledger WHERE user_id = ?').get(userId) as { b: number };
  return r.b;
}

export function reserveAvailable(db: Db): number {
  const r = db.prepare('SELECT COALESCE(SUM(amount), 0) AS a FROM reserve').get() as { a: number };
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
function append(db: Db, e: Entry): number {
  try {
    const res = db
      .prepare('INSERT INTO ledger (user_id, amount, reason, ref_type, ref_id, rate_num, rate_den, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(e.userId, e.amount, e.reason, e.refType ?? null, e.refId ?? null, e.rate?.num ?? null, e.rate?.den ?? null, e.idempotencyKey ?? null);
    return Number(res.lastInsertRowid);
  } catch (err) {
    if (String(err).includes('UNIQUE') && e.idempotencyKey) throw new LedgerError('duplicate', 'This reward was already credited.');
    throw err;
  }
}

// Credit a task reward. Atomic: checks the reserve, draws it down and credits the user together,
// and the idempotency key guarantees the same completion can never pay twice (even under a race).
export function creditReward(
  db: Db,
  opts: { userId: string; tokens: number; refType: string; refId: string; idempotencyKey: string; fromReserve?: boolean; actorId?: string | null },
): { ledgerId: number } {
  if (opts.tokens <= 0) throw new Error('reward must be positive');
  const { rate } = currentSettings(db);
  const fromReserve = opts.fromReserve !== false; // default: draw from the shared reserve

  db.exec('BEGIN IMMEDIATE');
  try {
    // Block a duplicate before touching the reserve.
    const dupe = db.prepare('SELECT 1 FROM ledger WHERE idempotency_key = ?').get(opts.idempotencyKey);
    if (dupe) throw new LedgerError('duplicate', 'This reward was already credited.');

    if (fromReserve) {
      const available = reserveAvailable(db);
      if (available < opts.tokens) throw new LedgerError('reserve_exhausted', 'Reward funding is exhausted. No new rewards can be issued right now.');
      db.prepare('INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?)').run(-opts.tokens, 'reward_issued', opts.refType, opts.refId);
    }

    const ledgerId = append(db, {
      userId: opts.userId,
      amount: opts.tokens,
      reason: 'task_reward',
      refType: opts.refType,
      refId: opts.refId,
      rate,
      idempotencyKey: opts.idempotencyKey,
    });
    audit(db, opts.actorId ?? null, 'reward.credit', opts.userId, { tokens: opts.tokens, ref: `${opts.refType}:${opts.refId}` });
    db.exec('COMMIT');
    return { ledgerId };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Add funding to the reward reserve (e.g. a confirmed post-a-task payment, or the owner topping up).
export function addFunding(db: Db, tokens: number, reason: string, refType?: string, refId?: string, actorId?: string | null): void {
  if (tokens <= 0) throw new Error('funding must be positive');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?)').run(tokens, reason, refType ?? null, refId ?? null);
    audit(db, actorId ?? null, 'reserve.fund', refId ?? null, { tokens, reason });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Hold tokens for a withdrawal request: subtract now so the same balance can't be requested twice.
export function holdForWithdrawal(db: Db, userId: string, tokens: number, withdrawalId: string): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    if (balance(db, userId) < tokens) throw new LedgerError('insufficient', 'Your available balance is not enough for this withdrawal.');
    append(db, { userId, amount: -tokens, reason: 'withdrawal_hold', refType: 'withdrawal', refId: withdrawalId, idempotencyKey: `hold:${withdrawalId}` });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Return held tokens to the user exactly once (cancelled or failed withdrawal).
export function releaseWithdrawal(db: Db, userId: string, tokens: number, withdrawalId: string, actorId?: string | null): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    append(db, { userId, amount: tokens, reason: 'withdrawal_release', refType: 'withdrawal', refId: withdrawalId, idempotencyKey: `release:${withdrawalId}` });
    audit(db, actorId ?? null, 'withdrawal.release', userId, { tokens, withdrawalId });
    db.exec('COMMIT');
  } catch (e) {
    if (e instanceof LedgerError && e.code === 'duplicate') {
      db.exec('ROLLBACK');
      return; // already released; releasing again is a no-op, never a double credit
    }
    db.exec('ROLLBACK');
    throw e;
  }
}
