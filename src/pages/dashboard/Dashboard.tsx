import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Coins, Gamepad2, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getWallet, listMySubmissions, listTasks, statusLabel } from '../../lib/tasks';
import type { MySubmission, Task, Wallet } from '../../lib/tasks';
import { Tabs } from '../../components/Tabs';

type Tab = 'explore' | 'mine';

const statusChip: Record<MySubmission['status'], string> = {
  in_progress: 'bg-white/10 text-white/70',
  pending_review: 'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-300',
};

function ExploreList() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    listTasks().then(setTasks).catch((e) => setError(e instanceof Error ? e.message : 'Could not load tasks.'));
  }, []);

  if (error) return <p className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">{error}</p>;
  if (!tasks) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading tasks...</p>;

  const categories = ['All', ...Array.from(new Set(tasks.map((t) => t.category)))];
  const filtered = tasks.filter((t) => (category === 'All' || t.category === category) && t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-white/30"
        />
      </div>
      {categories.length > 2 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${category === c ? 'border-white bg-white text-black' : 'border-white/15 text-white/70'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((t) => (
          <Link key={t.id} to={`/dashboard/tasks/${t.id}`} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">{t.category}</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">{t.remaining} left</span>
              </div>
              <h3 className="truncate text-lg font-extrabold">{t.title}</h3>
              <div className="mt-1 flex flex-wrap gap-x-4 text-sm font-bold">
                <span className="flex items-center gap-1.5"><Coins size={16} /> {t.reward} tokens</span>
                <span className="text-white/50">{t.proofType === 'screenshot' ? 'Screenshot proof' : t.proofType === 'none' ? 'No proof' : 'Proof required'}</span>
              </div>
            </div>
            <ArrowRight size={20} className="shrink-0 text-white/50" />
          </Link>
        ))}
        {filtered.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No tasks available right now. Check back soon.</p>}
      </div>
    </div>
  );
}

function MyTasksList() {
  const [subs, setSubs] = useState<MySubmission[] | null>(null);
  useEffect(() => {
    listMySubmissions().then(setSubs).catch(() => setSubs([]));
  }, []);
  if (!subs) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">Loading...</p>;
  if (subs.length === 0) return <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">You haven’t started any tasks yet.</p>;
  return (
    <div className="space-y-3">
      {subs.map((s) => (
        <Link key={s.id} to={`/dashboard/tasks/${s.taskId}`} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
          <div className="min-w-0">
            <h3 className="truncate font-extrabold">{s.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-bold"><Coins size={15} /> {s.reward} tokens</div>
            {s.rejectReason && <p className="mt-1 text-xs text-red-400">Reason: {s.rejectReason}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusChip[s.status]}`}>{statusLabel[s.status]}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : 'explore';
  const setTab = (t: Tab) => setParams(t === 'explore' ? {} : { tab: t }, { replace: true });

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const load = useCallback(() => {
    getWallet().then(setWallet).catch(() => setWallet(null));
  }, []);
  useEffect(load, [load]);

  const earned = wallet?.transactions.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0) ?? 0;
  const stats = [
    { label: 'Available Tokens', value: wallet?.balanceTokens ?? 0 },
    { label: 'Total Earned', value: earned },
    { label: 'Min Withdrawal', value: wallet?.minWithdrawalTokens ?? 2000 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-white/60">Good to see you again,</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{user?.email.split('@')[0]} 👋</h1>
        <p className="mt-2 max-w-xl text-white/55">Complete tasks, earn tokens, and track your balance.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.label} to="/dashboard/wallet" className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-4 transition hover:border-white/25 sm:p-5">
            <div className="text-xs font-semibold text-white/50">{s.label}</div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">{s.value.toLocaleString()}</div>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <Tabs
          tabs={[{ id: 'explore' as Tab, label: 'Explore Tasks' }, { id: 'mine' as Tab, label: 'My Tasks' }]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'explore' ? <ExploreList /> : <MyTasksList />}
      </section>

      <Link to="/dashboard/games" className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0e0e0e] p-5 transition hover:border-white/25">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Gamepad2 size={24} /></div>
          <div>
            <div className="font-extrabold">Play Games, Earn Tokens</div>
            <div className="text-sm text-white/55">Snake, Memory Match, Reaction Test and Trivia Quiz.</div>
          </div>
        </div>
        <ArrowRight size={20} className="shrink-0" />
      </Link>
    </div>
  );
}
