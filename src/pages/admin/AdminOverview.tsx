import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../../components/SectionHeader';
import { getOverview } from '../../lib/adminData';
import type { Overview } from '../../lib/adminData';

export default function AdminOverview() {
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getOverview().then(setO).catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')); }, []);

  const cards = o ? [
    { label: 'Users', value: o.users.toLocaleString(), to: '/admin/users' },
    { label: 'Admins', value: o.admins.toLocaleString(), to: '/admin/team' },
    { label: 'Live tasks', value: o.liveTasks.toLocaleString(), to: '/admin/tasks' },
    { label: 'Pending reviews', value: o.pendingReviews.toLocaleString(), to: '/admin/submissions' },
    { label: 'Posted tasks to confirm', value: o.pendingPosts.toLocaleString(), to: '/admin/payments' },
    { label: 'Open withdrawals', value: o.openWithdrawals.toLocaleString(), to: '/admin/withdrawals' },
  ] : [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Admin" info="Live operations overview." />
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!o && !error && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>}

      {o && (
        <>
          {o.reserveLow && (
            <Link to="/admin/funding" className="flex items-start gap-3 rounded-3xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200 transition hover:bg-amber-400/15">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-extrabold">Reward reserve is running low</div>
                <div className="mt-0.5 text-amber-200/80">Only {o.reserveTokens.toLocaleString()} kreds left. Top up in Funding before rewards start failing for users.</div>
              </div>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
                <div className="text-sm font-semibold text-white/50">{c.label}</div>
                <div className="mt-1 text-3xl font-extrabold">{c.value}</div>
              </Link>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-6">
            <div className="text-sm font-semibold text-white/50">Reward reserve remaining</div>
            <div className="mt-1 text-4xl font-extrabold">{o.reserveTokens.toLocaleString()} kreds</div>
            <div className="mt-1 text-sm text-white/45">≈ ₦{o.reserveNaira.toLocaleString()} left to fund rewards</div>
          </div>
        </>
      )}
    </div>
  );
}
