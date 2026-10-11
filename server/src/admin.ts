import { audit } from './db.ts';
import type { Db } from './db.ts';
import { hashToken, newId, newToken, validEmail } from './auth.ts';
import type { UserRow } from './auth.ts';
import { HttpError, limited } from './http.ts';
import type { Ctx } from './http.ts';
import type { AppOptions } from './config.ts';

type Deps = {
  db: Db;
  route: (method: string, path: string, h: (c: Ctx) => Promise<unknown>) => void;
  requireUser: (c: Ctx) => UserRow;
  options: AppOptions;
};

const ADMIN_ROLES = ['reviewer', 'support'];
const isAdminRole = (v: unknown): v is 'reviewer' | 'support' => typeof v === 'string' && ADMIN_ROLES.includes(v);
const INVITE_DAYS = 7;

export function adminRoutes({ db, route, requireUser, options }: Deps) {
  // Every admin-team action is checked here, on the server, against the role stored in the database.
  const requireOwner = (c: Ctx): UserRow => {
    const u = requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can do this.');
    return u;
  };
  const tooMany = () => new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const findUser = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

  route('GET', '/api/admin/team', async (c) => {
    requireOwner(c);
    const members = db.prepare("SELECT id, email, role, created_at FROM users WHERE role != 'user' ORDER BY created_at").all() as {
      id: string; email: string; role: string; created_at: string;
    }[];
    const invites = db
      .prepare('SELECT id, email, role, expires_at, created_at FROM admin_invites WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC')
      .all(new Date().toISOString()) as { id: string; email: string; role: string; expires_at: string; created_at: string }[];
    return {
      members: members.map((m) => ({ id: m.id, email: m.email, role: m.role, createdAt: m.created_at })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at })),
    };
  });

  route('POST', '/api/admin/invites', async (c) => {
    const owner = requireOwner(c);
    if (limited(`invite:${owner.id}`, 20, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    if (!email) throw new HttpError(400, 'Enter a valid email address.');
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const existing = db.prepare('SELECT role FROM users WHERE email = ?').get(email) as { role: string } | undefined;
    if (existing && existing.role !== 'user') throw new HttpError(409, 'That person already has admin access.');

    const now = new Date().toISOString();
    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE admin_invites SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(now, email);
      db.prepare('INSERT INTO admin_invites (id, email, role, token_hash, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newId(), email, c.body.role, hashToken(token), owner.id, expiresAt,
      );
      audit(db, owner.id, 'admin.invite.create', email, { role: c.body.role });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    const inviteUrl = `${options.appOrigin}/admin-invite?token=${token}`;
    options.sendMail({ to: email, subject: 'You have been invited to help run Kredilo', text: `Open this link, signed in with this email address, to accept:\n${inviteUrl}` });
    return { inviteUrl, expiresAt }; // shown to the owner once; only a hash is stored
  });

  route('POST', '/api/admin/invites/revoke', async (c) => {
    const owner = requireOwner(c);
    const res = db
      .prepare('UPDATE admin_invites SET revoked_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL')
      .run(new Date().toISOString(), str(c.body.id));
    if (res.changes !== 1) throw new HttpError(404, 'Invitation not found.');
    audit(db, owner.id, 'admin.invite.revoke', str(c.body.id));
    return { ok: true };
  });

  route('POST', '/api/admin/invites/accept', async (c) => {
    const user = requireUser(c);
    if (limited(`accept:${user.id}`, 10, 900_000)) throw tooMany();
    if (!user.email_verified_at) throw new HttpError(403, 'Verify your email first, then open the invitation again.');
    if (user.role === 'owner') throw new HttpError(400, 'You already have full access.');
    const row = db
      .prepare('SELECT id, email, role FROM admin_invites WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?')
      .get(hashToken(str(c.body.token)), new Date().toISOString()) as { id: string; email: string; role: 'reviewer' | 'support' } | undefined;
    if (!row) throw new HttpError(400, 'This invitation is invalid or has expired.');
    if (row.email !== user.email) throw new HttpError(403, 'This invitation was sent to a different email address.');

    db.exec('BEGIN IMMEDIATE');
    try {
      const used = db.prepare('UPDATE admin_invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(new Date().toISOString(), row.id);
      if (used.changes !== 1) throw new HttpError(400, 'This invitation is invalid or has expired.');
      db.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'owner'").run(row.role, user.id);
      audit(db, user.id, 'admin.invite.accept', user.id, { role: row.role });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { role: row.role };
  });

  route('POST', '/api/admin/team/role', async (c) => {
    const owner = requireOwner(c);
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const target = findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(c.body.role, target.id);
    audit(db, owner.id, 'admin.role.change', target.id, { from: target.role, to: c.body.role });
    return { ok: true };
  });

  route('POST', '/api/admin/team/remove', async (c) => {
    const owner = requireOwner(c);
    const target = findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(target.id);
    audit(db, owner.id, 'admin.remove', target.id, { was: target.role });
    return { ok: true };
  });
}
