import { audit } from './db.ts';
import type { Db } from './db.ts';
import { newId } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError } from './http.ts';
import type { Ctx } from './http.ts';
import { creditReward, LedgerError } from './ledger.ts';
import { readPrivateImage, saveImage } from './uploads.ts';
import { notify } from './notifications.ts';
import { REFERRAL_BONUS } from './auth.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
};

const PROOF_TYPES = ['screenshot', 'link', 'text', 'none'];
const CATEGORIES = ['Social Media', 'Surveys', 'Apps & Sign Ups', 'Content Creation', 'Gaming', 'Shopping & Offers', 'Research & Reviews', 'Other'];

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);

// Validate an optional external link. Returns null when empty; throws on a malformed/non-http URL.
export function cleanLink(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('scheme');
    return u.toString();
  } catch {
    throw new HttpError(400, 'Enter a valid link starting with https://');
  }
}

type TaskRow = {
  id: string; kind: string; title: string; description: string; category: string; reward_tokens: number;
  proof_type: string; needs_handle: number; photo_file: string | null; link_url: string | null; max_completions: number;
  approved_count: number; status: string; created_by: string; pool_tokens: number; price_naira: number | null;
  days: number | null; expires_at: string | null; created_at: string;
};
type SubRow = {
  id: string; task_id: string; user_id: string; status: string; proof_file: string | null; proof_text: string | null;
  handle: string | null; proof_hash: string | null; reject_reason: string | null; reviewed_by: string | null;
  submitted_at: string | null; reviewed_at: string | null; created_at: string;
};

const publicTask = (t: TaskRow) => ({
  id: t.id, kind: t.kind, title: t.title, description: t.description, category: t.category,
  reward: t.reward_tokens, proofType: t.proof_type, needsHandle: !!t.needs_handle,
  photo: t.photo_file, link: t.link_url, status: t.status, remaining: Math.max(0, t.max_completions - t.approved_count),
  maxCompletions: t.max_completions, approvedCount: t.approved_count, expiresAt: t.expires_at,
});

export function taskRoutes({ db, route, requireUser }: Deps) {
  const requireAdmin = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role === 'user') throw new HttpError(403, 'Admins only.');
    return u;
  };
  const getTask = (id: string) => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  const isLive = (t: TaskRow) => t.status === 'live' && (!t.expires_at || t.expires_at > new Date().toISOString());

  route('GET', '/api/tasks', async (c) => {
    requireUser(c);
    const rows = db.prepare("SELECT * FROM tasks WHERE status = 'live' ORDER BY created_at DESC").all() as TaskRow[];
    return { tasks: rows.filter(isLive).map(publicTask) };
  });

  route('GET', '/api/tasks/mine', async (c) => {
    const u = requireUser(c);
    const rows = db
      .prepare('SELECT s.*, t.title, t.reward_tokens, t.proof_type FROM submissions s JOIN tasks t ON t.id = s.task_id WHERE s.user_id = ? ORDER BY s.created_at DESC')
      .all(u.id) as (SubRow & { title: string; reward_tokens: number; proof_type: string })[];
    return {
      submissions: rows.map((s) => ({
        id: s.id, taskId: s.task_id, title: s.title, reward: s.reward_tokens, proofType: s.proof_type,
        status: s.status, rejectReason: s.reject_reason, submittedAt: s.submitted_at,
      })),
    };
  });

  route('POST', '/api/tasks/accept', async (c) => {
    const u = requireUser(c);
    const task = getTask(str(c.body.taskId, 64));
    if (!task || !isLive(task)) throw new HttpError(404, 'This task is not available.');
    if (task.approved_count >= task.max_completions) throw new HttpError(409, 'This task is full.');
    if (task.created_by === u.id) throw new HttpError(403, 'You cannot do your own task.');
    try {
      db.prepare("INSERT INTO submissions (id, task_id, user_id) VALUES (?, ?, ?)").run(newId(), task.id, u.id);
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'You have already started this task.');
      throw e;
    }
    return { ok: true };
  });

  route('POST', '/api/tasks/submit', async (c) => {
    const u = requireUser(c);
    const sub = db.prepare('SELECT * FROM submissions WHERE task_id = ? AND user_id = ?').get(str(c.body.taskId, 64), u.id) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Start the task before submitting.');
    if (sub.status !== 'in_progress') throw new HttpError(409, 'This task has already been submitted.');
    const task = getTask(sub.task_id)!;

    let proofFile: string | null = null;
    let proofHash: string | null = null;
    let proofText: string | null = null;
    const handle = task.needs_handle ? str(c.body.handle, 100) : null;
    if (task.needs_handle && !handle) throw new HttpError(400, 'Enter the social handle you used.');

    if (task.proof_type === 'screenshot') {
      const saved = await saveImage(c.body.image);
      proofFile = saved.file;
      proofHash = saved.hash;
      const reused = db.prepare('SELECT 1 FROM submissions WHERE task_id = ? AND proof_hash = ? AND user_id != ?').get(task.id, proofHash, u.id);
      if (reused) throw new HttpError(409, 'This screenshot has already been submitted by someone else.');
    } else if (task.proof_type === 'link' || task.proof_type === 'text') {
      proofText = str(c.body.text, 1000);
      if (!proofText) throw new HttpError(400, 'Enter your proof.');
    }

    try {
      db.prepare("UPDATE submissions SET status = 'pending_review', proof_file = ?, proof_hash = ?, proof_text = ?, handle = ?, submitted_at = ? WHERE id = ?")
        .run(proofFile, proofHash, proofText, handle, new Date().toISOString(), sub.id);
    } catch (e) {
      if (String(e).includes('UNIQUE') && String(e).includes('handle')) throw new HttpError(409, 'That handle has already been used for this task.');
      throw e;
    }
    if (task.kind === 'posted' && task.created_by !== u.id) {
      notify(db, task.created_by, {
        type: 'post_submission', title: 'New proof to review',
        body: `Someone submitted proof for your task "${task.title}".`, refType: 'task', refId: task.id,
      });
    }
    return { ok: true, status: 'pending_review' };
  });

  route('POST', '/api/admin/tasks', async (c) => {
    const admin = requireAdmin(c);
    const title = str(c.body.title, 120);
    const description = str(c.body.description, 2000);
    const category = CATEGORIES.includes(str(c.body.category, 40)) ? str(c.body.category, 40) : 'Other';
    const reward = int(c.body.reward);
    const proofType = PROOF_TYPES.includes(str(c.body.proofType, 20)) ? str(c.body.proofType, 20) : 'screenshot';
    const maxCompletions = int(c.body.maxCompletions);
    if (!title || !description) throw new HttpError(400, 'Title and description are required.');
    if (!Number.isInteger(reward) || reward <= 0) throw new HttpError(400, 'Reward must be a positive number of tokens.');
    if (!Number.isInteger(maxCompletions) || maxCompletions <= 0) throw new HttpError(400, 'Set how many people can complete it.');
    const link = cleanLink(c.body.link);
    const photo = c.body.photo ? (await saveImage(c.body.photo)).file : null;

    const id = newId();
    db.prepare("INSERT INTO tasks (id, kind, title, description, category, reward_tokens, proof_type, needs_handle, photo_file, link_url, max_completions, status, created_by) VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)")
      .run(id, title, description, category, reward, proofType, c.body.needsHandle ? 1 : 0, photo, link, maxCompletions, admin.id);
    audit(db, admin.id, 'task.create', id, { reward, maxCompletions });
    return { task: publicTask(getTask(id)!) };
  });

  route('POST', '/api/admin/tasks/close', async (c) => {
    const admin = requireAdmin(c);
    const task = getTask(str(c.body.taskId, 64));
    if (!task) throw new HttpError(404, 'Task not found.');
    db.prepare("UPDATE tasks SET status = 'closed' WHERE id = ?").run(task.id);
    audit(db, admin.id, 'task.close', task.id);
    return { ok: true };
  });

  route('POST', '/api/admin/tasks/delete', async (c) => {
    const admin = requireAdmin(c);
    const task = getTask(str(c.body.taskId, 64));
    if (!task) throw new HttpError(404, 'Task not found.');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM submissions WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
      audit(db, admin.id, 'task.delete', task.id, { title: task.title });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { ok: true };
  });

  route('GET', '/api/admin/submissions', async (c) => {
    requireAdmin(c);
    const taskId = str(c.query.taskId, 64);
    const rows = db
      .prepare(`SELECT s.*, t.title, t.reward_tokens FROM submissions s JOIN tasks t ON t.id = s.task_id
                WHERE s.status = 'pending_review' ${taskId ? 'AND s.task_id = ?' : ''} ORDER BY s.submitted_at ASC`)
      .all(...(taskId ? [taskId] : [])) as (SubRow & { title: string; reward_tokens: number })[];
    return {
      submissions: rows.map((s) => ({
        id: s.id, taskId: s.task_id, title: s.title, reward: s.reward_tokens,
        handle: s.handle, proofFile: s.proof_file, proofText: s.proof_text, submittedAt: s.submitted_at,
      })),
    };
  });

  route('POST', '/api/admin/submissions/approve', async (c) => {
    const admin = requireAdmin(c);
    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(str(c.body.submissionId, 64)) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Submission not found.');
    if (sub.status !== 'pending_review') throw new HttpError(409, 'This submission is not awaiting review.');
    const task = getTask(sub.task_id)!;
    if (task.approved_count >= task.max_completions) throw new HttpError(409, 'This task has reached its completion limit.');

    try {
      creditReward(db, {
        userId: sub.user_id,
        tokens: task.reward_tokens,
        refType: 'task',
        refId: task.id,
        idempotencyKey: `sub:${sub.id}`,
        fromReserve: true,
        actorId: admin.id,
      });
    } catch (e) {
      if (e instanceof LedgerError && e.code === 'reserve_exhausted') throw new HttpError(409, 'Reward funding is exhausted. Add funding before approving.');
      if (e instanceof LedgerError && e.code === 'duplicate') { /* already credited; fall through to mark approved */ }
      else throw e;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending_review'").run(admin.id, new Date().toISOString(), sub.id);
      db.prepare('UPDATE tasks SET approved_count = approved_count + 1 WHERE id = ?').run(task.id);
      db.prepare("UPDATE tasks SET status = 'closed' WHERE id = ? AND approved_count >= max_completions").run(task.id);
      audit(db, admin.id, 'submission.approve', sub.id, { task: task.id, tokens: task.reward_tokens });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    notify(db, sub.user_id, {
      type: 'task_approved', title: 'Task approved 🎉',
      body: `You earned ${task.reward_tokens} kreds for "${task.title}".`, refType: 'task', refId: task.id,
    });

    // Referral bonus: the first approved task for a referred user pays their referrer once.
    const doer = db.prepare('SELECT referred_by, referral_bonus_paid FROM users WHERE id = ?').get(sub.user_id) as { referred_by: string | null; referral_bonus_paid: number } | undefined;
    if (doer?.referred_by && !doer.referral_bonus_paid) {
      try {
        creditReward(db, {
          userId: doer.referred_by, tokens: REFERRAL_BONUS, refType: 'referral', refId: sub.user_id,
          idempotencyKey: `referral:${sub.user_id}`, fromReserve: true, actorId: admin.id,
        });
        db.prepare('UPDATE users SET referral_bonus_paid = 1 WHERE id = ?').run(sub.user_id);
        notify(db, doer.referred_by, {
          type: 'referral_bonus', title: 'Referral bonus 🎉',
          body: `You earned ${REFERRAL_BONUS} kreds — someone you invited just completed their first task.`,
          refType: 'referral', refId: sub.user_id,
        });
      } catch (e) {
        if (!(e instanceof LedgerError)) throw e;
        console.error('[referral] bonus skipped:', e.code);
      }
    }
    return { ok: true };
  });

  route('POST', '/api/admin/submissions/reject', async (c) => {
    const admin = requireAdmin(c);
    const reason = str(c.body.reason, 500);
    if (!reason) throw new HttpError(400, 'A rejection reason is required.');
    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(str(c.body.submissionId, 64)) as SubRow | undefined;
    if (!sub) throw new HttpError(404, 'Submission not found.');
    if (sub.status !== 'pending_review') throw new HttpError(409, 'This submission is not awaiting review.');
    db.prepare("UPDATE submissions SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(reason, admin.id, new Date().toISOString(), sub.id);
    audit(db, admin.id, 'submission.reject', sub.id, { task: sub.task_id });
    const rtask = getTask(sub.task_id);
    notify(db, sub.user_id, {
      type: 'task_rejected', title: 'Task not approved',
      body: `"${rtask?.title ?? 'Your task'}" was not approved: ${reason}`, refType: 'task', refId: sub.task_id,
    });
    return { ok: true };
  });

  route('GET', '/api/uploads', async (c) => {
    const u = requireUser(c);
    // A stored ref is either a local "<hash>.<ext>" filename or a "cld:<public_id>" Cloudinary ref.
    const file = str(c.query.file, 300);
    // Cloudinary refs ("cld:<public_id>") carry slashes in the public_id (e.g. cld:kredilo/private/ab…);
    // local refs are a bare "<hash>.<ext>". Block ".." always; allow "/" only for cld: refs.
    if (!file || file.includes('..') || (!file.startsWith('cld:') && file.includes('/'))) throw new HttpError(400, 'Bad file.');
    const allowed =
      u.role !== 'user' ||
      db.prepare('SELECT 1 FROM submissions WHERE proof_file = ? AND user_id = ?').get(file, u.id) ||
      db.prepare("SELECT 1 FROM tasks WHERE created_by = ? AND (photo_file = ? OR id IN (SELECT task_id FROM submissions WHERE proof_file = ?))").get(u.id, file, file) ||
      db.prepare("SELECT 1 FROM tasks WHERE photo_file = ? AND status = 'live'").get(file);
    if (!allowed) throw new HttpError(403, 'Not allowed.');
    const img = await readPrivateImage(file);
    if (!img) throw new HttpError(404, 'File not found.');
    c.res.writeHead(200, { 'Content-Type': img.contentType, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    c.res.end(img.bytes);
    return undefined;
  });
}
