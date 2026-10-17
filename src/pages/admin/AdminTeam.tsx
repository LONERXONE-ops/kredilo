import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Trash2, UserPlus } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { SelectInput } from '../../components/Field';
import { apiRequest } from '../../lib/auth';

type Member = { id: string; email: string; role: string; createdAt: string };
type Invite = { id: string; email: string; role: string; expiresAt: string; createdAt: string };
type InviteRole = 'reviewer' | 'support';

const roleText: Record<string, string> = {
  owner: 'Owner: everything, including funding and settings',
  reviewer: 'Reviewer: reviews submissions and fraud flags',
  support: 'Support: read-only access to users',
};

export default function AdminTeam() {
  const [team, setTeam] = useState<{ members: Member[]; invites: Invite[] } | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('reviewer');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeam(await apiRequest<{ members: Member[]; invites: Invite[] }>('/api/admin/team'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the team.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const sendInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLink('');
    setCopied(false);
    await act(async () => {
      const r = await apiRequest<{ inviteUrl: string }>('/api/admin/invites', { email, role });
      setLink(r.inviteUrl);
      setEmail('');
    });
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Team" info="Only the owner can add or remove admins. Every change is written to the audit log." />

      {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><UserPlus size={20} /> Invite an admin</h2>
        <form onSubmit={sendInvite} className="mt-4 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their email address"
            className="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none placeholder:text-white/35 focus:border-white/50"
          />
          <SelectInput
            value={role}
            onChange={(v) => setRole(v as InviteRole)}
            ariaLabel="Role"
            triggerClassName="h-12 w-full rounded-full border border-white/20 bg-black/40 px-5 text-sm outline-none flex items-center justify-between gap-2 text-left"
          >
            <option value="reviewer">Reviewer</option>
            <option value="support">Support</option>
          </SelectInput>
          <p className="text-xs text-white/45">{roleText[role]}</p>
          <button disabled={busy} className="min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
            {busy ? 'Creating...' : 'Create invitation link'}
          </button>
        </form>

        {link && (
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-sm font-bold">Send this link to them. It is shown only once and works for 7 days.</p>
            <p className="mt-2 break-all rounded-xl bg-black/50 p-3 text-xs text-white/80">{link}</p>
            <button onClick={copy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
              <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <p className="mt-2 text-xs text-white/45">They must sign in with this exact email address, and verify it, to accept.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Admins</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{m.email}</div>
                <div className="text-xs text-white/45">{m.role === 'owner' ? 'Owner' : m.role === 'reviewer' ? 'Reviewer' : 'Support'}</div>
              </div>
              {m.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  <SelectInput
                    value={m.role}
                    ariaLabel={`Role for ${m.email}`}
                    onChange={(v) => act(() => apiRequest('/api/admin/team/role', { userId: m.id, role: v }))}
                    align="right"
                    triggerClassName="h-10 rounded-full border border-white/20 bg-black/40 px-4 text-sm outline-none flex items-center justify-between gap-2"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="support">Support</option>
                  </SelectInput>
                  <button
                    aria-label={`Remove ${m.email}`}
                    onClick={() => window.confirm(`Remove admin access for ${m.email}?`) && act(() => apiRequest('/api/admin/team/remove', { userId: m.id }))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!team && !error && <p className="py-3 text-sm text-white/45">Loading...</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Pending invitations</h2>
        <div className="mt-3 divide-y divide-white/5">
          {team?.invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{i.email}</div>
                <div className="text-xs text-white/45">{i.role === 'reviewer' ? 'Reviewer' : 'Support'} · expires {new Date(i.expiresAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => act(() => apiRequest('/api/admin/invites/revoke', { id: i.id }))} className="min-h-10 rounded-full border border-white/20 px-4 text-sm font-bold hover:bg-white/5">
                Revoke
              </button>
            </div>
          ))}
          {team && team.invites.length === 0 && <p className="py-3 text-sm text-white/45">No pending invitations.</p>}
        </div>
      </section>
    </div>
  );
}
