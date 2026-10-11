import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gamepad2, Search } from 'lucide-react';
import { mockTasks, mockUser } from '../../lib/mockData';
import { useAuth } from '../../lib/auth';
import type { Task, TaskStatus } from '../../lib/mockData';
import { CONFIG, formatTokens, tokensToNaira } from '../../lib/config';
import { Tabs } from '../../components/Tabs';
import { TaskCard } from '../../components/TaskCard';

type Tab = 'explore' | 'mine';

const statusGroups: { status: TaskStatus; label: string; empty: string }[] = [
  { status: 'in_progress', label: 'In Progress', empty: 'No tasks in progress.' },
  { status: 'awaiting_verification', label: 'Awaiting Verification', empty: 'Nothing waiting for review.' },
  { status: 'completed', label: 'Completed', empty: 'No completed tasks yet.' },
  { status: 'rejected', label: 'Rejected', empty: 'No rejected submissions.' },
];

function MyTasks({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {statusGroups.map((g) => {
        const list = tasks.filter((t) => t.status === g.status);
        return (
          <div key={g.status} className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-5">
            <h3 className="mb-3 font-extrabold">{g.label} ({list.length})</h3>
            {list.length === 0 && <p className="text-sm text-white/40">{g.empty}</p>}
            {list.map((t) => (
              <Link key={t.id} to={`/dashboard/tasks/${t.id}`} className="block border-t border-white/5 py-3 text-sm first:border-t-0">
                <div className="font-bold">{t.title}</div>
                {t.rejectionReason && <div className="mt-1 text-xs text-red-400">Reason: {t.rejectionReason}</div>}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'mine' ? 'mine' : 'explore';
  const setTab = (t: Tab) => setParams(t === 'explore' ? {} : { tab: t }, { replace: true });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(mockTasks.map((t) => t.category)))];
  const filtered = mockTasks.filter(
    (t) =>
      (category === 'All' || t.category === category) &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Available Tokens', value: mockUser.tokens },
    { label: 'Pending Tokens', value: mockUser.pending },
    { label: 'Total Earned', value: mockUser.totalEarned },
    { label: 'Withdrawn', value: 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-white/60">Good to see you again,</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{user?.email.split("@")[0]} 👋</h1>
        <p className="mt-2 max-w-xl text-white/55">
          Complete tasks, play games and track your tokens. Everything below is demo data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to="/dashboard/wallet" className="rounded-3xl border border-white/10 bg-[#0e0e0e] p-4 transition hover:border-white/25 sm:p-5">
            <div className="text-xs font-semibold text-white/50 sm:text-sm">{s.label}</div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">{formatTokens(s.value)}</div>
            <div className="mt-1 text-xs text-white/40">≈ ₦{tokensToNaira(s.value)} ({CONFIG.TOKENS_PER_NAIRA} tokens = ₦1)</div>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <Tabs
          tabs={[
            { id: 'explore' as Tab, label: 'Explore Tasks' },
            { id: 'mine' as Tab, label: 'My Tasks' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'explore' ? (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="h-12 w-full rounded-full border border-white/10 bg-[#0e0e0e] pl-11 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-white/30"
              />
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${
                    category === c ? 'border-white bg-white text-black' : 'border-white/15 text-white/70'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map((t) => <TaskCard key={t.id} task={t} />)}
              {filtered.length === 0 && (
                <p className="rounded-3xl border border-white/10 p-8 text-center text-sm text-white/45">No tasks match your search.</p>
              )}
            </div>
            <p className="text-xs text-white/40">
              No sponsored tasks are available yet. Tasks shown here are demo examples.
            </p>
          </>
        ) : (
          <MyTasks tasks={mockTasks} />
        )}
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
