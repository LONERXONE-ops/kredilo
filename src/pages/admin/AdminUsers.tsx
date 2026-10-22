import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getUsers, setUserStatus } from '../../lib/adminData';
import type { AdminUser } from '../../lib/adminData';
import { useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';

// Activity colour: emerald = seen in the last 5 minutes, amber = within the hour, red = older or never.
function activity(lastSeen: string | null): { color: string; label: string } {
  if (!lastSeen) return { color: 'bg-red-500', label: 'inactive' };
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 5) return { color: 'bg-emerald-400', label: 'active now' };
  if (mins < 60) return { color: 'bg-amber-400', label: 'recently active' };
  return { color: 'bg-red-500', label: 'inactive' };
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => getUsers(q).then(setUsers).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [q]);

  const toggle = async (u: AdminUser) => {
    setBusy(u.id); setError('');
    try { await setUserStatus(u.id, u.status !== 'suspended'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Users" info="Everyone with a Kredilo account." />
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email..." className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-white/30" />
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!users && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}
      <div className="space-y-2">
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0e0e0e] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative shrink-0">
                <Avatar src={u.avatar} name={u.email} size={40} />
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0e0e0e] ${activity(u.lastSeen).color}`} title={activity(u.lastSeen).label} />
              </span>
              <div className="min-w-0">
              <div className="truncate font-bold">{u.email}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span>{u.role === 'user' ? 'member' : u.role}</span>
                <span>· {u.balance.toLocaleString()} kreds</span>
                {u.emailVerified ? <span className="text-emerald-400">· verified</span> : <span className="text-amber-300">· unverified</span>}
                {u.status === 'suspended' && <span className="text-red-400">· suspended</span>}
                <span>· {activity(u.lastSeen).label}</span>
              </div>
              </div>
            </div>
            {user?.role === 'owner' && u.role !== 'owner' && (
              <button disabled={busy === u.id} onClick={() => toggle(u)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold disabled:opacity-50 ${u.status === 'suspended' ? 'border-emerald-400/40 text-emerald-300' : 'border-white/20'}`}>
                {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
              </button>
            )}
          </div>
        ))}
        {users && users.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No users found.</p>}
      </div>
    </div>
  );
}
