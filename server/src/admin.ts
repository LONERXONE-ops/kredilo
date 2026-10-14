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
  requireUser: (c: Ctx) => Promise<UserRow>;
  options: AppOptions;
};

const ADMIN_ROLES = ['reviewer', 'support'];
const isAdminRole = (v: unknown): v is 'reviewer' | 'support' => typeof v === 'string' && ADMIN_ROLES.includes(v);
const INVITE_DAYS = 7;

export function adminRoutes({ db, route, requireUser, options }: Deps) {
  // Every admin-team action is checked here, on the server, against the role stored in the database.
  const requireOwner = async (c: Ctx): Promise<UserRow> => {
    const u = await requireUser(c);
    if (u.role !== 'owner') throw new HttpError(403, 'Only the owner can do this.');
    return u;
  };
  const tooMany = () => new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const findUser = async (id: string) => (await db.prepare('SELECT * FROM users WHERE id = ?').get(id)) as UserRow | undefined;

  route('GET', '/api/admin/team', async (c) => {
    await requireOwner(c);
    const members = (await db.prepare("SELECT id, email, role, created_at FROM users WHERE role != 'user' ORDER BY created_at").all()) as {
      id: string; email: string; role: string; created_at: string;
    }[];
    const invites = (await db
      .prepare('SELECT id, email, role, expires_at, created_at FROM admin_invites WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC')
      .all(new Date().toISOString())) as { id: string; email: string; role: string; expires_at: string; created_at: string }[];
    return {
      members: members.map((m) => ({ id: m.id, email: m.email, role: m.role, createdAt: m.created_at })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at })),
    };
  });

  route('POST', '/api/admin/invites', async (c) => {
    const owner = await requireOwner(c);
    if (limited(`invite:${owner.id}`, 20, 3_600_000)) throw tooMany();
    const email = validEmail(c.body.email);
    if (!email) throw new HttpError(400, 'Enter a valid email address.');
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const existing = (await db.prepare('SELECT role FROM users WHERE email = ?').get(email)) as { role: string } | undefined;
    if (existing && existing.role !== 'user') throw new HttpError(409, 'That person already has admin access.');

    const now = new Date().toISOString();
    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    const tx = await db.begin();
    try {
      await tx.prepare('UPDATE admin_invites SET revoked_at = ? WHERE email = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(now, email);
      await tx.prepare('INSERT INTO admin_invites (id, email, role, token_hash, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newId(), email, c.body.role, hashToken(token), owner.id, expiresAt,
      );
      await audit(tx, owner.id, 'admin.invite.create', email, { role: c.body.role });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    const inviteUrl = `${options.appOrigin}/admin-invite?token=${token}`;
    options.sendMail({ to: email, subject: 'You have been invited to help run Kredilo', text: `Open this link, signed in with this email address, to accept:\n${inviteUrl}` });
    return { inviteUrl, expiresAt }; // shown to the owner once; only a hash is stored
  });

  route('POST', '/api/admin/invites/revoke', async (c) => {
    const owner = await requireOwner(c);
    const res = await db
      .prepare('UPDATE admin_invites SET revoked_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL')
      .run(new Date().toISOString(), str(c.body.id));
    if (res.changes !== 1) throw new HttpError(404, 'Invitation not found.');
    await audit(db, owner.id, 'admin.invite.revoke', str(c.body.id));
    return { ok: true };
  });

  route('POST', '/api/admin/invites/accept', async (c) => {
    const user = await requireUser(c);
    if (limited(`accept:${user.id}`, 10, 900_000)) throw tooMany();
    if (!user.email_verified_at) throw new HttpError(403, 'Verify your email first, then open the invitation again.');
    if (user.role === 'owner') throw new HttpError(400, 'You already have full access.');
    const row = (await db
      .prepare('SELECT id, email, role FROM admin_invites WHERE token_hash = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?')
      .get(hashToken(str(c.body.token)), new Date().toISOString())) as { id: string; email: string; role: 'reviewer' | 'support' } | undefined;
    if (!row) throw new HttpError(400, 'This invitation is invalid or has expired.');
    if (row.email !== user.email) throw new HttpError(403, 'This invitation was sent to a different email address.');

    const tx = await db.begin();
    try {
      const used = await tx.prepare('UPDATE admin_invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL').run(new Date().toISOString(), row.id);
      if (used.changes !== 1) throw new HttpError(400, 'This invitation is invalid or has expired.');
      await tx.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'owner'").run(row.role, user.id);
      await audit(tx, user.id, 'admin.invite.accept', user.id, { role: row.role });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    return { role: row.role };
  });

  route('POST', '/api/admin/team/role', async (c) => {
    const owner = await requireOwner(c);
    if (!isAdminRole(c.body.role)) throw new HttpError(400, 'Choose Reviewer or Support.');
    const target = await findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(c.body.role, target.id);
    await audit(db, owner.id, 'admin.role.change', target.id, { from: target.role, to: c.body.role });
    return { ok: true };
  });

  route('POST', '/api/admin/team/remove', async (c) => {
    const owner = await requireOwner(c);
    const target = await findUser(str(c.body.userId));
    if (!target || !isAdminRole(target.role)) throw new HttpError(404, 'Team member not found.');
    await db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(target.id);
    await audit(db, owner.id, 'admin.remove', target.id, { was: target.role });
    return { ok: true };
  });
}
