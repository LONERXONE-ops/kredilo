import { audit } from './db.ts';
import type { Db } from './db.ts';
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { balance, currentSettings, holdForWithdrawal, LedgerError, releaseWithdrawal, tokensToNaira } from './ledger.ts';
import { decrypt, encrypt } from './crypto.ts';
import { notify } from './notifications.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);
const now = () => new Date().toISOString();

type WRow = {
  id: string; user_id: string; amount_tokens: number; amount_naira: number; rate_num: number; rate_den: number;
  bank_name: string; account_name_enc: string; account_number_enc: string; account_last4: string;
  status: string; transfer_ref: string | null; admin_note: string | null; not_received: number;
  handled_by: string | null; created_at: string; updated_at: string;
};

function flag(db: Db, key: string): string | null {
  const r = db.prepare('SELECT value FROM platform_flags WHERE key = ? ORDER BY id DESC LIMIT 1').get(key) as { value: string | null } | undefined;
  return r?.value ?? null;
}

export function withdrawalRoutes({ db, route, requireUser }: Deps) {
  const requireAdmin = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };
  const requireOwner = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can change this.');
    return u;
  };

  const openAt = () => flag(db, 'withdrawals_open_at');
  const isOpen = () => {
    const at = openAt();
    return !!at && at <= now();
  };

  const myView = (w: WRow) => ({
    id: w.id, amountTokens: w.amount_tokens, amountNaira: w.amount_naira, status: w.status,
    bankName: w.bank_name, accountLast4: w.account_last4, transferRef: w.transfer_ref,
    adminNote: w.admin_note, notReceived: !!w.not_received, createdAt: w.created_at, updatedAt: w.updated_at,
  });

  route('GET', '/api/withdrawals', async (c) => {
    const u = requireUser(c);
    const rows = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC').all(u.id) as WRow[];
    const open = rows.find((w) => w.status === 'requested' || w.status === 'processing');
    return { open: isOpen(), opensAt: openAt(), hasOpenRequest: !!open, withdrawals: rows.map(myView) };
  });

  route('POST', '/api/withdrawals/request', async (c) => {
    const u = requireUser(c);
    if (!isOpen()) throw new HttpError(403, 'Withdrawals are not open yet.');
    const bankName = str(c.body.bankName, 60);
    const accountName = str(c.body.accountName, 100);
    const accountNumber = str(c.body.accountNumber, 20).replace(/\s/g, '');
    const amount = int(c.body.amountTokens);
    if (!bankName || !accountName) throw new HttpError(400, 'Enter your bank and account name.');
    if (!/^\d{6,12}$/.test(accountNumber)) throw new HttpError(400, 'Enter a valid account number.');

    const { rate, minWithdrawalTokens } = currentSettings(db);
    if (!Number.isInteger(amount) || amount < minWithdrawalTokens) throw new HttpError(400, `The minimum withdrawal is ${minWithdrawalTokens.toLocaleString()} tokens.`);
    if (amount > balance(db, u.id)) throw new HttpError(400, 'That is more than your available balance.');

    const id = newId();
    try {
      holdForWithdrawal(db, u.id, amount, id);
    } catch (e) {
      if (e instanceof LedgerError && e.code === 'insufficient') throw new HttpError(400, 'Your available balance is not enough.');
      throw e;
    }
    try {
      db.prepare(
        `INSERT INTO withdrawals (id, user_id, amount_tokens, amount_naira, rate_num, rate_den, bank_name, account_name_enc, account_number_enc, account_last4)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, u.id, amount, tokensToNaira(amount, rate), rate.num, rate.den, bankName, encrypt(accountName), encrypt(accountNumber), accountNumber.slice(-4));
    } catch (e) {
      releaseWithdrawal(db, u.id, amount, id);
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'You already have a withdrawal in progress.');
      throw e;
    }
    audit(db, u.id, 'withdrawal.request', id, { amount });
    return { ok: true, id };
  });

  route('POST', '/api/withdrawals/not-received', async (c) => {
    const u = requireUser(c);
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ? AND user_id = ?').get(str(c.body.id, 64), u.id) as WRow | undefined;
    if (!w) throw new HttpError(404, 'Withdrawal not found.');
    if (w.status !== 'paid') throw new HttpError(409, 'You can only flag a withdrawal marked paid.');
    db.prepare("UPDATE withdrawals SET not_received = 1, updated_at = ? WHERE id = ?").run(now(), w.id);
    audit(db, u.id, 'withdrawal.not_received', w.id);
    return { ok: true };
  });

  route('GET', '/api/admin/withdrawals', async (c) => {
    requireAdmin(c);
    const status = str(c.query.status, 20);
    const where = ['requested', 'processing', 'paid', 'cancelled'].includes(status) ? status : null;
    const rows = db
      .prepare(`SELECT w.*, u.email FROM withdrawals w JOIN users u ON u.id = w.user_id ${where ? 'WHERE w.status = ?' : "WHERE w.status IN ('requested','processing')"} ORDER BY w.created_at`)
      .all(...(where ? [where] : [])) as (WRow & { email: string })[];
    return {
      withdrawals: rows.map((w) => ({
        id: w.id, email: w.email, amountTokens: w.amount_tokens, amountNaira: w.amount_naira, status: w.status,
        bankName: w.bank_name, accountName: decrypt(w.account_name_enc), accountNumber: decrypt(w.account_number_enc),
        transferRef: w.transfer_ref, adminNote: w.admin_note, notReceived: !!w.not_received, createdAt: w.created_at,
      })),
    };
  });

  route('POST', '/api/admin/withdrawals/processing', async (c) => {
    const admin = requireAdmin(c);
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(str(c.body.id, 64)) as WRow | undefined;
    if (!w) throw new HttpError(404, 'Withdrawal not found.');
    if (w.status !== 'requested') throw new HttpError(409, 'This request is not in the requested state.');
    db.prepare("UPDATE withdrawals SET status = 'processing', handled_by = ?, updated_at = ? WHERE id = ?").run(admin.id, now(), w.id);
    audit(db, admin.id, 'withdrawal.processing', w.id);
    return { ok: true };
  });

  route('POST', '/api/admin/withdrawals/paid', async (c) => {
    const admin = requireAdmin(c);
    const ref = str(c.body.transferRef, 100);
    if (!ref) throw new HttpError(400, 'Enter the bank transfer reference.');
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(str(c.body.id, 64)) as WRow | undefined;
    if (!w) throw new HttpError(404, 'Withdrawal not found.');
    if (w.status !== 'requested' && w.status !== 'processing') throw new HttpError(409, 'This request is already settled.');
    db.prepare("UPDATE withdrawals SET status = 'paid', transfer_ref = ?, handled_by = ?, updated_at = ? WHERE id = ?").run(ref, admin.id, now(), w.id);
    audit(db, admin.id, 'withdrawal.paid', w.id, { ref });
    notify(db, w.user_id, {
      type: 'withdrawal_paid', title: 'Withdrawal paid 💸',
      body: `₦${w.amount_naira.toLocaleString()} has been sent to your ${w.bank_name} account. Ref: ${ref}.`,
      refType: 'withdrawal', refId: w.id,
    });
    return { ok: true };
  });

  route('POST', '/api/admin/withdrawals/cancel', async (c) => {
    const admin = requireAdmin(c);
    const reason = str(c.body.reason, 300);
    const returnTokens = c.body.returnTokens === true;
    if (!reason) throw new HttpError(400, 'Give a reason for cancelling.');
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(str(c.body.id, 64)) as WRow | undefined;
    if (!w) throw new HttpError(404, 'Withdrawal not found.');
    if (w.status !== 'requested' && w.status !== 'processing') throw new HttpError(409, 'This request is already settled.');
    db.prepare("UPDATE withdrawals SET status = 'cancelled', admin_note = ?, handled_by = ?, updated_at = ? WHERE id = ?").run(reason, admin.id, now(), w.id);
    if (returnTokens) releaseWithdrawal(db, w.user_id, w.amount_tokens, w.id, admin.id);
    audit(db, admin.id, 'withdrawal.cancel', w.id, { returnTokens, reason });
    notify(db, w.user_id, {
      type: 'withdrawal_cancelled', title: 'Withdrawal cancelled',
      body: `Your withdrawal was cancelled: ${reason}${returnTokens ? ' Your tokens have been returned.' : ''}`,
      refType: 'withdrawal', refId: w.id,
    });
    return { ok: true };
  });

  route('GET', '/api/admin/withdrawals/settings', async (c) => {
    requireAdmin(c);
    return { opensAt: openAt(), isOpen: isOpen() };
  });

  route('POST', '/api/admin/withdrawals/settings', async (c) => {
    const admin = requireOwner(c);
    const raw = str(c.body.opensAt, 40);
    let value: string | null = null;
    if (raw) {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Enter a valid date and time.');
      value = d.toISOString();
    }
    db.prepare('INSERT INTO platform_flags (key, value, updated_by) VALUES (?, ?, ?)').run('withdrawals_open_at', value, admin.id);
    audit(db, admin.id, 'withdrawals.set_open', null, { opensAt: value });
    return { ok: true, opensAt: value };
  });
}
