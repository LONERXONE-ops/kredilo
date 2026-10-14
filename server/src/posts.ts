import { audit } from './db.ts';
import type { Db } from './db.ts';
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { saveImage } from './uploads.ts';
import { cleanLink } from './tasks.ts';
import { emailUser, notify } from './notifications.ts';
import type { SendMail } from './notifications.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => Promise<UserRow>;
  sendMail?: SendMail;
};

const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

// A posted task runs for 1-10 days. Cost and reward scale with a flat daily rate the owner can edit.
export const MAX_POST_DAYS = 10;
const DEFAULT_PRICE_PER_DAY = 1000; // naira
const DEFAULT_TOKENS_PER_DAY = 30;

async function flag(db: Db, key: string): Promise<string | null> {
  const r = (await db.prepare('SELECT value FROM platform_flags WHERE key = ? ORDER BY id DESC LIMIT 1').get(key)) as { value: string | null } | undefined;
  return r?.value ?? null;
}
async function postRate(db: Db): Promise<{ perDayNaira: number; perDayTokens: number }> {
  const n = Number(await flag(db, 'post_price_per_day'));
  const t = Number(await flag(db, 'post_tokens_per_day'));
  return {
    perDayNaira: Number.isFinite(n) && n > 0 ? n : DEFAULT_PRICE_PER_DAY,
    perDayTokens: Number.isFinite(t) && t > 0 ? t : DEFAULT_TOKENS_PER_DAY,
  };
}

// Close out posted tasks whose paid run has ended, and remove them so they drop off every view.
// Ledger credits already earned are untouched; only the task and its submissions go.
export async function sweepExpiredPosts(db: Db): Promise<number> {
  const expired = (await db.prepare("SELECT id FROM tasks WHERE kind = 'posted' AND status IN ('live','closed') AND expires_at IS NOT NULL AND expires_at < ?").all(new Date().toISOString())) as { id: string }[];
  let removed = 0;
  for (const t of expired) {
    const tx = await db.begin();
    try {
      await tx.prepare('DELETE FROM submissions WHERE task_id = ?').run(t.id);
      await tx.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
      await tx.commit();
      removed++;
    } catch {
      await tx.rollback();
    }
  }
  return removed;
}

type TaskRow = {
  id: string; kind: string; title: string; description: string; category: string; reward_tokens: number;
  proof_type: string; needs_handle: number; photo_file: string | null; link_url: string | null; max_completions: number;
  approved_count: number; status: string; created_by: string; pool_tokens: number; price_naira: number | null;
  days: number | null; expires_at: string | null; receipt_file: string | null; payment_note: string | null; created_at: string;
};
type SubRow = {
  id: string; task_id: string; user_id: string; status: string; proof_file: string | null; proof_text: string | null;
  handle: string | null; submitted_at: string | null;
};

export function postRoutes({ db, route, requireUser, sendMail }: Deps) {
  const getTask = async (id: string) => (await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)) as TaskRow | undefined;
  const requireAdmin = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };

  const posterView = (t: TaskRow) => ({
    id: t.id, title: t.title, description: t.description, category: t.category, reward: t.reward_tokens,
    needsHandle: !!t.needs_handle, photo: t.photo_file, link: t.link_url, days: t.days, priceNaira: t.price_naira,
    maxCompletions: t.max_completions, approvedCount: t.approved_count, status: t.status,
    paymentNote: t.payment_note, expiresAt: t.expires_at,
  });

  route('GET', '/api/post/pricing', async (c) => {
    await requireUser(c);
    const rate = await postRate(db);
    return {
      perDayNaira: rate.perDayNaira,
      perDayTokens: rate.perDayTokens,
      maxDays: MAX_POST_DAYS,
      categories: CATEGORIES,
      payTo: {
        bankName: process.env.PAY_BANK ?? '',
        accountName: process.env.PAY_ACCOUNT_NAME ?? '',
        accountNumber: process.env.PAY_ACCOUNT_NUMBER ?? '',
      },
    };
  });

  route('POST', '/api/admin/post-rate', async (c) => {
    const u = await requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can change this.');
    const naira = int(c.body.perDayNaira);
    const tokens = int(c.body.perDayTokens);
    if (!Number.isInteger(naira) || naira <= 0) throw new HttpError(400, 'Enter a valid price per day.');
    if (!Number.isInteger(tokens) || tokens <= 0) throw new HttpError(400, 'Enter a valid token reward per day.');
    await db.prepare('INSERT INTO platform_flags (key, value, updated_by) VALUES (?, ?, ?)').run('post_price_per_day', String(naira), u.id);
    await db.prepare('INSERT INTO platform_flags (key, value, updated_by) VALUES (?, ?, ?)').run('post_tokens_per_day', String(tokens), u.id);
    await audit(db, u.id, 'post.rate', null, { naira, tokens });
    return { ok: true, perDayNaira: naira, perDayTokens: tokens };
  });

  route('POST', '/api/post/create', async (c) => {
    const u = await requireUser(c);
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    const category = CATEGORIES.includes(str(c.body.category, 40)) ? str(c.body.category, 40) : 'Other';
    const days = int(c.body.days);
    const maxCompletions = int(c.body.maxCompletions);
    const needsHandle = c.body.needsHandle ? 1 : 0;
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    if (!Number.isInteger(maxCompletions) || maxCompletions <= 0) throw new HttpError(400, 'Set how many people can do the task.');
    if (!Number.isInteger(days) || days < 1 || days > MAX_POST_DAYS) throw new HttpError(400, `Choose between 1 and ${MAX_POST_DAYS} days.`);

    const rate = await postRate(db);
    const priceNaira = days * rate.perDayNaira;
    const rewardTokens = days * rate.perDayTokens;

    if (!c.body.photo) throw new HttpError(400, 'Add a photo for your task.');
    if (!c.body.receipt) throw new HttpError(400, 'Attach your payment receipt.');
    const link = cleanLink(c.body.link);
    const photo = (await saveImage(c.body.photo)).file;
    const receipt = (await saveImage(c.body.receipt)).file;

    const pool = rewardTokens * maxCompletions;
    const id = newId();
    await db
      .prepare(
        `INSERT INTO tasks (id, kind, title, description, category, reward_tokens, proof_type, needs_handle, photo_file, link_url,
        max_completions, status, created_by, pool_tokens, price_naira, days, receipt_file)
       VALUES (?, 'posted', ?, ?, ?, ?, 'screenshot', ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?)`,
      )
      .run(id, title, description, category, rewardTokens, needsHandle, photo, link, maxCompletions, u.id, pool, priceNaira, days, receipt);
    await audit(db, u.id, 'post.create', id, { days, price: priceNaira, pool });
    return { id, status: 'pending_payment', priceNaira, reward: rewardTokens, pool };
  });

  route('GET', '/api/post/mine', async (c) => {
    const u = await requireUser(c);
    const tasks = (await db.prepare("SELECT * FROM tasks WHERE kind = 'posted' AND created_by = ? ORDER BY created_at DESC").all(u.id)) as TaskRow[];
    return { tasks: tasks.map(posterView) };
  });

  route('GET', '/api/post/doers', async (c) => {
    const u = await requireUser(c);
    const task = await getTask(str(c.query.taskId, 64));
    if (!task || task.created_by !== u.id) throw new HttpError(404, 'Task not found.');
    const subs = (await db.prepare("SELECT id, status, handle, proof_file, submitted_at FROM submissions WHERE task_id = ? ORDER BY created_at").all(task.id)) as SubRow[];
    const ongoing = subs.filter((s) => s.status === 'in_progress');
    const done = subs.filter((s) => s.status === 'pending_review' || s.status === 'approved');
    const view = (s: SubRow) => ({ id: s.id, status: s.status, handle: s.handle, proofFile: s.proof_file, submittedAt: s.submitted_at });
    return { ongoing: ongoing.map(view), completed: done.map(view) };
  });

  route('GET', '/api/admin/posts', async (c) => {
    await requireAdmin(c);
    const rows = (await db.prepare("SELECT * FROM tasks WHERE kind = 'posted' AND status = 'pending_payment' ORDER BY created_at").all()) as TaskRow[];
    return {
      posts: rows.map((t) => ({
        id: t.id, title: t.title, description: t.description, category: t.category, reward: t.reward_tokens,
        maxCompletions: t.max_completions, days: t.days, priceNaira: t.price_naira, pool: t.pool_tokens,
        photo: t.photo_file, receipt: t.receipt_file, link: t.link_url, createdAt: t.created_at,
      })),
    };
  });

  route('POST', '/api/admin/posts/confirm', async (c) => {
    const admin = await requireAdmin(c);
    const note = str(c.body.note, 300);
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || task.kind !== 'posted') throw new HttpError(404, 'Posted task not found.');
    if (task.status !== 'pending_payment') throw new HttpError(409, 'This task is not awaiting payment.');

    const expiresAt = new Date(Date.now() + (task.days ?? 1) * 86_400_000).toISOString();
    const tx = await db.begin();
    try {
      const already = await tx.prepare("SELECT 1 FROM reserve WHERE reason = 'post_payment' AND ref_id = ?").get(task.id);
      if (!already) await tx.prepare("INSERT INTO reserve (amount, reason, ref_type, ref_id) VALUES (?, 'post_payment', 'posted_task', ?)").run(task.pool_tokens, task.id);
      await tx.prepare("UPDATE tasks SET status = 'live', payment_note = ?, expires_at = ? WHERE id = ? AND status = 'pending_payment'").run(note || null, expiresAt, task.id);
      await audit(tx, admin.id, 'post.confirm', task.id, { pool: task.pool_tokens });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    await notify(db, task.created_by, {
      type: 'post_live', title: 'Your task is live ✅',
      body: `"${task.title}" is now live for doers.`, refType: 'task', refId: task.id,
    });
    await emailUser(db, sendMail, task.created_by, 'Your Kredilo task is live ✅',
      `Your payment was confirmed and "${task.title}" is now live for doers.\n\nTrack completions from "My posted tasks" on Kredilo.`);
    return { ok: true };
  });

  route('POST', '/api/admin/posts/reject', async (c) => {
    const admin = await requireAdmin(c);
    const note = str(c.body.note, 300);
    if (!note) throw new HttpError(400, 'Give a reason so the poster knows why.');
    const task = await getTask(str(c.body.taskId, 64));
    if (!task || task.kind !== 'posted') throw new HttpError(404, 'Posted task not found.');
    if (task.status !== 'pending_payment') throw new HttpError(409, 'This task is not awaiting payment.');
    await db.prepare("UPDATE tasks SET status = 'rejected', payment_note = ? WHERE id = ?").run(note, task.id);
    await audit(db, admin.id, 'post.reject', task.id);
    await notify(db, task.created_by, {
      type: 'post_rejected', title: 'Posted task declined',
      body: `"${task.title}" was not approved: ${note}`, refType: 'task', refId: task.id,
    });
    await emailUser(db, sendMail, task.created_by, 'Your Kredilo posted task was declined',
      `"${task.title}" was not approved.\n\nReason: ${note}\n\nReach out to support if you think this was a mistake.`);
    return { ok: true };
  });
}
